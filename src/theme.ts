// Leaf visual language, taken from the Figma high fidelity and the web prototype.
export const colors = {
  bg: '#F9F7F3',
  surface: '#FFFFFF',
  warm: '#FFF9ED',
  warm2: '#FEFBF4',
  greenBg: '#FAFFF1',
  heading: '#7A5747',
  ink: '#4A3A33',
  body: '#5D534D',
  secondary: '#A1897C',
  muted: '#8E8A84',
  sage: '#A3B18A',
  sageInk: '#5E6B47',
  rose: '#C39E9E',
  roseMuted: '#AD9B9B',
  star: '#EBC351',
  starOff: '#E9E1D3',
  chip: '#EDE3E0',
  line: '#ECE6DF',
  stroke: '#E6DCD0',
  backdrop: '#EFEAE2',
  danger: '#9C3D2E',
} as const;

export const fonts = {
  serif: 'PlayfairDisplay_600SemiBold',
  serifBold: 'PlayfairDisplay_700Bold',
  serifItalic: 'PlayfairDisplay_600SemiBold_Italic',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
} as const;

/** Gradient cover palettes (3 stops, dark to light), used when a book has no cover image. */
export const palettes: Record<string, [string, string, string]> = {
  a: ['#243b55', '#6b4a7a', '#c7865a'],
  b: ['#1c3b2f', '#3f6b4b', '#b9c79a'],
  c: ['#5a1f1f', '#9c3d2e', '#e2a36b'],
  d: ['#0f1d33', '#28436b', '#e7d3a1'],
  e: ['#3b2a1f', '#7a5747', '#d9b98c'],
  f: ['#2c2c3a', '#5c5270', '#c9a8b8'],
  g: ['#1f3a3d', '#3c6e71', '#d9c7a0'],
  h: ['#4a1d2e', '#8a3b58', '#e8b4a4'],
  i: ['#2b2118', '#6b5436', '#e0c27a'],
  j: ['#12263a', '#3f5f7a', '#c9d6c1'],
};
export const paletteKeys = Object.keys(palettes);

/** Profile themes (Leaf Plus). */
export const profileThemes: Record<string, string> = {
  brown: '#7A5747',
  sage: '#5E6B47',
  rose: '#9C6F6F',
  night: '#28436B',
};

export const shadow = {
  shadowColor: '#7A5747',
  shadowOpacity: 0.1,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;
