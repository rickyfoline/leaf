export type Plan = 'free' | 'plus' | 'patron';
export type Cycle = 'yearly' | 'monthly' | 'patron';

export type Profile = { name: string; handle: string; email: string };

export type Settings = {
  user: Profile | null;
  guest: boolean;
  /** Store country for editions and buy links (ISO 3166-1 alpha-2). */
  country: string;
  goal: number;
  pageGoal: number;
  theme: string;
  filters: SearchFilters;
  plan: Plan;
  cycle: Cycle | null;
  trialEnds: string | null;
  /** Books saved through the Add screen, used to time the Plus offer. */
  logged: number;
  offerShown: boolean;
};

export type SearchFilters = { len?: 'short' | 'mid' | 'long'; unread?: boolean };

export const DEFAULT_SETTINGS: Settings = {
  user: null,
  guest: false,
  country: 'BR',
  goal: 50,
  pageGoal: 1500,
  theme: 'brown',
  filters: {},
  plan: 'free',
  cycle: null,
  trialEnds: null,
  logged: 0,
  offerShown: false,
};

export const isPlus = (s: Pick<Settings, 'plan'>) => s.plan === 'plus' || s.plan === 'patron';

export function handleFromName(name: string) {
  const h = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return h || 'reader';
}
