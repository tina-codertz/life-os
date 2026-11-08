import type { CategoryColor } from '@life-os/shared';

// Semantic colors from docs/07 §2.2. Components use these names, never hex values.
// Contrast ratios are checked in colors.test.ts (WCAG AA).
export interface ThemeColors {
  bg: { canvas: string; surface: string; elevated: string; subtle: string };
  border: { subtle: string };
  text: { primary: string; secondary: string; inverse: string; onAccent: string };
  accent: { default: string; fill: string; soft: string };
  success: { default: string; soft: string };
  danger: { text: string; fill: string };
  warning: { default: string };
  // Category palette (CATEGORY_COLORS): dots and accents, ≥ 3:1 against surfaces (non-text).
  category: Record<CategoryColor, string>;
}

export const darkColors: ThemeColors = {
  bg: { canvas: '#0E0E12', surface: '#1C1C22', elevated: '#26262E', subtle: '#16161B' },
  border: { subtle: '#2E2E37' },
  text: { primary: '#F5F5F7', secondary: '#9A9AA3', inverse: '#0E0E12', onAccent: '#FFFFFF' },
  accent: { default: '#8B7CFF', fill: '#6D4EF2', soft: 'rgba(139,124,255,0.16)' },
  success: { default: '#8FB339', soft: 'rgba(143,179,57,0.16)' },
  // Adjusted from docs/07 v0.1 after the contrast test: #E5566E text was 4.21:1 on elevated
  // (sheets), and white labels on #D9475F only 4.19:1. Both now pass AA on every background.
  danger: { text: '#EA6479', fill: '#C2334B' },
  warning: { default: '#F5B544' },
  category: {
    violet: '#8B7CFF',
    blue: '#5AA9FF',
    teal: '#3CC8C0',
    green: '#8FB339',
    amber: '#F5B544',
    orange: '#FF8A4C',
    red: '#EA6479',
    pink: '#F27FB8',
    gray: '#9A9AA3',
  },
};

export const lightColors: ThemeColors = {
  bg: { canvas: '#F7F7FA', surface: '#FFFFFF', elevated: '#FFFFFF', subtle: '#EFEFF4' },
  border: { subtle: '#E3E3EA' },
  text: { primary: '#0E0E12', secondary: '#5E5E68', inverse: '#FFFFFF', onAccent: '#FFFFFF' },
  accent: { default: '#5B3FE0', fill: '#5B3FE0', soft: 'rgba(91,63,224,0.10)' },
  success: { default: '#17784C', soft: 'rgba(23,120,76,0.10)' },
  danger: { text: '#C2334B', fill: '#C2334B' },
  warning: { default: '#9A6200' },
  category: {
    violet: '#5B3FE0',
    blue: '#1F6FD1',
    teal: '#0E8A84',
    green: '#17784C',
    amber: '#9A6200',
    orange: '#C2510F',
    red: '#C2334B',
    pink: '#B8327A',
    gray: '#5E5E68',
  },
};
