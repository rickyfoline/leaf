import { parseCsv, sameTitle, toCsv } from '@/lib/csv';
import { combinedRating, histogram, pagesRead, percentRead, readingStats } from '@/lib/stats';
import type { StatBook } from '@/lib/stats';

const book = (p: Partial<StatBook>): StatBook => ({
  workId: 'x', title: 'X', author: 'A', genres: [], status: 'read', currentPage: null, pages: 300, rating: null, finishedAt: null, ...p,
});

describe('pages', () => {
  it('counts finished books whole and books in progress up to the current page', () => {
    expect(pagesRead(book({ status: 'read' }))).toBe(300);
    expect(pagesRead(book({ status: 'reading', currentPage: 120 }))).toBe(120);
    expect(pagesRead(book({ status: 'reading', currentPage: 999 }))).toBe(300);
    expect(pagesRead(book({ status: 'want', currentPage: 50 }))).toBe(0);
    expect(percentRead(book({ status: 'reading', currentPage: 150 }))).toBe(50);
    expect(percentRead(book({ status: 'reading', currentPage: 150, pages: null }))).toBe(0);
  });
});

describe('readingStats', () => {
  it('groups the year by month, genre and author', () => {
    const now = new Date('2026-09-29T12:00:00Z');
    const st = readingStats([
      book({ title: 'A', author: 'Ann', genres: ['Fantasy'], finishedAt: '2026-03-10', pages: 400, rating: 5 }),
      book({ title: 'B', author: 'Ann', genres: ['Fantasy', 'Classic'], finishedAt: '2026-03-20', pages: 200, rating: 4 }),
      book({ title: 'C', author: 'Bob', genres: ['Crime'], finishedAt: '2025-12-01', pages: 900 }),
      book({ title: 'D', status: 'reading', currentPage: 50 }),
    ], now);
    expect(st.finished).toBe(2);
    expect(st.pages).toBe(650);
    expect(st.months[2]).toBe(600);
    expect(st.months[8]).toBe(50);
    expect(st.bestMonth).toBe(2);
    expect(st.genres[0]).toEqual(['Fantasy', 2]);
    expect(st.authors[0]).toEqual(['Ann', 2]);
    expect(st.longest?.title).toBe('A'); // 2025 books do not count
    expect(st.best?.title).toBe('A');
  });
});

describe('ratings', () => {
  it('mixes catalog and local ratings', () => {
    expect(combinedRating(4, 3, [5])).toEqual({ avg: 4.25, count: 4 });
    expect(combinedRating(null, 0, [])).toEqual({ avg: null, count: 0 });
    expect(histogram([0.5, 5, 4.5, 5])).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 1, 2]);
  });
});

describe('csv', () => {
  it('round-trips quotes, commas and new lines', () => {
    const rows = [['a', 'b,c', 'say "hi"', 'two\nlines']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
  it('matches titles loosely', () => {
    expect(sameTitle('The Hobbit (Illustrated)', 'The Hobbit')).toBe(true);
    expect(sameTitle('Atomic Habits: An Easy Way', 'Atomic Habits')).toBe(true);
    expect(sameTitle('Circe', 'Circle')).toBe(false);
  });
});
