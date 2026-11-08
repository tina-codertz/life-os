import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

// Signed in and onboarded. Tabs at the root; detail screens get pushed over them.
export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.bg.canvas } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="design-preview" options={{ title: 'Design system' }} />
    </Stack>
  );
}
