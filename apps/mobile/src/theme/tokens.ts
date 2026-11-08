import type { TextStyle } from 'react-native';

// docs/07 §3–4. Everything here is the same in both themes.

// 4-point grid, plus the design's 20 pt screen gutter.
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  gutter: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10, // badges
  md: 14, // icon tiles
  lg: 22, // inputs, list rows
  xl: 26, // cards
  sheet: 34,
  full: 9999, // buttons, chips, avatars
} as const;

// Outfit, loaded at launch (app/_layout.tsx). One font file per weight, so each style names
// its file instead of setting fontWeight (Android can't synthesise weights from one file).
export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

export const typography = {
  hero: { fontFamily: fonts.bold, fontSize: 48, lineHeight: 52, letterSpacing: -2 },
  display: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  title1: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 30, letterSpacing: -0.6 },
  title2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
  title3: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  callout: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
  calloutStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  overline: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>;
export type TextVariant = keyof typeof typography;

// Durations in ms (docs/07 principle 5). Off under Reduce Motion.
export const motion = { fast: 150, base: 250 } as const;

// ≥ 44×44 pt for anything tappable.
export const MIN_TOUCH_TARGET = 44;
