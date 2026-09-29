/**
 * @jest-environment node
 */
import { ME, migrate, resetMyData } from '@/db/migrate';
import * as repo from '@/db/repo';
import { buyLink } from '@/lib/affiliate';
import { parseGoodreads } from '@/lib/csv';
import { pageTotals } from '@/lib/stats';

import { openTestDb } from '@/testing/node-db';

async function freshDb() {
  const db = openTestDb();
  await migrate(db);
  return db;
}

describe('catalog', () => {
  it('seeds the prototype books and the 20 Brazilian bestsellers', async () => {
    const db = await freshDb();
    const works = await db.getAllAsync<{ n: number }>('SELECT COUNT(*) AS n FROM works', []);
    expect(works[0].n).toBe(32);
    const chart = await repo.getChart(db, 'BR');
    expect(chart?.books).toHaveLength(20);
    expect(chart?.books[0].displayTitle).toBe('Verity');
    expect(chart?.books[0].edition?.asin).toBe('8501117846');
  });

  it('migrating twice is a no-op', async () => {
    const db = await freshDb();
    await migrate(db);
    const n = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM editions', []);
    expect(n?.n).toBe(32);
  });

  it('keeps reviews on the work and picks the edition of the reader country', async () => {
    const db = await freshDb();
    await db.runAsync(
      "INSERT INTO editions (id, work_id, country, language, title, publisher, isbn13, asin, page_count) VALUES ('coraline-br','coraline','BR','pt-BR','Coraline','Intrínseca','9788580573800','8580573807',160)",
      [],
    );
    const br = await repo.getBook(db, 'coraline', 'BR');
    const us = await repo.getBook(db, 'coraline', 'US');
    expect(br?.edition?.id).toBe('coraline-br');
    expect(us?.edition?.id).toBe('coraline-us');
    // A country without its own edition falls back to any edition.
    expect((await repo.getBook(db, 'coraline', 'JP'))?.edition).not.toBeNull();
    // Same reviews whatever the country.
    expect((await repo.reviewsFor(db, 'coraline')).map((r) => r.id)).toContain('r1');
  });

  it('searches by work title, original title, author and ISBN', async () => {
    const db = await freshDb();
    expect((await repo.searchBooks(db, 'BR', { query: 'Atomic Habits' }))[0]?.displayTitle).toBe('Hábitos atômicos');
    expect((await repo.searchBooks(db, 'BR', { query: 'Gaiman' }))[0]?.id).toBe('coraline');
    expect((await repo.searchBooks(db, 'BR', { query: '9788501117847' }))[0]?.displayTitle).toBe('Verity');
    expect((await repo.searchBooks(db, 'BR', { genre: 'Romance' })).length).toBeGreaterThan(3);
    expect(await repo.findWorkByIsbn(db, '978-85-01-11784-7')).toMatch(/^br-verity/);
  });
});

describe('shelf', () => {
  it('starts with the example library and counts pages', async () => {
    const db = await freshDb();
    const shelf = await repo.getShelf(db, 'BR');
    expect(shelf).toHaveLength(10);
    const totals = pageTotals(shelf.map((s) => ({ ...s, title: s.book.title, author: s.book.author, genres: s.book.genres })));
    // Finished: gone 432 + thursday 382 + coraline 162 + hobbit 310 + pride 432. Reading: 248 + 94.
    expect(totals).toEqual({ finished: 1718, current: 342, total: 2060 });
  });

  it('toggles status, clamps the page and finishes a book', async () => {
    const db = await freshDb();
    expect(await repo.toggleStatus(db, 'circe', 'reading')).toBe('reading');
    expect(await repo.setCurrentPage(db, 'circe', 9999, 393)).toBe(393);
    await repo.finishBook(db, 'circe', 393);
    expect((await repo.getShelfEntry(db, 'circe'))?.status).toBe('read');
    expect(await repo.toggleStatus(db, 'circe', 'read')).toBeNull();
    expect(await repo.getShelfEntry(db, 'circe')).toBeNull();
  });

  it('lets the reader set the page count when the edition has none', async () => {
    const db = await freshDb();
    const verity = (await repo.searchBooks(db, 'BR', { query: 'Verity' }))[0];
    expect(verity.edition?.pageCount).toBeNull();
    await repo.upsertShelf(db, verity.id, { status: 'reading', currentPage: 10 });
    await repo.setTotalPages(db, verity.id, 320);
    const item = (await repo.getShelf(db, 'BR')).find((s) => s.workId === verity.id);
    expect(item?.pages).toBe(320);
  });

  it('adds my rating to the book average', async () => {
    const db = await freshDb();
    const verity = (await repo.searchBooks(db, 'BR', { query: 'Verity' }))[0];
    expect(verity.ratingAvg).toBeNull();
    await repo.upsertShelf(db, verity.id, { status: 'read', rating: 4.5 });
    const after = await repo.getBook(db, verity.id, 'BR');
    expect(after?.ratingAvg).toBe(4.5);
    expect(after?.ratingCount).toBe(1);
  });

  it('keeps one review per reader and book', async () => {
    const db = await freshDb();
    await repo.saveMyReview(db, { workId: 'circe', editionId: null, rating: 4, body: 'First', spoiler: false, tags: [] });
    await repo.saveMyReview(db, { workId: 'circe', editionId: null, rating: 5, body: 'Second', spoiler: true, tags: ['myth'] });
    const mine = (await repo.reviewsFor(db, 'circe')).filter((r) => r.user.id === ME);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ body: 'Second', rating: 5, spoiler: true, tags: ['myth'] });
    expect((await repo.reviewsFor(db, 'circe'))[0].user.isMe).toBe(true);
  });

  it('reset restores the example library', async () => {
    const db = await freshDb();
    await repo.removeFromShelf(db, 'gone');
    await repo.createClub(db, { name: 'Mine', description: '', isPrivate: false });
    await resetMyData(db);
    expect(await repo.getShelf(db, 'BR')).toHaveLength(10);
    expect(await repo.myClubCount(db)).toBe(0);
  });
});

