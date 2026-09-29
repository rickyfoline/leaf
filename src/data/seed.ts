// Example catalog and community used until the backend exists.
// A work is the book itself (ratings and reviews live here). An edition is one
// printing sold in one country (ISBN, ASIN, publisher, page count, buy link).
import bestsellersBR from './amazon-br-bestsellers-2026-08.json';

export type SeedEdition = {
  id: string;
  country: string; // ISO 3166-1 alpha-2 of the store market
  language: string; // BCP 47
  title: string;
  publisher?: string | null;
  isbn13?: string | null;
  asin?: string | null;
  pageCount?: number | null;
  coverUrl?: string | null;
};

export type SeedWork = {
  id: string;
  title: string;
  originalTitle?: string | null;
  author: string;
  year?: number | null;
  genres: string[];
  palette: string;
  tagline?: string | null;
  synopsis?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number;
  /** 10 buckets, half a star to five stars. */
  histogram?: number[] | null;
  editions: SeedEdition[];
};

/** Works from the web prototype. English editions sold in the US. */
const PROTOTYPE_WORKS: SeedWork[] = [
  { id: 'coraline', title: 'Coraline', author: 'Neil Gaiman', year: 2002, genres: ['Fantasy', 'Horror'], palette: 'c', ratingAvg: 4.2, ratingCount: 53684,
    tagline: "Newbery Medal-winning author Neil Gaiman's modern classic, also an Academy Award-nominated film.",
    synopsis: 'Coraline finds a door in her new home that opens onto a copy of her own house, where everything seems better. But the Other Mother there has buttons for eyes and wants Coraline to stay forever.',
    histogram: [1, 1, 2, 4, 6, 9, 16, 24, 20, 17], editions: [{ id: 'coraline-us', country: 'US', language: 'en', title: 'Coraline', pageCount: 162 }] },
  { id: 'housemaid', title: 'The Housemaid', author: 'Freida McFadden', year: 2022, genres: ['Thriller', 'Crime'], palette: 'f', ratingAvg: 4.3, ratingCount: 120433,
    tagline: 'The #1 bestselling psychological thriller everyone is talking about.',
    synopsis: "Millie takes a live-in job cleaning the Winchesters' beautiful home. She thinks it is a fresh start, until she learns what really happens behind the locked door of the attic room.",
    histogram: [1, 1, 1, 2, 4, 8, 14, 24, 25, 20], editions: [{ id: 'housemaid-us', country: 'US', language: 'en', title: 'The Housemaid', pageCount: 336 }] },
  { id: 'sunrise', title: 'Sunrise on the Reaping', author: 'Suzanne Collins', year: 2025, genres: ['Fantasy', 'Young Adult'], palette: 'a', ratingAvg: 4.5, ratingCount: 84210,
    tagline: 'Return to Panem on the morning of the fiftieth Hunger Games.',
    synopsis: 'As the second Quarter Quell approaches, sixteen-year-old Haymitch Abernathy is reaped along with three times the usual number of tributes, and learns how far the Capitol will go to win.',
    histogram: [1, 1, 1, 1, 2, 5, 10, 22, 27, 30], editions: [{ id: 'sunrise-us', country: 'US', language: 'en', title: 'Sunrise on the Reaping', pageCount: 400 }] },
  { id: 'hobbit', title: 'The Hobbit', author: 'J.R.R. Tolkien', year: 1937, genres: ['Fantasy', 'Classic'], palette: 'b', ratingAvg: 4.3, ratingCount: 398112,
    tagline: 'The beloved prelude to The Lord of the Rings.',
    synopsis: 'Bilbo Baggins enjoys a quiet life until the wizard Gandalf and thirteen dwarves sweep him into a quest to reclaim a treasure guarded by the dragon Smaug.',
    histogram: [1, 1, 1, 2, 4, 7, 14, 24, 24, 22], editions: [{ id: 'hobbit-us', country: 'US', language: 'en', title: 'The Hobbit', pageCount: 310 }] },
  { id: 'pride', title: 'Pride and Prejudice', author: 'Jane Austen', year: 1813, genres: ['Romance', 'Classic', 'Literature'], palette: 'd', ratingAvg: 4.3, ratingCount: 421905,
    tagline: 'The most beloved romance in English literature.',
    synopsis: 'Elizabeth Bennet meets the proud Mr. Darcy and forms a firm opinion of him. Misunderstandings, a disastrous proposal and a few family scandals follow before either of them sees clearly.',
    histogram: [1, 1, 1, 2, 4, 7, 13, 22, 25, 24], editions: [{ id: 'pride-us', country: 'US', language: 'en', title: 'Pride and Prejudice', pageCount: 432 }] },
  { id: 'charlotte', title: "Charlotte's Web", author: 'E.B. White', year: 1952, genres: ['Classic', 'Children'], palette: 'g', ratingAvg: 4.2, ratingCount: 201334,
    tagline: 'Some Pig. A timeless story of friendship.',
    synopsis: 'Wilbur the pig is saved from slaughter by Fern, then by Charlotte, a clever spider who spins words into her web to convince the farm that Wilbur is special.',
    histogram: [1, 1, 2, 3, 5, 9, 15, 24, 22, 18], editions: [{ id: 'charlotte-us', country: 'US', language: 'en', title: "Charlotte's Web", pageCount: 192 }] },
  { id: 'percy', title: 'Percy Jackson: The Lightning Thief', author: 'Rick Riordan', year: 2005, genres: ['Fantasy', 'Young Adult'], palette: 'j', ratingAvg: 4.3, ratingCount: 310228,
    tagline: 'The Greek gods are alive and well in the 21st century.',
    synopsis: "Percy learns he is the son of Poseidon and is accused of stealing Zeus's lightning bolt. He has ten days to find it and stop a war between the gods.",
    histogram: [1, 1, 1, 2, 4, 8, 14, 23, 24, 22], editions: [{ id: 'percy-us', country: 'US', language: 'en', title: 'Percy Jackson: The Lightning Thief', pageCount: 377 }] },
  { id: 'sophie', title: "Sophie's Choice", author: 'William Styron', year: 1979, genres: ['Literature', 'Classic'], palette: 'e', ratingAvg: 4.2, ratingCount: 98450,
    tagline: 'Winner of the National Book Award.',
    synopsis: 'In 1947 Brooklyn, a young writer befriends Sophie, a Polish survivor of Auschwitz, and her volatile lover Nathan, and slowly learns the choice that haunts her.',
    histogram: [1, 1, 2, 3, 5, 9, 15, 23, 22, 19], editions: [{ id: 'sophie-us', country: 'US', language: 'en', title: "Sophie's Choice", pageCount: 562 }] },
  { id: 'gone', title: 'Gone Girl', author: 'Gillian Flynn', year: 2012, genres: ['Thriller', 'Crime'], palette: 'h', ratingAvg: 4.1, ratingCount: 311870,
    tagline: 'The addictive thriller about a marriage gone terribly wrong.',
    synopsis: 'On their fifth anniversary Amy Dunne disappears, and every clue seems to point at her husband Nick. Then the story turns inside out.',
    histogram: [1, 1, 2, 3, 6, 10, 17, 24, 20, 16], editions: [{ id: 'gone-us', country: 'US', language: 'en', title: 'Gone Girl', pageCount: 432 }] },
  { id: 'project', title: 'Project Hail Mary', author: 'Andy Weir', year: 2021, genres: ['Technology', 'Sci-Fi'], palette: 'i', ratingAvg: 4.5, ratingCount: 176550,
    tagline: 'From the author of The Martian.',
    synopsis: 'Ryland Grace wakes up alone on a spaceship with no memory of how he got there. He has to work out the science fast, because the Sun is dimming and Earth is running out of time.',
    histogram: [1, 1, 1, 1, 2, 5, 10, 21, 28, 30], editions: [{ id: 'project-us', country: 'US', language: 'en', title: 'Project Hail Mary', pageCount: 476 }] },
  { id: 'thursday', title: 'The Thursday Murder Club', author: 'Richard Osman', year: 2020, genres: ['Crime', 'Mystery'], palette: 'g', ratingAvg: 4.0, ratingCount: 120020,
    tagline: 'Four retirees meet weekly to solve cold cases, until a real one lands on their doorstep.',
    synopsis: 'In a peaceful retirement village, four friends who investigate unsolved crimes for fun find themselves in the middle of their first live murder case.',
    histogram: [1, 1, 2, 4, 7, 12, 19, 24, 17, 13], editions: [{ id: 'thursday-us', country: 'US', language: 'en', title: 'The Thursday Murder Club', pageCount: 382 }] },
  { id: 'circe', title: 'Circe', author: 'Madeline Miller', year: 2018, genres: ['Fantasy', 'Literature'], palette: 'h', ratingAvg: 4.3, ratingCount: 212300,
    tagline: 'A bold retelling of the life of the witch of Aiaia.',
    synopsis: 'Banished to an island by Zeus, the nymph Circe hones her witchcraft and crosses paths with some of the most famous figures of Greek myth, including Odysseus.',
    histogram: [1, 1, 1, 2, 4, 8, 14, 24, 24, 21], editions: [{ id: 'circe-us', country: 'US', language: 'en', title: 'Circe', pageCount: 393 }] },
];

