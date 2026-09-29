export type BindValue = string | number | null;

/** The part of expo-sqlite's SQLiteDatabase that Leaf uses (tests run it on node:sqlite). */
export interface Db {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: BindValue[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync<T>(source: string, params: BindValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: BindValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export type ShelfStatus = 'want' | 'reading' | 'read';

export type Edition = {
  id: string;
  workId: string;
  country: string;
  language: string;
  title: string;
  publisher: string | null;
  isbn13: string | null;
  asin: string | null;
  pageCount: number | null;
  coverUrl: string | null;
};

export type Work = {
  id: string;
  title: string;
  originalTitle: string | null;
  author: string;
  year: number | null;
  genres: string[];
  tagline: string | null;
  synopsis: string | null;
  palette: string;
  seedRatingAvg: number | null;
  seedRatingCount: number;
  seedHistogram: number[] | null;
};

/** A work as shown to a reader in one country: its local edition and live rating. */
export type Book = Work & {
  /** Title of the local edition, or the work title. */
  displayTitle: string;
  edition: Edition | null;
  ratingAvg: number | null;
  ratingCount: number;
};

export type ShelfEntry = {
  workId: string;
  editionId: string | null;
  status: ShelfStatus;
  currentPage: number | null;
  totalPages: number | null;
  rating: number | null;
  favorite: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  tags: string[];
  updatedAt: string;
};

export type ShelfBook = ShelfEntry & { book: Book; pages: number | null };

export type Person = { id: string; name: string; color: string; isMe: boolean; isFriend: boolean };

export type Review = {
  id: string;
  workId: string;
  user: Person;
  rating: number | null;
  body: string;
  spoiler: boolean;
  tags: string[];
  likes: number;
  liked: boolean;
  createdAt: string;
};

export type Club = {
  id: string;
  name: string;
  description: string;
  palette: string;
  likes: string;
  members: string;
  isPrivate: boolean;
  isMine: boolean;
  joined: boolean;
};

export type PollOption = { idx: number; label: string; votes: number };

export type Post = {
  id: string;
  user: Person;
  club: Club | null;
  kind: string;
  title: string | null;
  body: string;
  book: Book | null;
  chapterRange: string | null;
  unlockPage: number | null;
  spoiler: boolean;
  likes: number;
  liked: boolean;
  replies: number;
  createdAt: string;
  poll: PollOption[] | null;
  myVote: number | null;
};
