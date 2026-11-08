import type { ReactNode } from 'react';
import { View } from 'react-native';
import { spacing } from '@/theme';
import { Button } from './button';
import { Mascot, type MascotMood } from './mascot';
import { Text } from './text';

export interface EmptyStateProps {
  title: string;
  description?: string;
  // e.g. { label: 'Add your first habit', onPress } (docs/07 §6: a contextual next step).
  action?: { label: string; onPress: () => void };
  icon?: ReactNode;
  // Lio instead of an icon: asleep for "nothing yet", the design's empty state.
  mascot?: MascotMood;
}

// "Loaded, and there's nothing here yet", with what to do about it. Not for loading (Skeleton)
// or failures (ErrorState): an empty list must never be shown while data is still coming.
export function EmptyState({ title, description, action, icon, mascot }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
      {mascot ? <Mascot mood={mascot} height={84} decorative /> : icon}
      <Text variant="title3" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {description && (
        <Text variant="callout" tone="secondary" style={{ textAlign: 'center', maxWidth: 280 }}>
          {description}
        </Text>
      )}
      {action && (
        <Button
          title={action.label}
          icon="add"
          onPress={action.onPress}
          style={{ marginTop: spacing.sm, alignSelf: 'stretch' }}
        />
      )}
    </View>
  );
}
