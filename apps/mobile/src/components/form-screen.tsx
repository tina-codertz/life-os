import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWash } from '@/components/screen';
import { Mascot, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

// Layout for the auth and onboarding forms (the design's Sign in screen): optional Life OS
// logo row, big title, intro, then fields. Scrolls, keeps the focused field above the keyboard
// (iOS insets; Android resizes the window), and lets taps reach buttons while the keyboard is
// open.
export function FormScreen({
  title,
  intro,
  brand = false,
  children,
}: {
  title: string;
  intro?: string;
  // Lio and "Life OS" above the title, as on the design's Sign in screen.
  brand?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
      <ScreenWash />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.gutter,
          gap: spacing.xl,
        }}
      >
        {brand && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Mascot mood="happy" height={52} decorative />
            <Text variant="title2">Life OS</Text>
          </View>
        )}
        <View style={{ gap: spacing.xs + 2 }}>
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
          {intro && <Text tone="secondary">{intro}</Text>}
        </View>
        <View style={{ gap: spacing.lg }}>{children}</View>
      </ScrollView>
    </View>
  );
}
