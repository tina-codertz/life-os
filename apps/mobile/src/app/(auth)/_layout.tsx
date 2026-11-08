import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

// Welcome has no header; the forms get a native header for the back button only (the title
// is in the screen, large).
export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        title: '',
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.accent.default,
        headerStyle: { backgroundColor: colors.bg.canvas },
        contentStyle: { backgroundColor: colors.bg.canvas },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
    </Stack>
  );
}
