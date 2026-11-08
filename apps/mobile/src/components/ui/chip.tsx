import { Pressable, View } from 'react-native';
import { MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import { Text } from './text';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  // A small colour dot before the label (category colour). Never the only signal: the label says it.
  dotColor?: string;
  // One choice in a group ('radio', the default) or an on/off toggle ('checkbox').
  role?: 'radio' | 'checkbox';
}

// Compact choice for filters and pickers (docs/07 Chip). Selected chips use the accent; the
// state is also announced (`selected` / `checked`), not just shown by colour.
export function Chip({ label, selected, onPress, dotColor, role = 'radio' }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={
        role === 'radio' ? { selected, checked: selected } : { checked: selected }
      }
      onPress={onPress}
      hitSlop={(MIN_TOUCH_TARGET - 34) / 2}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: 34,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        backgroundColor: selected ? colors.accent.soft : colors.bg.subtle,
        borderWidth: 1,
        borderColor: selected ? colors.accent.default : 'transparent',
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {dotColor && (
        <View
          style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: dotColor }}
        />
      )}
      <Text variant="callout" tone={selected ? 'accent' : 'primary'}>
        {label}
      </Text>
    </Pressable>
  );
}
