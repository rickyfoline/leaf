// Page counting and reading statistics. Pure functions, no database access.
import type { ShelfStatus } from '@/db/types';

export type StatBook = {
  workId: string;
  title: string;
  author: string;
  genres: string[];
  status: ShelfStatus;
  currentPage: number | null;
  /** Edition page count, or the one the reader typed. Null when unknown. */
  pages: number | null;
  rating: number | null;
  finishedAt: string | null;
};

export const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** Pages the reader has read in this book. */
export function pagesRead(b: Pick<StatBook, 'status' | 'currentPage' | 'pages'>): number {
  if (b.status === 'read') return b.pages ?? b.currentPage ?? 0;
  if (b.status === 'reading') return clamp(Math.round(b.currentPage ?? 0), 0, b.pages ?? Number.MAX_SAFE_INTEGER);
  return 0;
}

export function percentRead(b: Pick<StatBook, 'status' | 'currentPage' | 'pages'>): number {
  if (b.status === 'read') return 100;
  if (!b.pages) return 0;
  return Math.round((pagesRead(b) / b.pages) * 100);
}

/** Total pages read: finished books plus the current page of books in progress. */
export function pageTotals(books: StatBook[]) {
  let finished = 0;
  let current = 0;
  for (const b of books) {
    if (b.status === 'read') finished += pagesRead(b);
    else if (b.status === 'reading') current += pagesRead(b);
  }
  return { finished, current, total: finished + current };
}

export const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export type ReadingStats = {
  year: number;
  /** Pages per month, January first. Books in progress count in the current month. */
  months: number[];
  finished: number;
  pages: number;
  genres: [string, number][];
  authors: [string, number][];
  longest: StatBook | null;
  best: StatBook | null;
  averageLength: number;
  bestMonth: number;
};

const ranked = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]);

export function readingStats(books: StatBook[], now = new Date()): ReadingStats {
  const year = now.getFullYear();
  const months = Array<number>(12).fill(0);
  const genres: Record<string, number> = {};
  const authors: Record<string, number> = {};
  let finished = 0;
  let pages = 0;
  let longest: StatBook | null = null;
  let best: StatBook | null = null;

  for (const b of books) {
    if (b.status === 'read' && (b.finishedAt ?? '').startsWith(String(year))) {
      const p = pagesRead(b);
      months[Number(b.finishedAt!.slice(5, 7)) - 1] += p;
      finished++;
      pages += p;
      for (const g of b.genres) genres[g] = (genres[g] ?? 0) + 1;
      authors[b.author] = (authors[b.author] ?? 0) + 1;
      if (b.pages && (!longest || b.pages > (longest.pages ?? 0))) longest = b;
      if (b.rating && (!best || b.rating > (best.rating ?? 0))) best = b;
    } else if (b.status === 'reading') {
      const p = pagesRead(b);
      months[now.getMonth()] += p;
      pages += p;
    }
  }

  const readWithPages = books.filter((b) => b.status === 'read' && b.pages);
  const averageLength = readWithPages.length
    ? Math.round(readWithPages.reduce((s, b) => s + (b.pages ?? 0), 0) / readWithPages.length)
    : 0;
  const bestMonth = months.indexOf(Math.max(...months));

  return { year, months, finished, pages, genres: ranked(genres), authors: ranked(authors), longest, best, averageLength, bestMonth };
}

/** Average of the catalog rating plus local ratings. */
export function combinedRating(seedAvg: number | null, seedCount: number, local: number[]) {
  const localSum = local.reduce((s, r) => s + r, 0);
  const count = (seedAvg != null ? seedCount : 0) + local.length;
  if (!count) return { avg: null, count: 0 };
  const total = (seedAvg != null ? seedAvg * seedCount : 0) + localSum;
  return { avg: total / count, count };
}

/** 10 buckets from half a star to five stars. */
export function histogram(ratings: number[]) {
  const h = Array<number>(10).fill(0);
  for (const r of ratings) h[clamp(Math.round(r * 2) - 1, 0, 9)]++;
  return h;
}
