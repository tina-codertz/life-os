import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

// Pieces shared by the three History views, as in the design.

// The white card with "Completed · …", a badge and the big number.
export function SummaryCard({
  caption,
  badge,
  total,
  children,
}: {
  caption: string;
  badge?: string | undefined;
  total: number;
  children?: ReactNode;
}) {
  const { colors, shadows } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.bg.surface,
        boxShadow: shadows.md,
        borderRadius: radius.xl + 2,
        borderCurve: 'continuous',
        padding: spacing.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="callout" tone="secondary">
          {caption}
        </Text>
        {badge && <Badge text={badge} />}
      </View>
      {children === undefined ? (
        <Text variant="stat" accessibilityLabel={`${total} completed`}>
          {total.toLocaleString('en-GB')}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

// The amber badge ("+9 vs last week", "Best: Oct").
export function Badge({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.reward.fill,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xs + 1,
      }}
    >
      <Text variant="label" style={{ color: colors.reward.text, fontSize: 13, lineHeight: 16 }}>
        {text}
      </Text>
    </View>
  );
}

// The green "5 done" badge on a day.
export function DoneBadge({ count }: { count: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.success.soft,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xs,
      }}
    >
      <Text variant="label" style={{ color: colors.success.default, fontSize: 13, lineHeight: 16 }}>
        {count} done
      </Text>
    </View>
  );
}

// A white card with a bold heading ("By week", "Best months").
export function ListCard({ title, children }: { title?: string; children: ReactNode }) {
  const { colors, shadows } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.bg.surface,
        boxShadow: shadows.md,
        borderRadius: radius.xl,
        borderCurve: 'continuous',
        padding: spacing.lg - 2,
      }}
    >
      {title && (
        <Text variant="title3" accessibilityRole="header" style={{ marginBottom: 2 }}>
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border.subtle }} />;
}

// A thin progress bar ("By week", "Best months").
export function ProgressBar({ fraction, strong }: { fraction: number; strong: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.chart.track }}>
      <View
        style={{
          width: `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`,
          height: 8,
          borderRadius: 4,
          backgroundColor: strong ? colors.ink.fill : colors.chart.barStrong,
        }}
      />
    </View>
  );
}
