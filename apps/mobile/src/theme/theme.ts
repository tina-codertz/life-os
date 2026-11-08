import { darkColors, lightColors, type ThemeColors } from './colors';

export type ColorScheme = 'dark' | 'light';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  // sm: inputs, chips, round buttons. md: cards. lg: the tab bar and floating buttons.
  // Light mode lifts things with soft blue-grey shadows; dark mode mostly with lighter surfaces.
  shadows: { sm: string; md: string; lg: string };
}

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  shadows: {
    sm: '0 6px 16px rgba(40, 50, 90, 0.10)',
    md: '0 12px 32px rgba(40, 50, 90, 0.10)',
    lg: '0 12px 32px rgba(40, 50, 90, 0.16)',
  },
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  shadows: {
    sm: 'none',
    md: 'none',
    lg: '0 12px 32px rgba(0, 0, 0, 0.45)',
  },
};
