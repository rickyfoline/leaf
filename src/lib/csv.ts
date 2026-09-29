// CSV export of the reader's library and import from a Goodreads export.
import type { ShelfStatus } from '@/db/types';

export function csvEscape(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvEscape).join(',')).join('\n');

export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur);
      out.push(row);
      row = [];
      cur = '';
    } else cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    out.push(row);
  }
  return out;
}

export type GoodreadsRow = { title: string; author: string; isbn13: string | null; status: ShelfStatus; rating: number | null; finishedAt: string | null };

/** Reads a Goodreads "Export library" CSV. */
export function parseGoodreads(text: string): GoodreadsRow[] {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  const header = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const ti = col('title');
  if (ti < 0) throw new Error('That file has no Title column');
  const au = col('author');
  const isbn = col('isbn13');
  const shelf = col('exclusive shelf');
  const rating = col('my rating');
  const read = col('date read');
  const out: GoodreadsRow[] = [];
  for (const r of rows) {
    const title = (r[ti] ?? '').trim();
    if (!title) continue;
    const sh = (r[shelf] ?? '').trim();
    // Goodreads writes ISBNs as ="9780000000000".
    const i13 = (r[isbn] ?? '').replace(/[^0-9Xx]/g, '');
    const stars = Number(r[rating]);
    const date = (r[read] ?? '').trim().replace(/\//g, '-');
    out.push({
      title,
      author: (r[au] ?? '').trim(),
      isbn13: i13.length === 13 ? i13 : null,
      status: sh === 'currently-reading' ? 'reading' : sh === 'to-read' ? 'want' : 'read',
      rating: stars > 0 ? stars : null,
      finishedAt: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    });
  }
  return out;
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\(.*?\)|:.*$/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** True when an imported title names the same book as a catalog title. */
export function sameTitle(imported: string, catalog: string) {
  const a = norm(imported);
  const b = norm(catalog);
  return !!a && !!b && (a === b || a.startsWith(b + ' ') || b.startsWith(a + ' '));
}
