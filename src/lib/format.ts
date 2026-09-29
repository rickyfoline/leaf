export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export const today = () => new Date().toISOString().slice(0, 10);

/** "2 days ago", "3h", "Yesterday"... */
export function timeAgo(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const h = Math.floor(diff / 36e5);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} week${d < 14 ? '' : 's'} ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m} month${m === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const statusLabel = (s: string) => ({ want: 'Want to read', reading: 'Reading', read: 'Read' })[s] ?? s;

export const RATE_WORDS = ['', 'Not for me', 'It was ok', 'Liked it', 'Really liked it', 'Loved it!'];
export const rateWord = (r: number) => RATE_WORDS[Math.ceil(r)] ?? '';

/** Accepts YYYY-MM-DD only. */
export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
