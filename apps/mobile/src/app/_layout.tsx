import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SessionProvider, useSession, areaFor } from '@/features/auth/session';
import { ThemeProvider, useTheme } from '@/theme';

// Keep the splash screen up until we know whether someone is signed in (5.4 reads the
// stored session at launch), so nobody sees the wrong screen flash first.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </ThemeProvider>
  );
}

// The auth gate. Each group is only reachable while its guard is true; navigating to a route
// whose guard is false redirects to "/", which sends the user to their area's first screen.
function RootNavigator() {
  const { colors } = useTheme();
  const session = useSession();
  const area = areaFor(session);

  useEffect(() => {
    if (area) SplashScreen.hide();
  }, [area]);

  if (!area) return null;
  return (
    <>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.canvas } }}
      >
        <Stack.Screen name="index" />
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
      <StatusBar style="auto" />
    </>
  );
}
