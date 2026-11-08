import type { Theme as ThemePreference } from '@life-os/shared';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { ThemeProvider } from '@/theme';

// Renders inside the ThemeProvider, like the real app. Async, like RNTL 14's render: await it. DARK by default, so tests don't depend
// on the test machine's system theme.
export function renderWithTheme(ui: ReactElement, preference: ThemePreference = 'DARK') {
  return render(<ThemeProvider initialPreference={preference}>{ui}</ThemeProvider>);
}
