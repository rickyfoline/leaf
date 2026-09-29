import {
  SEED_CHARTS,
  SEED_CLUBS,
  SEED_JOINED_CLUBS,
  SEED_MY_REVIEWS,
  SEED_PEOPLE,
  SEED_POSTS,
  SEED_REVIEWS,
  SEED_SHELF,
  SEED_WORKS,
} from '@/data/seed';
import { DEFAULT_SETTINGS, type Settings } from '@/lib/settings';

import { MIGRATIONS } from './schema';
import type { Db } from './types';

export const ME = 'me';

/** Brings the database to the latest schema and seeds the catalog on first run. */
export async function migrate(db: Db, initial: Partial<Settings> = {}) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  let version = row?.user_version ?? 0;
  for (const m of MIGRATIONS) {
    if (m.version <= version) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(m.sql);
      if (version === 0) await seedAll(db, initial);
      await db.execAsync(`PRAGMA user_version = ${m.version}`);
    });
    version = m.version;
  }
}

const daysAgo = (d: number, now = Date.now()) => new Date(now - d * 864e5).toISOString();

async function seedCatalog(db: Db) {
  for (const w of SEED_WORKS) {
    await db.runAsync(
      `INSERT OR REPLACE INTO works (id, title, original_title, author, first_published, genres, tagline, synopsis, palette,
         seed_rating_avg, seed_rating_count, seed_histogram) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [w.id, w.title, w.originalTitle ?? null, w.author, w.year ?? null, JSON.stringify(w.genres), w.tagline ?? null,
        w.synopsis ?? null, w.palette, w.ratingAvg ?? null, w.ratingCount ?? 0, w.histogram ? JSON.stringify(w.histogram) : null],
    );
    for (const e of w.editions) {
      await db.runAsync(
        `INSERT OR REPLACE INTO editions (id, work_id, country, language, title, publisher, isbn13, asin, page_count, cover_url)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [e.id, w.id, e.country, e.language, e.title, e.publisher ?? null, e.isbn13 ?? null, e.asin ?? null, e.pageCount ?? null, e.coverUrl ?? null],
      );
    }
  }
  for (const c of SEED_CHARTS) {
    await db.runAsync('INSERT OR REPLACE INTO charts (country, period, rank, work_id, source) VALUES (?,?,?,?,?)',
      [c.country, c.period, c.rank, c.workId, c.source]);
  }
}

async function seedCommunity(db: Db) {
  const now = Date.now();
  await db.runAsync('INSERT OR REPLACE INTO users (id, name, color, is_me, is_friend) VALUES (?,?,?,1,0)', [ME, 'You', '#7A5747']);
  for (const p of SEED_PEOPLE) {
    await db.runAsync('INSERT OR REPLACE INTO users (id, name, color, is_me, is_friend) VALUES (?,?,?,0,1)', [p.id, p.name, p.color]);
  }
  for (const r of SEED_REVIEWS) {
    await db.runAsync(
      'INSERT OR REPLACE INTO reviews (id, work_id, user_id, rating, body, spoiler, seed_likes, created_at) VALUES (?,?,?,?,?,?,?,?)',
      [r.id, r.workId, r.userId, r.rating, r.body, 'spoiler' in r && r.spoiler ? 1 : 0, r.likes, daysAgo(r.daysAgo, now)],
    );
  }
  for (const c of SEED_CLUBS) {
    await db.runAsync(
      'INSERT OR REPLACE INTO clubs (id, name, description, palette, seed_likes, seed_members, created_at) VALUES (?,?,?,?,?,?,?)',
      [c.id, c.name, c.description, c.palette, c.likes, c.members, daysAgo(365, now)],
    );
  }
  for (const p of SEED_POSTS) {
    await db.runAsync(
      `INSERT OR REPLACE INTO posts (id, user_id, club_id, kind, title, body, work_id, chapter_range, unlock_page, spoiler,
         seed_likes, reply_count, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [p.id, p.userId, p.clubId, p.kind, ('title' in p ? p.title : null) ?? null, p.body, ('workId' in p ? p.workId : null) ?? null,
        ('chapterRange' in p ? p.chapterRange : null) ?? null, ('unlockPage' in p ? p.unlockPage : null) ?? null, 'spoiler' in p && p.spoiler ? 1 : 0,
        p.likes, p.replies, new Date(now - p.hoursAgo * 36e5).toISOString()],
    );
    if ('poll' in p && p.poll) {
      for (const [idx, [label, votes]] of p.poll.entries()) {
        await db.runAsync('INSERT OR REPLACE INTO poll_options (post_id, idx, label, seed_votes) VALUES (?,?,?,?)', [p.id, idx, label, votes]);
      }
    }
  }
}

/** The reader's example library, so the app is not empty on first launch. */
export async function seedMyLibrary(db: Db) {
  const now = new Date().toISOString();
  for (const s of SEED_SHELF) {
    const e = s as { workId: string; status: string; page?: number; rating?: number; fav?: boolean; start?: string; end?: string };
    const ed = await db.getFirstAsync<{ id: string }>('SELECT id FROM editions WHERE work_id = ? LIMIT 1', [e.workId]);
    await db.runAsync(
      `INSERT OR REPLACE INTO shelf (work_id, edition_id, status, current_page, rating, favorite, started_at, finished_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [e.workId, ed?.id ?? null, e.status, e.page ?? null, e.rating ?? null, e.fav ? 1 : 0, e.start ?? null, e.end ?? null, now],
    );
  }
  for (const [i, r] of SEED_MY_REVIEWS.entries()) {
    await db.runAsync(
      'INSERT OR REPLACE INTO reviews (id, work_id, user_id, rating, body, tags, seed_likes, created_at) VALUES (?,?,?,?,?,?,?,?)',
      [`mine-seed-${i}`, r.workId, ME, r.rating, r.body, JSON.stringify(r.tags), r.likes, new Date(r.date).toISOString()],
    );
  }
  for (const id of SEED_JOINED_CLUBS) {
    await db.runAsync('INSERT OR REPLACE INTO club_members (club_id, user_id, joined_at) VALUES (?,?,?)', [id, ME, now]);
  }
}

async function seedAll(db: Db, initial: Partial<Settings>) {
  await seedCatalog(db);
  await seedCommunity(db);
  await seedMyLibrary(db);
  await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', ['settings', JSON.stringify({ ...DEFAULT_SETTINGS, ...initial })]);
}

/** Clears the reader's own data and restores the example library. Keeps the account and plan. */
export async function resetMyData(db: Db) {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM shelf;
      DELETE FROM likes;
      DELETE FROM poll_votes;
      DELETE FROM club_members WHERE user_id = '${ME}';
      DELETE FROM reviews WHERE user_id = '${ME}';
      DELETE FROM posts WHERE user_id = '${ME}';
      DELETE FROM clubs WHERE owner_id = '${ME}';
    `);
    await seedMyLibrary(db);
  });
}
