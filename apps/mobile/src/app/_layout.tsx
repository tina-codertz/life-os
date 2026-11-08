import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/theme';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedStack />
    </ThemeProvider>
  );
}

// Inside the provider, so screen backgrounds follow the theme. The status bar's "auto"
// follows Appearance, which ThemeProvider sets from the user's choice.
function ThemedStack() {
  const { colors } = useTheme();
  return (
    <>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg.canvas } }}
      />
      <StatusBar style="auto" />
    </>
  );
}