// Extra facts for the Brazilian bestseller list, keyed by rank. Genres and
// original titles are filled only where they are well known; page counts and
// synopses stay empty until the catalog API provides them.
const BR_EXTRA: Record<number, { genres: string[]; originalTitle?: string }> = {
  1: { genres: ['Thriller', 'Romance'], originalTitle: 'Verity' },
  2: { genres: ['Nonfiction', 'Travel'] },
  3: { genres: [] },
  4: { genres: ['Literature'] },
  5: { genres: ['Thriller'], originalTitle: 'The Only One Left' },
  6: { genres: ['Literature', 'Classic'] },
  7: { genres: ['Thriller', 'Crime'] },
  8: { genres: ['Nonfiction', 'Business'], originalTitle: 'The Psychology of Money' },
  9: { genres: ['Romance'], originalTitle: 'The Deal' },
  10: { genres: [] },
  11: { genres: ['Nonfiction', 'Self-help'], originalTitle: 'Atomic Habits' },
  12: { genres: ['Self-help'], originalTitle: 'The Power of Your Subconscious Mind' },
  13: { genres: ['Classic', 'Children'], originalTitle: 'Le Petit Prince' },
  14: { genres: ['Romance'], originalTitle: 'The Love Hypothesis' },
  15: { genres: [] },
  16: { genres: ['Romance', 'Young Adult'], originalTitle: 'Better Than the Movies' },
  17: { genres: ['Literature'] },
  18: { genres: ['Thriller'], originalTitle: 'Never Lie' },
  19: { genres: ['Thriller'], originalTitle: 'The Silent Patient' },
  20: { genres: ['Romance'] },
};

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export type ChartEntry = { country: string; period: string; rank: number; workId: string; source: string };

