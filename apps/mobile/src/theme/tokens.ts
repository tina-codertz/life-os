import type { TextStyle } from 'react-native';

// docs/07 §3–4. Everything here is the same in both themes.

// 4-point grid. Screen gutter = lg.
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8, // chips, inputs
  md: 12, // buttons
  lg: 16, // cards
  xl: 24, // sheets
  full: 9999, // avatars, check circles
} as const;

// System font (SF / Roboto) for now; Inter is Proposed in docs/07.
export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  title3: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  callout: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>;
export type TextVariant = keyof typeof typography;

// Durations in ms (docs/07 principle 5). Off under Reduce Motion.
export const motion = { fast: 150, base: 250 } as const;

// ≥ 44×44 pt for anything tappable.
export const MIN_TOUCH_TARGET = 44;
