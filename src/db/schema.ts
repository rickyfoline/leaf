// Local SQLite schema. It mirrors the tables the future backend (Postgres) will
// have, so moving to a server later is a sync job and not a redesign.
//
// The key split: `works` hold what readers talk about (ratings, reviews, posts),
// `editions` hold what a store sells in one country (ISBN, ASIN, publisher,
// page count, cover). A buy button always uses the edition of the reader's
// country; reviews of every edition add up on the same work.

export type Migration = { version: number; sql: string };

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
CREATE TABLE works (
  id               TEXT PRIMARY KEY NOT NULL,
  title            TEXT NOT NULL,
  original_title   TEXT,
  author           TEXT NOT NULL,
  first_published  INTEGER,
  genres           TEXT NOT NULL DEFAULT '[]',   -- JSON array of genre names
  tagline          TEXT,
  synopsis         TEXT,
  palette          TEXT NOT NULL DEFAULT 'e',    -- gradient used when there is no cover image
  seed_rating_avg  REAL,                          -- rating imported from the catalog source
  seed_rating_count INTEGER NOT NULL DEFAULT 0,
  seed_histogram   TEXT                           -- JSON, 10 buckets from half a star to five stars
);

CREATE TABLE editions (
  id          TEXT PRIMARY KEY NOT NULL,
  work_id     TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  country     TEXT NOT NULL,                      -- ISO 3166-1 alpha-2 of the store market
  language    TEXT NOT NULL,                      -- BCP 47, e.g. pt-BR
  title       TEXT NOT NULL,                      -- title as printed on this edition
  publisher   TEXT,
  isbn13      TEXT,
  asin        TEXT,                               -- Amazon id in this country's store
  page_count  INTEGER,
  cover_url   TEXT
);
CREATE INDEX editions_by_work ON editions(work_id);
CREATE INDEX editions_by_country ON editions(country, work_id);
CREATE UNIQUE INDEX editions_by_isbn ON editions(isbn13) WHERE isbn13 IS NOT NULL;

-- Bestseller lists per country (the Amazon list is "Best sellers in Brazil").
CREATE TABLE charts (
  country  TEXT NOT NULL,
  period   TEXT NOT NULL,
  rank     INTEGER NOT NULL,
  work_id  TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  source   TEXT,
  PRIMARY KEY (country, period, rank)
);

CREATE TABLE users (
  id         TEXT PRIMARY KEY NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#7A5747',
  is_me      INTEGER NOT NULL DEFAULT 0,
  is_friend  INTEGER NOT NULL DEFAULT 0
);

-- The signed-in reader's shelf: one row per work.
CREATE TABLE shelf (
  work_id       TEXT PRIMARY KEY NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  edition_id    TEXT REFERENCES editions(id) ON DELETE SET NULL,
  status        TEXT NOT NULL CHECK (status IN ('want', 'reading', 'read')),
  current_page  INTEGER,
  total_pages   INTEGER,                          -- set by the reader when the edition has no page count
  rating        REAL CHECK (rating IS NULL OR (rating >= 0.5 AND rating <= 5)),
  favorite      INTEGER NOT NULL DEFAULT 0,
  started_at    TEXT,
  finished_at   TEXT,
  tags          TEXT NOT NULL DEFAULT '[]',
  updated_at    TEXT NOT NULL
);

CREATE TABLE reviews (
  id          TEXT PRIMARY KEY NOT NULL,
  work_id     TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  edition_id  TEXT REFERENCES editions(id) ON DELETE SET NULL,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      REAL,
  body        TEXT NOT NULL,
  spoiler     INTEGER NOT NULL DEFAULT 0,
  tags        TEXT NOT NULL DEFAULT '[]',
  seed_likes  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
CREATE INDEX reviews_by_work ON reviews(work_id);

-- Things the reader liked (reviews or posts).
CREATE TABLE likes (
  target_id   TEXT PRIMARY KEY NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE clubs (
  id           TEXT PRIMARY KEY NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  palette      TEXT NOT NULL DEFAULT 'a',
  seed_likes   TEXT NOT NULL DEFAULT '0',
  seed_members TEXT NOT NULL DEFAULT '1',
  is_private   INTEGER NOT NULL DEFAULT 0,
  owner_id     TEXT REFERENCES users(id),
  created_at   TEXT NOT NULL
);

CREATE TABLE club_members (
  club_id    TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TEXT NOT NULL,
  PRIMARY KEY (club_id, user_id)
);

CREATE TABLE posts (
  id             TEXT PRIMARY KEY NOT NULL,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id        TEXT REFERENCES clubs(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL,
  title          TEXT,
  body           TEXT NOT NULL,
  work_id        TEXT REFERENCES works(id) ON DELETE SET NULL,
  chapter_range  TEXT,
  unlock_page    INTEGER,                         -- spoiler shield opens at this page
  spoiler        INTEGER NOT NULL DEFAULT 0,
  seed_likes     INTEGER NOT NULL DEFAULT 0,
  reply_count    INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);

CREATE TABLE poll_options (
  post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  idx         INTEGER NOT NULL,
  label       TEXT NOT NULL,
  seed_votes  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, idx)
);

-- The reader's own vote in each poll.
CREATE TABLE poll_votes (
  post_id  TEXT PRIMARY KEY NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  idx      INTEGER NOT NULL
);

-- App settings, profile and the (simulated) Leaf Plus state.
CREATE TABLE kv (
  key    TEXT PRIMARY KEY NOT NULL,
  value  TEXT NOT NULL
);
`,
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
