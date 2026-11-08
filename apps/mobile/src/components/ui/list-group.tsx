import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { radius, spacing, useTheme } from '@/theme';
import { Icon, type IconName } from './icon';
import { IconTile } from './icon-tile';
import { Text, type TextTone } from './text';

// A white card holding settings-style rows (docs/07 ListItem): New task's Due date / Time rows,
// Settings' Appearance / Time zone rows. Rows sit close together, no dividers.
export function ListGroup({ children }: { children: ReactNode }) {
  const { colors, shadows } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.bg.surface,
        boxShadow: shadows.md,
        borderRadius: radius.xl,
        borderCurve: 'continuous',
        padding: spacing.sm,
        gap: spacing.xxs,
      }}
    >
      {children}
    </View>
  );
}

export interface ListRowProps {
  icon: IconName;
  tint?: string;
  title: string;
  // Shown on the right, e.g. "Today" or "Dar es Salaam".
  value?: string;
  tone?: Extract<TextTone, 'primary' | 'danger'>;
  // Tappable rows get a chevron and are announced as buttons, with the value in the label.
  onPress?: () => void;
  accessibilityHint?: string;
  // Extra content under the row (e.g. the date chips under Due date).
  children?: ReactNode;
  testID?: string;
}

export function ListRow({
  icon,
  tint,
  title,
  value,
  tone = 'primary',
  onPress,
  accessibilityHint,
  children,
  testID,
}: ListRowProps) {
  const { colors } = useTheme();
  const row = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 }}>
      <IconTile
        icon={icon}
        tint={tint ?? (tone === 'danger' ? colors.danger.soft : colors.tile.neutral)}
        {...(tone === 'danger' ? { iconColor: colors.danger.text } : {})}
      />
      <Text variant="bodyStrong" tone={tone} style={{ flex: 1 }}>
        {title}
      </Text>
      {value !== undefined && (
        <Text variant="callout" tone="secondary" style={{ flexShrink: 1, textAlign: 'right' }}>
          {value}
        </Text>
      )}
      {onPress && <Icon name="chevronRight" size={16} color={colors.text.secondary} />}
    </View>
  );

  return (
    <View style={{ gap: spacing.sm }} testID={testID}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={value ? `${title}, ${value}` : title}
          {...(accessibilityHint ? { accessibilityHint } : {})}
          onPress={onPress}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          {row}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={value ? `${title}, ${value}` : title}>
          {row}
        </View>
      )}
      {children}
    </View>
  );
}