describe('community', () => {
  it('likes, votes, joins and creates clubs', async () => {
    const db = await freshDb();
    expect(await repo.toggleLike(db, 'r1')).toBe(true);
    expect((await repo.reviewsFor(db, 'coraline')).find((r) => r.id === 'r1')?.likes).toBe(213);
    expect(await repo.toggleLike(db, 'r1')).toBe(false);

    await repo.vote(db, 'p1', 0);
    let p1 = (await repo.listPosts(db, 'BR')).find((p) => p.id === 'p1')!;
    expect(p1.myVote).toBe(0);
    expect(p1.poll?.[0].votes).toBe(182);
    await repo.vote(db, 'p1', 0);
    p1 = (await repo.listPosts(db, 'BR')).find((p) => p.id === 'p1')!;
    expect(p1.myVote).toBeNull();

    expect(await repo.toggleJoin(db, 'cozy')).toBe(true);
    const id = await repo.createClub(db, { name: 'Sunday Classics', description: 'Old books', isPrivate: true });
    const clubs = await repo.listClubs(db);
    expect(clubs.find((c) => c.id === id)).toMatchObject({ isMine: true, joined: true, isPrivate: true });
    expect(await repo.leaveClub(db, id)).toBe('deleted');
    expect((await repo.listPosts(db, 'BR', 'clubs')).map((p) => p.id).sort()).toEqual(['p1', 'p3']);
    expect((await repo.listPosts(db, 'BR', 'buddy')).map((p) => p.id)).toEqual(['p2']);
  });

  it('friends rating averages friends reviews', async () => {
    const db = await freshDb();
    expect(await repo.friendsRating(db, 'coraline')).toEqual({ avg: 4.5, names: ['James', 'Sofia'] });
  });
});

describe('settings, import and export', () => {
  it('stores settings', async () => {
    const db = await freshDb();
    const s = await repo.loadSettings(db);
    expect(s.plan).toBe('free');
    await repo.saveSettings(db, { ...s, plan: 'plus', country: 'US' });
    expect(await repo.loadSettings(db)).toMatchObject({ plan: 'plus', country: 'US' });
  });

  it('imports a Goodreads export by ISBN and title', async () => {
    const db = await freshDb();
    const csv = [
      'Book Id,Title,Author,ISBN13,My Rating,Date Read,Exclusive Shelf',
      '1,"Circe",Madeline Miller,="",5,2026/03/01,read',
      '2,"Some Other Book",Nobody,="",0,,to-read',
      '3,"A Brazilian edition",X,="9788550807560",4,,currently-reading',
      '4,"Atomic Habits: An Easy & Proven Way",James Clear,="",3,,read',
    ].join('\n');
    const result = await repo.importGoodreads(db, parseGoodreads(csv));
    expect(result).toEqual({ matched: 3, total: 4 });
    expect(await repo.getShelfEntry(db, 'circe')).toMatchObject({ status: 'read', rating: 5, finishedAt: '2026-03-01' });
    const habits = await repo.findWorkByIsbn(db, '9788550807560');
    expect((await repo.getShelfEntry(db, habits!))?.rating).toBe(3);
  });

  it('exports the library as CSV', async () => {
    const db = await freshDb();
    const csv = await repo.exportLibraryCsv(db, 'BR');
    expect(csv.split('\n')[0]).toContain('Title,Author,ISBN13');
    expect(csv).toContain('Coraline');
    expect(csv.split('\n')).toHaveLength(11);
  });

  it('builds the buy link from the edition of the reader country', async () => {
    const db = await freshDb();
    const verity = (await repo.searchBooks(db, 'BR', { query: 'Verity' }))[0];
    expect(buyLink({ country: 'BR', edition: verity.edition, title: verity.title, author: verity.author }).url)
      .toBe('https://www.amazon.com.br/dp/8501117846?tag=SUA_TAG-20');
    // In the US the Brazilian ASIN is a different product, so it searches instead.
    const us = buyLink({ country: 'US', edition: verity.edition, title: verity.title, author: verity.author });
    expect(us.exact).toBe(false);
    expect(us.url).toBe('https://www.amazon.com/s?k=Verity%20Colleen%20Hoover&i=stripbooks');
  });
});