type BestsellerRow = (typeof bestsellersBR.livros)[number];

const BR_WORKS: SeedWork[] = bestsellersBR.livros.map((b: BestsellerRow, i: number) => {
  const extra = BR_EXTRA[b.rank] ?? { genres: [] };
  return {
    id: `br-${slug(b.titulo)}`,
    title: b.titulo,
    originalTitle: extra.originalTitle ?? null,
    author: b.autor,
    genres: extra.genres,
    palette: 'abcdefghij'[i % 10],
    editions: [{
      id: `br-${b.isbn13}`,
      country: 'BR',
      language: 'pt-BR',
      title: b.titulo,
      publisher: b.editora,
      isbn13: b.isbn13,
      asin: b.asin,
      coverUrl: b.capa,
    }],
  };
});

export const SEED_WORKS: SeedWork[] = [...PROTOTYPE_WORKS, ...BR_WORKS];

export const SEED_CHARTS: ChartEntry[] = bestsellersBR.livros.map((b: BestsellerRow, i: number) => ({
  country: 'BR',
  period: '2026-08',
  rank: b.rank,
  workId: BR_WORKS[i].id,
  source: bestsellersBR.meta.fonte,
}));

export const SEED_PEOPLE = [
  { id: 'james', name: 'James Carter', color: '#C39E9E' },
  { id: 'sofia', name: 'Sofia Lima', color: '#A3B18A' },
  { id: 'ana', name: 'Ana Souza', color: '#B78A74' },
  { id: 'rafael', name: 'Rafael Nunes', color: '#8FA0B5' },
  { id: 'lucas', name: 'Lucas Prado', color: '#A1897C' },
  { id: 'bia', name: 'Bia Moura', color: '#9C8BB0' },
];

