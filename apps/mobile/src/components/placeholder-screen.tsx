import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { spacing } from '@/theme';

// Stand-in for screens whose real content comes in later steps (5.5, 5.7, Phase 6). Gives
// every route a title, a line saying what will be here, and room for test actions.
export function PlaceholderScreen({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.lg,
        gap: spacing.lg,
      }}
    >
      <Text variant="title1" accessibilityRole="header">
        {title}
      </Text>
      <Text tone="secondary">{description}</Text>
      {children}
    </ScrollView>
  );
}
