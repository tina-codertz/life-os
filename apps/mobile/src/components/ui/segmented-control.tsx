import { Pressable, View } from 'react-native';
import { MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import { Text } from './text';

export interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

// The pill switch from the design (Sign in | Create account, Day | Week | Month). Announced as
// tabs, with the selected one marked.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors, shadows } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        gap: spacing.xs,
        padding: spacing.xs,
        borderRadius: radius.full,
        backgroundColor: colors.bg.surface,
        boxShadow: shadows.sm,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            style={{
              flex: 1,
              minHeight: MIN_TOUCH_TARGET - 4,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.ink.fill : 'transparent',
            }}
          >
            <Text variant="calloutStrong" tone={selected ? 'onInk' : 'secondary'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