export const SEED_REVIEWS = [
  { id: 'r1', workId: 'coraline', userId: 'james', rating: 5, daysAgo: 2, likes: 212, body: 'Creepy in the best way. Buttons for eyes will haunt me forever, and Coraline is the brave heroine I needed as a kid.' },
  { id: 'r2', workId: 'coraline', userId: 'sofia', rating: 4, daysAgo: 7, likes: 97, body: 'Short, strange and beautifully written. A perfect October read.' },
  { id: 'r3', workId: 'housemaid', userId: 'ana', rating: 4, daysAgo: 3, likes: 154, body: 'I guessed one twist and completely missed the second. Read it in a single evening.' },
  { id: 'r4', workId: 'sunrise', userId: 'rafael', rating: 5, daysAgo: 5, likes: 301, body: 'Haymitch deserved this book. The arena chapters are relentless and the ending hurts.' },
  { id: 'r5', workId: 'hobbit', userId: 'lucas', rating: 5, daysAgo: 14, likes: 88, body: 'Still the coziest adventure ever written. Second breakfast is a lifestyle.' },
  { id: 'r6', workId: 'pride', userId: 'bia', rating: 5, daysAgo: 1, likes: 120, body: 'Rereading as an adult, I finally noticed how funny Austen is. Mr. Bennet steals every scene.' },
  { id: 'r7', workId: 'gone', userId: 'james', rating: 4, daysAgo: 21, likes: 76, spoiler: true, body: 'The midpoint reveal rearranged my whole brain.' },
  { id: 'r8', workId: 'project', userId: 'sofia', rating: 5, daysAgo: 4, likes: 240, body: 'Science, friendship and a lot of heart. Rocky is the best character of the decade.' },
  { id: 'r9', workId: 'percy', userId: 'ana', rating: 4, daysAgo: 30, likes: 64, body: 'Fast, funny and full of myth references. I get why it is a gateway book.' },
  { id: 'r10', workId: 'circe', userId: 'bia', rating: 5, daysAgo: 6, likes: 133, body: 'Lyrical and patient. Circe finally gets to tell her own story.' },
];

export const SEED_CLUBS = [
  { id: 'potter', name: 'Potterheads', palette: 'a', likes: '4.5K', members: '7.6K', description: 'Everything Hogwarts, from Sorting debates to rereads.' },
  { id: 'classic', name: 'Classic Romance', palette: 'd', likes: '4.5K', members: '7.6K', description: 'Austen, Brontë and the slow burns that started it all.' },
  { id: 'spooky', name: 'Spookymoo', palette: 'c', likes: '4.5K', members: '7.5K', description: 'Ghosts, gothic houses and books to read with the lights on.' },
  { id: 'dark', name: 'Dark Academia', palette: 'e', likes: '3.1K', members: '5.2K', description: 'Secret societies, old libraries and moody campuses.' },
  { id: 'thrill', name: 'Thriller Nights', palette: 'f', likes: '2.4K', members: '6.8K', description: 'Twists, unreliable narrators and late-night reads.' },
  { id: 'cozy', name: 'Cozy Reads', palette: 'b', likes: '4.0K', members: '9.1K', description: 'Tea, blankets and comforting stories.' },
];

export const SEED_POSTS = [
  { id: 'p1', userId: 'ana', clubId: 'potter', hoursAgo: 1, kind: 'Discussion', title: 'Which book would you reread first?',
    body: 'Rereading the whole series this fall. Starting with Prisoner of Azkaban, and I want to know your picks!',
    poll: [['Prisoner of Azkaban', 181], ['Half-Blood Prince', 84], ['Goblet of Fire', 47]] as [string, number][], likes: 128, replies: 46 },
  { id: 'p2', userId: 'rafael', clubId: null, hoursAgo: 3, kind: 'Buddy read', chapterRange: 'Chapters 5–8', workId: 'coraline', unlockPage: 60, spoiler: true,
    body: "The rats' song gave me chills. Is the other mother getting weaker, or is it just a trick?", likes: 64, replies: 21 },
  { id: 'p3', userId: 'sofia', clubId: 'cozy', hoursAgo: 26, kind: 'Recommendation', title: 'Your comfort reads for a rainy Sunday?',
    body: "Mine are The Hobbit and Charlotte's Web. Looking for something new to curl up with.", likes: 91, replies: 33 },
];

/** The example library the demo user starts with (same as the web prototype). */
export const SEED_SHELF = [
  { workId: 'sunrise', status: 'reading', page: 248, start: '2026-09-14' },
  { workId: 'housemaid', status: 'reading', page: 94, start: '2026-09-22' },
  { workId: 'gone', status: 'read', rating: 4, end: '2026-05-18' },
  { workId: 'thursday', status: 'read', rating: 4, end: '2026-08-12' },
  { workId: 'charlotte', status: 'want' },
  { workId: 'percy', status: 'want' },
  { workId: 'sophie', status: 'want' },
  { workId: 'coraline', status: 'read', rating: 5, fav: true, start: '2026-08-30', end: '2026-09-03' },
  { workId: 'hobbit', status: 'read', rating: 5, fav: true, end: '2026-07-10' },
  { workId: 'pride', status: 'read', rating: 4, fav: true, end: '2026-06-02' },
] as const;

export const SEED_MY_REVIEWS = [
  { workId: 'coraline', rating: 5, date: '2026-09-03', likes: 18, tags: ['reread', 'spooky'],
    body: 'Reread it for spooky season and it still works. The cat is my favorite character.' },
];

export const SEED_JOINED_CLUBS = ['potter', 'spooky', 'classic'];
