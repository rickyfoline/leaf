// Leaf Plus. Billing is simulated: nothing is charged. The real app will sell
// these through the App Store and Google Play (RevenueCat), see the README.
import type { Cycle } from './settings';

export const PLANS: Record<Cycle, { name: string; price: string; per: string; note: string; trial: boolean }> = {
  yearly: { name: 'Plus yearly', price: 'R$ 79', per: 'per year', note: 'R$ 6,58/month · save 33%', trial: true },
  monthly: { name: 'Plus monthly', price: 'R$ 9,90', per: 'per month', note: 'Cancel anytime', trial: true },
  patron: { name: 'Patron', price: 'R$ 179', per: 'per year', note: 'Everything in Plus, a Patron badge and early access', trial: false },
};

/** Why the paywall opened. */
export const GATES = {
  stats: 'Advanced reading stats',
  recap: 'Your full year in books',
  filters: 'Advanced search filters',
  friends: "Friends' ratings",
  goals: 'Custom reading goals',
  theme: 'Profile themes',
  import: 'Import from Goodreads',
  export: 'Export your data',
  barcode: 'Barcode scanning',
  private: 'Private clubs',
  clubs: 'More than one club',
  favs: 'Up to 10 favorites',
  third: 'You just logged your 3rd book',
} as const;
export type Gate = keyof typeof GATES;

export const PLUS_FEATURES: [string, string][] = [
  ['Advanced reading stats', 'Pages per month, top genres, favorite authors'],
  ['Your full year in books', 'A recap made to share in your stories'],
  ['Custom goals', 'Monthly page goals on top of your yearly goal'],
  ['Private clubs + spoiler shield', 'Buddy reads that hide spoilers until you reach the page'],
  ['Import, export and barcode scan', 'Bring your Goodreads shelf in one tap'],
  ['Profile themes and up to 10 favorites', 'Plus a badge next to your name'],
];

export const FREE_FAVORITES = 3;
export const PLUS_FAVORITES = 10;
export const FREE_CLUBS = 1;
/** The Plus offer shows once, after this many books are logged. */
export const OFFER_AFTER = 3;

export const trialEnd = (from = Date.now()) => new Date(from + 7 * 864e5).toISOString().slice(0, 10);
