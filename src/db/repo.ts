// Queries and writes. Screens call these; nothing else touches SQL.
import type { GoodreadsRow } from '@/lib/csv';
import { sameTitle, toCsv } from '@/lib/csv';
import { statusLabel } from '@/lib/format';
import { DEFAULT_SETTINGS, type Settings } from '@/lib/settings';
import { combinedRating, pagesRead } from '@/lib/stats';

import { ME } from './migrate';
import type { BindValue, Book, Club, Db, Edition, Person, Post, Review, ShelfBook, ShelfEntry, ShelfStatus } from './types';

const now = () => new Date().toISOString();
const json = <T>(s: string | null | undefined, fallback: T): T => {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* ---------------- books ---------------- */

type BookRow = {
  id: string; title: string; original_title: string | null; author: string; first_published: number | null; genres: string;
  tagline: string | null; synopsis: string | null; palette: string; seed_rating_avg: number | null; seed_rating_count: number;
  seed_histogram: string | null; my_rating: number | null;
  e_id: string | null; e_country: string | null; e_language: string | null; e_title: string | null; e_publisher: string | null;
  e_isbn13: string | null; e_asin: string | null; e_page_count: number | null; e_cover_url: string | null;
};

// The local edition is the one sold in the reader's country, or any edition when the country has none.
const BOOK_SELECT = `
SELECT w.*, s.rating AS my_rating,
  e.id AS e_id, e.country AS e_country, e.language AS e_language, e.title AS e_title, e.publisher AS e_publisher,
  e.isbn13 AS e_isbn13, e.asin AS e_asin, e.page_count AS e_page_count, e.cover_url AS e_cover_url
FROM works w
LEFT JOIN shelf s ON s.work_id = w.id
LEFT JOIN editions e ON e.id = COALESCE(
  (SELECT id FROM editions WHERE work_id = w.id AND country = $country ORDER BY id LIMIT 1),
  (SELECT id FROM editions WHERE work_id = w.id ORDER BY id LIMIT 1))`;

function toBook(r: BookRow): Book {
  const edition: Edition | null = r.e_id
    ? { id: r.e_id, workId: r.id, country: r.e_country!, language: r.e_language!, title: r.e_title!, publisher: r.e_publisher,
        isbn13: r.e_isbn13, asin: r.e_asin, pageCount: r.e_page_count, coverUrl: r.e_cover_url }
    : null;
  const rating = combinedRating(r.seed_rating_avg, r.seed_rating_count, r.my_rating != null ? [r.my_rating] : []);
  return {
    id: r.id,
    title: r.title,
    originalTitle: r.original_title,
    author: r.author,
    year: r.first_published,
    genres: json<string[]>(r.genres, []),
    tagline: r.tagline,
    synopsis: r.synopsis,
    palette: r.palette,
    seedRatingAvg: r.seed_rating_avg,
    seedRatingCount: r.seed_rating_count,
    seedHistogram: json<number[] | null>(r.seed_histogram, null),
    displayTitle: edition?.title ?? r.title,
    edition,
    ratingAvg: rating.avg,
    ratingCount: rating.count,
  };
}

// expo-sqlite takes named params as an object; positional arrays keep the Db interface small,
// so `$country` is rewritten to `?` and bound first.
function withCountry(sql: string, country: string, rest: BindValue[] = []): [string, BindValue[]] {
  const n = sql.split('$country').length - 1;
  return [sql.replaceAll('$country', '?'), [...Array(n).fill(country), ...rest]];
}

export async function getBook(db: Db, workId: string, country: string): Promise<Book | null> {
  const [sql, params] = withCountry(`${BOOK_SELECT} WHERE w.id = ?`, country, [workId]);
  const r = await db.getFirstAsync<BookRow>(sql, params);
  return r ? toBook(r) : null;
}

export async function getBooks(db: Db, ids: string[], country: string): Promise<Book[]> {
  if (!ids.length) return [];
  const [sql, params] = withCountry(`${BOOK_SELECT} WHERE w.id IN (${ids.map(() => '?').join(',')})`, country, ids);
  const rows = await db.getAllAsync<BookRow>(sql, params);
  const byId = new Map(rows.map((r) => [r.id, toBook(r)]));
  return ids.map((id) => byId.get(id)).filter((b): b is Book => !!b);
}

export async function searchBooks(db: Db, country: string, opts: { query?: string; genre?: string | null } = {}): Promise<Book[]> {
  const where: string[] = [];
  const params: BindValue[] = [];
  const q = opts.query?.trim();
  if (q) {
    const like = `%${q}%`;
    where.push(`(w.title LIKE ? OR w.original_title LIKE ? OR w.author LIKE ? OR w.genres LIKE ?
      OR EXISTS (SELECT 1 FROM editions x WHERE x.work_id = w.id AND (x.title LIKE ? OR x.isbn13 = ?)))`);
    params.push(like, like, like, like, like, q.replace(/[^0-9Xx]/g, ''));
  }
  if (opts.genre) {
    where.push('w.genres LIKE ?');
    params.push(`%"${opts.genre}"%`);
  }
  const [sql, p] = withCountry(`${BOOK_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY w.title`, country, params);
  return (await db.getAllAsync<BookRow>(sql, p)).map(toBook);
}

/** Latest bestseller list for a country. */
export async function getChart(db: Db, country: string) {
  const latest = await db.getFirstAsync<{ period: string; source: string | null }>(
    'SELECT period, source FROM charts WHERE country = ? ORDER BY period DESC LIMIT 1', [country]);
  if (!latest) return null;
  const rows = await db.getAllAsync<{ work_id: string }>('SELECT work_id FROM charts WHERE country = ? AND period = ? ORDER BY rank', [country, latest.period]);
  return { period: latest.period, source: latest.source, books: await getBooks(db, rows.map((r) => r.work_id), country) };
}

export async function findWorkByIsbn(db: Db, isbn: string): Promise<string | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, '');
  const r = await db.getFirstAsync<{ work_id: string }>('SELECT work_id FROM editions WHERE isbn13 = ? LIMIT 1', [clean]);
  return r?.work_id ?? null;
}

