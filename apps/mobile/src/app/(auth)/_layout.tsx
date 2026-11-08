import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

// Welcome has no header; the forms get a transparent native header for the back button only
// (the title is in the screen, large, over the wash).
export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        title: '',
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTransparent: true,
        headerTintColor: colors.text.primary,
        contentStyle: { backgroundColor: colors.bg.canvas },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
    </Stack>
  );
}
