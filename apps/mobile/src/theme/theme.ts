import { darkColors, lightColors, type ThemeColors } from './colors';

export type ColorScheme = 'dark' | 'light';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  // Dark mode shows depth with lighter surfaces; light mode with shadows (docs/07 §4).
  shadows: { sm: string; md: string; lg: string };
}

const NO_SHADOW = 'none';

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  shadows: { sm: NO_SHADOW, md: NO_SHADOW, lg: NO_SHADOW },
};

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
    md: '0 4px 12px rgba(0, 0, 0, 0.10)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
};