/* ---------------- shelf ---------------- */

type ShelfRow = {
  work_id: string; edition_id: string | null; status: ShelfStatus; current_page: number | null; total_pages: number | null;
  rating: number | null; favorite: number; started_at: string | null; finished_at: string | null; tags: string; updated_at: string;
};

const toEntry = (r: ShelfRow): ShelfEntry => ({
  workId: r.work_id,
  editionId: r.edition_id,
  status: r.status,
  currentPage: r.current_page,
  totalPages: r.total_pages,
  rating: r.rating,
  favorite: !!r.favorite,
  startedAt: r.started_at,
  finishedAt: r.finished_at,
  tags: json<string[]>(r.tags, []),
  updatedAt: r.updated_at,
});

/** Page count for this reader: what they typed, else their edition's, else the local edition's. */
export const pagesFor = (entry: Pick<ShelfEntry, 'totalPages'> | null, book: Book) => entry?.totalPages ?? book.edition?.pageCount ?? null;

export async function getShelfEntry(db: Db, workId: string): Promise<ShelfEntry | null> {
  const r = await db.getFirstAsync<ShelfRow>('SELECT * FROM shelf WHERE work_id = ?', [workId]);
  return r ? toEntry(r) : null;
}

export async function getShelf(db: Db, country: string): Promise<ShelfBook[]> {
  const rows = await db.getAllAsync<ShelfRow>('SELECT * FROM shelf ORDER BY updated_at DESC', []);
  const books = await getBooks(db, rows.map((r) => r.work_id), country);
  const byId = new Map(books.map((b) => [b.id, b]));
  return rows
    .map(toEntry)
    .filter((e) => byId.has(e.workId))
    .map((e) => {
      const book = byId.get(e.workId)!;
      return { ...e, book, pages: pagesFor(e, book) };
    });
}

export type ShelfUpdate = Partial<Omit<ShelfEntry, 'workId' | 'updatedAt'>> & { status: ShelfStatus };

