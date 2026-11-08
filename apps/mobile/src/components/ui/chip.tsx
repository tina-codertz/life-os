import { Pressable, View } from 'react-native';
import { MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  // Background when not selected: a pastel (category, priority) or the default grey.
  tint?: string;
  // A small colour dot before the label. Never the only signal: the label says it.
  dotColor?: string;
  icon?: IconName;
  // 'single': one choice in a group (a radio, the default). 'multiple': an on/off toggle that
  // can be combined with others (a checkbox).
  mode?: 'single' | 'multiple';
}

const HEIGHT = 40;

// Compact choice for filters and pickers (docs/07 Chip): a pill that turns ink when selected.
// The state is also announced (`selected` / `checked`), not just shown by colour.
export function Chip({
  label,
  selected,
  onPress,
  tint,
  dotColor,
  icon,
  mode = 'single',
}: ChipProps) {
  const { colors } = useTheme();
  const role = mode === 'single' ? 'radio' : 'checkbox';
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={
        role === 'radio' ? { selected, checked: selected } : { checked: selected }
      }
      onPress={onPress}
      hitSlop={(MIN_TOUCH_TARGET - HEIGHT) / 2}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
        minHeight: HEIGHT,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.full,
        backgroundColor: selected ? colors.ink.fill : (tint ?? colors.bg.subtle),
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {dotColor && (
        <View
          style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: dotColor }}
        />
      )}
      {icon && (
        <Icon name={icon} size={16} color={selected ? colors.ink.text : colors.text.primary} />
      )}
      <Text variant="calloutStrong" tone={selected ? 'onInk' : 'primary'}>
        {label}
      </Text>
    </Pressable>
  );
}
