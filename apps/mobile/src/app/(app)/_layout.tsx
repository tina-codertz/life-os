import { Stack } from 'expo-router';
import { sheetOptions } from '@/components/sheet';
import { useTheme } from '@/theme';

// Signed in and onboarded. Tabs at the root; detail screens get pushed over them.
export default function AppLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.bg.canvas } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="design-preview"
        options={{ title: 'Design system', headerTintColor: colors.text.primary }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: '',
          headerTransparent: true,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: colors.text.primary,
        }}
      />
      <Stack.Screen name="sheet-demo" options={sheetOptions([0.5, 1], colors.bg.elevated)} />
      <Stack.Screen name="task-form" options={sheetOptions([0.85, 1], colors.bg.elevated)} />
      <Stack.Screen name="habit-form" options={sheetOptions([0.9, 1], colors.bg.elevated)} />
    </Stack>
  );
}
