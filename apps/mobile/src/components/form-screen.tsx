import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { spacing } from '@/theme';

// Layout for the auth forms: title, optional intro, fields. Scrolls, keeps the focused field
// above the keyboard (iOS insets; Android resizes the window), and lets taps reach buttons
// while the keyboard is open.
export function FormScreen({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.lg,
        gap: spacing.xl,
      }}
    >
      <View style={{ gap: spacing.sm }}>
        <Text variant="title1" accessibilityRole="header">
          {title}
        </Text>
        {intro && <Text tone="secondary">{intro}</Text>}
      </View>
      <View style={{ gap: spacing.lg }}>{children}</View>
    </ScrollView>
  );
}
