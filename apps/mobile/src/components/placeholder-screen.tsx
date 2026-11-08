import type { ReactNode } from 'react';
import { Screen } from '@/components/screen';
import { Card, Mascot, Text } from '@/components/ui';
import { spacing } from '@/theme';

// Stand-in for screens whose real content comes in later steps (Calendar, Money). Same
// header as the finished screens, and a card saying what will be here.
export function PlaceholderScreen({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Screen title={title}>
      <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        <Mascot mood="planning" height={96} decorative />
        <Text variant="title3" style={{ textAlign: 'center' }}>
          Coming soon
        </Text>
        <Text variant="callout" tone="secondary" style={{ textAlign: 'center' }}>
          {description}
        </Text>
      </Card>
      {children}
    </Screen>
  );
}