export async function upsertShelf(db: Db, workId: string, u: ShelfUpdate) {
  const cur = await getShelfEntry(db, workId);
  const edition = u.editionId ?? cur?.editionId ??
    (await db.getFirstAsync<{ id: string }>('SELECT id FROM editions WHERE work_id = ? ORDER BY id LIMIT 1', [workId]))?.id ?? null;
  const merged = {
    currentPage: cur?.currentPage ?? null,
    totalPages: cur?.totalPages ?? null,
    rating: cur?.rating ?? null,
    favorite: cur?.favorite ?? false,
    startedAt: cur?.startedAt ?? null,
    finishedAt: cur?.finishedAt ?? null,
    tags: cur?.tags ?? [],
    ...(Object.fromEntries(Object.entries(u).filter(([, v]) => v !== undefined)) as ShelfUpdate),
  };
  await db.runAsync(
    `INSERT OR REPLACE INTO shelf (work_id, edition_id, status, current_page, total_pages, rating, favorite, started_at, finished_at, tags, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [workId, edition, merged.status, merged.currentPage, merged.totalPages, merged.rating, merged.favorite ? 1 : 0,
      merged.startedAt, merged.finishedAt, JSON.stringify(merged.tags), now()],
  );
}

export async function removeFromShelf(db: Db, workId: string) {
  await db.runAsync('DELETE FROM shelf WHERE work_id = ?', [workId]);
}

/** Book page buttons: tapping the current status again removes the book. Returns the new status. */
export async function toggleStatus(db: Db, workId: string, status: ShelfStatus): Promise<ShelfStatus | null> {
  const cur = await getShelfEntry(db, workId);
  if (cur?.status === status) {
    await removeFromShelf(db, workId);
    return null;
  }
  await upsertShelf(db, workId, {
    status,
    currentPage: status === 'reading' ? (cur?.currentPage ?? 0) : cur?.currentPage ?? null,
    startedAt: status === 'reading' ? (cur?.startedAt ?? new Date().toISOString().slice(0, 10)) : cur?.startedAt ?? null,
    finishedAt: status === 'read' ? (cur?.finishedAt ?? new Date().toISOString().slice(0, 10)) : cur?.finishedAt ?? null,
  });
  return status;
}

/** Sets the current page (clamped to the page count). Returns pages gained. */
export async function setCurrentPage(db: Db, workId: string, page: number, pages: number | null) {
  const cur = await getShelfEntry(db, workId);
  if (!cur) return 0;
  const before = pagesRead({ status: cur.status, currentPage: cur.currentPage, pages });
  const next = Math.max(0, Math.min(pages ?? Number.MAX_SAFE_INTEGER, Math.round(page || 0)));
  await db.runAsync('UPDATE shelf SET current_page = ?, updated_at = ? WHERE work_id = ?', [next, now(), workId]);
  return pagesRead({ status: cur.status, currentPage: next, pages }) - before;
}

export async function setTotalPages(db: Db, workId: string, total: number | null) {
  await db.runAsync('UPDATE shelf SET total_pages = ?, updated_at = ? WHERE work_id = ?', [total && total > 0 ? Math.round(total) : null, now(), workId]);
}

export async function finishBook(db: Db, workId: string, pages: number | null) {
  await db.runAsync(
    `UPDATE shelf SET status = 'read', current_page = COALESCE(?, current_page), finished_at = ?, updated_at = ? WHERE work_id = ?`,
    [pages, new Date().toISOString().slice(0, 10), now(), workId],
  );
}

/* ---------------- people & reviews ---------------- */

type PersonRow = { id: string; name: string; color: string; is_me: number; is_friend: number };
const toPerson = (r: PersonRow): Person => ({ id: r.id, name: r.name, color: r.color, isMe: !!r.is_me, isFriend: !!r.is_friend });

export async function setMyName(db: Db, name: string) {
  await db.runAsync('UPDATE users SET name = ? WHERE id = ?', [name, ME]);
}

type ReviewRow = {
  id: string; work_id: string; rating: number | null; body: string; spoiler: number; tags: string; seed_likes: number; created_at: string;
  liked: number; u_id: string; u_name: string; u_color: string; u_is_me: number; u_is_friend: number;
};
const REVIEW_SELECT = `
SELECT r.*, (l.target_id IS NOT NULL) AS liked,
  u.id AS u_id, u.name AS u_name, u.color AS u_color, u.is_me AS u_is_me, u.is_friend AS u_is_friend
FROM reviews r JOIN users u ON u.id = r.user_id LEFT JOIN likes l ON l.target_id = r.id`;

const toReview = (r: ReviewRow): Review => ({
  id: r.id,
  workId: r.work_id,
  user: toPerson({ id: r.u_id, name: r.u_name, color: r.u_color, is_me: r.u_is_me, is_friend: r.u_is_friend }),
  rating: r.rating,
  body: r.body,
  spoiler: !!r.spoiler,
  tags: json<string[]>(r.tags, []),
  likes: r.seed_likes + (r.liked ? 1 : 0),
  liked: !!r.liked,
  createdAt: r.created_at,
});

/** The reader's own review first, then the most liked. */
export async function reviewsFor(db: Db, workId: string): Promise<Review[]> {
  const rows = await db.getAllAsync<ReviewRow>(`${REVIEW_SELECT} WHERE r.work_id = ? ORDER BY u.is_me DESC, r.seed_likes DESC`, [workId]);
  return rows.map(toReview);
}

export async function myReviews(db: Db): Promise<Review[]> {
  const rows = await db.getAllAsync<ReviewRow>(`${REVIEW_SELECT} WHERE r.user_id = ? ORDER BY r.created_at DESC`, [ME]);
  return rows.map(toReview);
}

export async function friendsRating(db: Db, workId: string) {
  const rows = await db.getAllAsync<{ name: string; rating: number }>(
    `SELECT u.name, r.rating FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.work_id = ? AND u.is_friend = 1 AND r.rating IS NOT NULL ORDER BY r.created_at DESC`, [workId]);
  const avg = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : null;
  return { avg, names: rows.map((r) => r.name.split(' ')[0]) };
}

/** Ratings stored on this device, for works without a catalog histogram. */
export async function localRatings(db: Db, workId: string): Promise<number[]> {
  const rows = await db.getAllAsync<{ rating: number }>(
    `SELECT rating FROM reviews WHERE work_id = ? AND user_id != ? AND rating IS NOT NULL
     UNION ALL SELECT rating FROM shelf WHERE work_id = ? AND rating IS NOT NULL`, [workId, ME, workId]);
  return rows.map((r) => r.rating);
}

export async function saveMyReview(db: Db, r: { workId: string; editionId: string | null; rating: number | null; body: string; spoiler: boolean; tags: string[]; date?: string }) {
  const existing = await db.getFirstAsync<{ id: string; seed_likes: number }>('SELECT id, seed_likes FROM reviews WHERE work_id = ? AND user_id = ?', [r.workId, ME]);
  await db.runAsync('DELETE FROM reviews WHERE work_id = ? AND user_id = ?', [r.workId, ME]);
  await db.runAsync(
    'INSERT INTO reviews (id, work_id, edition_id, user_id, rating, body, spoiler, tags, seed_likes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [existing?.id ?? newId('rev'), r.workId, r.editionId, ME, r.rating, r.body, r.spoiler ? 1 : 0, JSON.stringify(r.tags), existing?.seed_likes ?? 0,
      r.date ? new Date(r.date).toISOString() : now()],
  );
}

export async function toggleLike(db: Db, targetId: string): Promise<boolean> {
  const r = await db.runAsync('DELETE FROM likes WHERE target_id = ?', [targetId]);
  if (r.changes) return false;
  await db.runAsync('INSERT INTO likes (target_id, created_at) VALUES (?, ?)', [targetId, now()]);
  return true;
}

/* ---------------- clubs & posts ---------------- */

type ClubRow = { id: string; name: string; description: string; palette: string; seed_likes: string; seed_members: string; is_private: number; owner_id: string | null; joined: number };
const toClub = (r: ClubRow): Club => ({
  id: r.id, name: r.name, description: r.description, palette: r.palette, likes: r.seed_likes, members: r.seed_members,
  isPrivate: !!r.is_private, isMine: r.owner_id === ME, joined: !!r.joined,
});
const CLUB_SELECT = `SELECT c.*, (m.club_id IS NOT NULL) AS joined FROM clubs c LEFT JOIN club_members m ON m.club_id = c.id AND m.user_id = '${ME}'`;

export async function listClubs(db: Db): Promise<Club[]> {
  return (await db.getAllAsync<ClubRow>(`${CLUB_SELECT} ORDER BY c.created_at`, [])).map(toClub);
}

export async function toggleJoin(db: Db, clubId: string): Promise<boolean> {
  const r = await db.runAsync('DELETE FROM club_members WHERE club_id = ? AND user_id = ?', [clubId, ME]);
  if (r.changes) return false;
  await db.runAsync('INSERT INTO club_members (club_id, user_id, joined_at) VALUES (?,?,?)', [clubId, ME, now()]);
  return true;
}

export async function myClubCount(db: Db) {
  return (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM clubs WHERE owner_id = ?', [ME]))?.n ?? 0;
}

export async function createClub(db: Db, c: { name: string; description: string; isPrivate: boolean }) {
  const count = await myClubCount(db);
  const id = newId('club');
  await db.runAsync(
    'INSERT INTO clubs (id, name, description, palette, seed_likes, seed_members, is_private, owner_id, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, c.name.trim().slice(0, 40), c.description.trim().slice(0, 200), 'abcdefgh'[count % 8], '0', '1', c.isPrivate ? 1 : 0, ME, now()],
  );
  await db.runAsync('INSERT INTO club_members (club_id, user_id, joined_at) VALUES (?,?,?)', [id, ME, now()]);
  return id;
}

/** Leaving a club you created deletes it. */
export async function leaveClub(db: Db, clubId: string) {
  const c = await db.getFirstAsync<{ owner_id: string | null }>('SELECT owner_id FROM clubs WHERE id = ?', [clubId]);
  if (c?.owner_id === ME) await db.runAsync('DELETE FROM clubs WHERE id = ?', [clubId]);
  else await db.runAsync('DELETE FROM club_members WHERE club_id = ? AND user_id = ?', [clubId, ME]);
  return c?.owner_id === ME ? 'deleted' : 'left';
}

type PostRow = {
  id: string; user_id: string; club_id: string | null; kind: string; title: string | null; body: string; work_id: string | null;
  chapter_range: string | null; unlock_page: number | null; spoiler: number; seed_likes: number; reply_count: number; created_at: string; liked: number;
};

export type PostTab = 'foryou' | 'clubs' | 'buddy';

export async function listPosts(db: Db, country: string, tab: PostTab = 'foryou', search = ''): Promise<Post[]> {
  const where: string[] = [];
  const params: BindValue[] = [];
  if (tab === 'clubs') where.push(`p.club_id IN (SELECT club_id FROM club_members WHERE user_id = '${ME}')`);
  if (tab === 'buddy') where.push(`p.kind = 'Buddy read'`);
  if (search.trim()) {
    where.push('(p.title LIKE ? OR p.body LIKE ?)');
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }
  const rows = await db.getAllAsync<PostRow>(
    `SELECT p.*, (l.target_id IS NOT NULL) AS liked FROM posts p LEFT JOIN likes l ON l.target_id = p.id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY p.created_at DESC`, params);
  const people = new Map((await db.getAllAsync<PersonRow>('SELECT * FROM users', [])).map((u) => [u.id, toPerson(u)]));
  const clubs = new Map((await listClubs(db)).map((c) => [c.id, c]));
  const books = new Map((await getBooks(db, rows.map((r) => r.work_id).filter((x): x is string => !!x), country)).map((b) => [b.id, b]));
  const out: Post[] = [];
  for (const r of rows) {
    const options = await db.getAllAsync<{ idx: number; label: string; seed_votes: number }>('SELECT * FROM poll_options WHERE post_id = ? ORDER BY idx', [r.id]);
    const vote = await db.getFirstAsync<{ idx: number }>('SELECT idx FROM poll_votes WHERE post_id = ?', [r.id]);
    out.push({
      id: r.id,
      user: people.get(r.user_id) ?? { id: r.user_id, name: 'Reader', color: '#A1897C', isMe: false, isFriend: false },
      club: r.club_id ? clubs.get(r.club_id) ?? null : null,
      kind: r.kind,
      title: r.title,
      body: r.body,
      book: r.work_id ? books.get(r.work_id) ?? null : null,
      chapterRange: r.chapter_range,
      unlockPage: r.unlock_page,
      spoiler: !!r.spoiler,
      likes: r.seed_likes + (r.liked ? 1 : 0),
      liked: !!r.liked,
      replies: r.reply_count,
      createdAt: r.created_at,
      poll: options.length ? options.map((o) => ({ idx: o.idx, label: o.label, votes: o.seed_votes + (vote?.idx === o.idx ? 1 : 0) })) : null,
      myVote: vote?.idx ?? null,
    });
  }
  return out;
}

export async function createPost(db: Db, p: { kind: string; body: string; workId?: string | null; clubId?: string | null; title?: string | null; spoiler?: boolean }) {
  const id = newId('post');
  await db.runAsync(
    'INSERT INTO posts (id, user_id, club_id, kind, title, body, work_id, spoiler, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, ME, p.clubId ?? null, p.kind, p.title ?? null, p.body, p.workId ?? null, p.spoiler ? 1 : 0, now()],
  );
  return id;
}

/** Voting the same option again removes the vote. */
export async function vote(db: Db, postId: string, idx: number) {
  const cur = await db.getFirstAsync<{ idx: number }>('SELECT idx FROM poll_votes WHERE post_id = ?', [postId]);
  if (cur?.idx === idx) await db.runAsync('DELETE FROM poll_votes WHERE post_id = ?', [postId]);
  else await db.runAsync('INSERT OR REPLACE INTO poll_votes (post_id, idx) VALUES (?, ?)', [postId, idx]);
}

/* ---------------- settings ---------------- */

export async function loadSettings(db: Db): Promise<Settings> {
  const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', ['settings']);
  return { ...DEFAULT_SETTINGS, ...json<Partial<Settings>>(r?.value, {}) };
}

export async function saveSettings(db: Db, s: Settings) {
  await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', ['settings', JSON.stringify(s)]);
}

/* ---------------- import / export ---------------- */

/** Adds Goodreads rows that match a catalog book (by ISBN, then by title). */
export async function importGoodreads(db: Db, rows: GoodreadsRow[]) {
  const works = await db.getAllAsync<{ id: string; title: string; original_title: string | null; author: string }>(
    'SELECT id, title, original_title, author FROM works', []);
  const editions = await db.getAllAsync<{ work_id: string; title: string }>('SELECT work_id, title FROM editions', []);
  let matched = 0;
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      let workId = row.isbn13 ? await findWorkByIsbn(db, row.isbn13) : null;
      workId ??= works.find((w) => sameTitle(row.title, w.title) || (w.original_title && sameTitle(row.title, w.original_title)))?.id ?? null;
      workId ??= editions.find((e) => sameTitle(row.title, e.title))?.work_id ?? null;
      if (!workId) continue;
      matched++;
      const cur = await getShelfEntry(db, workId);
      await upsertShelf(db, workId, {
        status: row.status,
        rating: row.rating ?? cur?.rating ?? null,
        finishedAt: row.finishedAt ?? cur?.finishedAt ?? null,
      });
    }
  });
  return { matched, total: rows.length };
}

export async function exportLibraryCsv(db: Db, country: string) {
  const shelf = await getShelf(db, country);
  const reviews = new Map((await myReviews(db)).map((r) => [r.workId, r]));
  const rows: unknown[][] = [['Title', 'Author', 'ISBN13', 'Pages', 'Status', 'My rating', 'Current page', 'Started', 'Finished', 'Favorite', 'Tags', 'Review']];
  for (const s of shelf) {
    rows.push([s.book.displayTitle, s.book.author, s.book.edition?.isbn13 ?? '', s.pages ?? '', statusLabel(s.status), s.rating ?? '',
      s.currentPage ?? '', s.startedAt ?? '', s.finishedAt ?? '', s.favorite ? 'yes' : '', s.tags.join(' '), reviews.get(s.workId)?.body ?? '']);
  }
  return toCsv(rows);
}
