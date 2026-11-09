import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { spacing } from '@/theme';

// A label over a wrapping row of chips, announced as one group of choices.
export function ChoiceGroup({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="label">
        {label}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
      >
        {children}
      </View>
      {error && (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      )}
    </View>
  );
}
