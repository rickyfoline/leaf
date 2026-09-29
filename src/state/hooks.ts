import * as repo from '@/db/repo';
import type { ShelfBook } from '@/db/types';
import type { StatBook } from '@/lib/stats';

import { useApp, useLive } from './app';

export function useShelf() {
  const { settings } = useApp();
  return useLive((db) => repo.getShelf(db, settings.country), [settings.country]);
}

export const toStatBooks = (shelf: ShelfBook[]): StatBook[] =>
  shelf.map((s) => ({
    workId: s.workId,
    title: s.book.displayTitle,
    author: s.book.author,
    genres: s.book.genres,
    status: s.status,
    currentPage: s.currentPage,
    pages: s.pages,
    rating: s.rating,
    finishedAt: s.finishedAt,
  }));
