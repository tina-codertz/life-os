import type { CategoryColor } from '@life-os/shared';

// Semantic colors from docs/07 §2.2 (the "light playful" design, Nov 2026). Components use these
// names, never hex values. Contrast ratios are checked in colors.test.ts (WCAG AA).
export interface ThemeColors {
  // canvas: app background. wash: the soft colour fading in at the top of each screen.
  // surface: cards and inputs. elevated: sheets. subtle: unselected chips, skeletons.
  bg: { canvas: string; wash: string; surface: string; elevated: string; subtle: string };
  border: { subtle: string };
  // label: field labels and small strong captions (darker than secondary).
  text: { primary: string; secondary: string; label: string; inverse: string; onAccent: string };
  // The main call to action: a near-black pill in light mode, a near-white one in dark mode.
  ink: { fill: string; text: string };
  // Links and highlights (violet). fill/fillEnd: the hero gradient.
  accent: { default: string; fill: string; fillEnd: string; soft: string; onSoft: string };
  success: { default: string; soft: string };
  danger: { text: string; fill: string; soft: string };
  // Amber: badges and rewards; text on it uses reward.text.
  reward: { fill: string; text: string };
  // Pastel tiles behind icons and chips; text on them is text.primary or text.label.
  tile: {
    sky: string;
    lime: string;
    peach: string;
    lavender: string;
    rose: string;
    neutral: string;
  };
  // Category palette (CATEGORY_COLORS): dots, ≥ 3:1 against surfaces (non-text)...
  category: Record<CategoryColor, string>;
  // ...and the pastel behind a category's chip or icon.
  categoryTile: Record<CategoryColor, string>;
  // History charts: bars (week view) and the five heatmap steps, none → most, each with the
  // text colour that reads on it.
  chart: { bar: string; barStrong: string; track: string };
  heat: {
    fill: [string, string, string, string, string];
    text: [string, string, string, string, string];
  };
}

export const lightColors: ThemeColors = {
  bg: {
    canvas: '#F3F4F9',
    wash: '#D3DFEF',
    surface: '#FFFFFF',
    elevated: '#F8F9FC',
    subtle: '#ECEEF3',
  },
  border: { subtle: '#E3E5EC' },
  text: {
    primary: '#0F0F14',
    // The design's muted grey: 4.6:1 on the canvas, so never on the darker subtle/tile colours.
    secondary: '#6B6F7B',
    label: '#4F5560',
    inverse: '#FFFFFF',
    onAccent: '#FFFFFF',
  },
  ink: { fill: '#0F0F14', text: '#FFFFFF' },
  // onSoft is darker than the design's #5A57EE, which was 4.1:1 on lavender (needs 4.5).
  accent: {
    default: '#5A57EE',
    fill: '#5A57EE',
    fillEnd: '#7C5CE8',
    soft: '#E4E0FB',
    onSoft: '#4744C9',
  },
  // Darker than the design's #1E8A4F (4.0:1 on the canvas).
  success: { default: '#17784C', soft: '#DDF1E4' },
  // Darker than the design's #D2405B (3.6:1 on its own pink tile).
  danger: { text: '#B42F4A', fill: '#C2334B', soft: '#FBDDE2' },
  reward: { fill: '#F6C85F', text: '#3A2A00' },
  tile: {
    sky: '#D5E3EA',
    lime: '#E5EFC1',
    peach: '#FBE2D2',
    lavender: '#E4E0FB',
    rose: '#FBDDE2',
    neutral: '#ECEEF3',
  },
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
  categoryTile: {
    violet: '#E4E0FB',
    blue: '#D5E3EA',
    teal: '#D3EEEA',
    green: '#E5EFC1',
    amber: '#FBEFCF',
    orange: '#FBE2D2',
    red: '#FBDDE2',
    pink: '#FADDEB',
    gray: '#ECEEF3',
  },
  chart: { bar: '#E5EFC1', barStrong: '#BCD66C', track: '#E9EAEE' },
  // The design's greens; the darkest is a touch darker than its #5E8A1F (white text was 4.1:1).
  heat: {
    fill: ['#F1F2F5', '#EEF5D6', '#DCEAA8', '#BCD66C', '#4F7A1A'],
    text: ['#0F0F14', '#0F0F14', '#0F0F14', '#0F0F14', '#FFFFFF'],
  },
};

// The design is light only; this is its night version, built from the same roles.
export const darkColors: ThemeColors = {
  bg: {
    canvas: '#0F1015',
    wash: '#1B2233',
    surface: '#1A1B23',
    elevated: '#20212A',
    subtle: '#272934',
  },
  border: { subtle: '#2C2E3A' },
  text: {
    primary: '#F4F5F9',
    secondary: '#A0A4B2',
    label: '#C2C5D0',
    inverse: '#0F0F14',
    onAccent: '#FFFFFF',
  },
  ink: { fill: '#F4F5F9', text: '#0F0F14' },
  accent: {
    default: '#A9A6FF',
    fill: '#5A57EE',
    fillEnd: '#7C5CE8',
    soft: '#2B2950',
    onSoft: '#C9C7FF',
  },
  success: { default: '#5FD38D', soft: '#1D3328' },
  danger: { text: '#FF8A9C', fill: '#C2334B', soft: '#3D2128' },
  reward: { fill: '#F6C85F', text: '#3A2A00' },
  tile: {
    sky: '#21313A',
    lime: '#2C3320',
    peach: '#3A2A22',
    lavender: '#2B2950',
    rose: '#3D2128',
    neutral: '#272934',
  },
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
  categoryTile: {
    violet: '#2B2950',
    blue: '#21313A',
    teal: '#1E3533',
    green: '#2C3320',
    amber: '#3A321E',
    orange: '#3A2A22',
    red: '#3D2128',
    pink: '#3A2232',
    gray: '#272934',
  },
  chart: { bar: '#2C3320', barStrong: '#52692A', track: '#272934' },
  heat: {
    fill: ['#23242D', '#2C3320', '#3B4A1F', '#52692A', '#9CC24A'],
    text: ['#F4F5F9', '#F4F5F9', '#F4F5F9', '#F4F5F9', '#0F0F14'],
  },
};
