import { Outfit_400Regular } from '@expo-google-fonts/outfit/400Regular';
import { Outfit_500Medium } from '@expo-google-fonts/outfit/500Medium';
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { Outfit_700Bold } from '@expo-google-fonts/outfit/700Bold';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { OfflineBanner } from '@/components/offline-banner';
import { ToastProvider } from '@/components/ui';
import { useEffect } from 'react';
import { SessionProvider, useSession, areaFor } from '@/features/auth/session';
import { showNotificationsInApp } from '@/features/reminders/notifications';
import { useThemeFromSettings } from '@/features/users/use-theme-from-settings';
import { QueryProvider } from '@/services/query-provider';
import { fonts, ThemeProvider, useTheme } from '@/theme';

// Keep the splash screen up until we know whether someone is signed in (5.4 reads the
// stored session at launch) and the font has loaded, so nobody sees the wrong screen, or text
// jumping from the system font to Outfit, flash first.
void SplashScreen.preventAutoHideAsync();
// Habit reminders that arrive while the app is open are shown too.
showNotificationsInApp();

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <QueryProvider>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </QueryProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

const LINK_SCREEN = { headerShown: true, title: '', headerShadowVisible: false } as const;

// The auth gate. Each group is only reachable while its guard is true; navigating to a route
// whose guard is false redirects to "/", which sends the user to their area's first screen.
function RootNavigator() {
  const { colors } = useTheme();
  const session = useSession();
  const area = areaFor(session);
  useThemeFromSettings();
  // Only the four weights the type ramp uses (tokens.ts). If loading fails, text falls back
  // to the system font rather than keeping the app closed.
  const [fontsLoaded, fontError] = useFonts({
    [fonts.regular]: Outfit_400Regular,
    [fonts.medium]: Outfit_500Medium,
    [fonts.semibold]: Outfit_600SemiBold,
    [fonts.bold]: Outfit_700Bold,
  });
  const ready = area !== null && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;
  return (
    <>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.canvas } }}
      >
        <Stack.Screen name="index" />
        {/* Links from emails: open in any state, so they sit outside the guards. */}
        <Stack.Screen name="verify-email" options={LINK_SCREEN} />
        <Stack.Screen name="confirm-email-change" options={LINK_SCREEN} />
        <Stack.Screen name="reset-password" options={LINK_SCREEN} />
        <Stack.Protected guard={area === 'auth'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={area === 'onboarding'}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={area === 'app'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
      <OfflineBanner />
      <StatusBar style="auto" />
    </>
  );
}
