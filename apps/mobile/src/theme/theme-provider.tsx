import type { Theme as ThemePreference } from '@life-os/shared';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type Theme } from './theme';

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference; // what the user chose: SYSTEM, DARK or LIGHT
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const OVERRIDE = { SYSTEM: 'unspecified', DARK: 'dark', LIGHT: 'light' } as const;

// The user's choice is applied through Appearance, so the whole app (our components *and*
// native ones: keyboard, alerts, status bar) follows it. SYSTEM hands control back to iOS /
// Android. Until settings sync with the server (5.6/5.7), the choice lives in memory.
export function ThemeProvider({
  children,
  initialPreference = 'SYSTEM',
}: {
  children: ReactNode;
  initialPreference?: ThemePreference;
}) {
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  useEffect(() => {
    Appearance.setColorScheme(OVERRIDE[preference]);
  }, [preference]);

  // Worked out from the preference directly (not only from Appearance), so the very first
  // render is already right. Unknown system scheme → light (the Nov 2026 design is light-first).
  const systemScheme = useColorScheme();
  const isDark = preference === 'DARK' || (preference === 'SYSTEM' && systemScheme === 'dark');
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

export function useThemePreference(): Pick<ThemeContextValue, 'preference' | 'setPreference'> {
  const { preference, setPreference } = useThemeContext();
  return { preference, setPreference };
}

function useThemeContext(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme() must be used inside <ThemeProvider>');
  return value;
}
