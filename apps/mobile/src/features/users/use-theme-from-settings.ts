import { useEffect } from 'react';
import { useSession } from '@/features/auth/session';
import { useThemePreference } from '@/theme';
import { useMe } from './queries';

// The theme is a server setting (FR-SET-002), so it follows the user to a new phone. Once the
// signed-in user's settings load (or come from the saved cache), apply their choice.
export function useThemeFromSettings(): void {
  const { status } = useSession();
  const { setPreference } = useThemePreference();
  const theme = useMe({ enabled: status === 'signedIn' }).data?.settings.theme;
  useEffect(() => {
    if (theme) setPreference(theme);
  }, [theme, setPreference]);
}
