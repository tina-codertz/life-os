import { ActivityIndicator, Pressable, type StyleProp, View, type ViewStyle } from 'react-native';
import { MIN_TOUCH_TARGET, radius, spacing, type Theme, useTheme } from '@/theme';
import { Icon, type IconName } from './icon';
import { Text, type TextTone, toneColor } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  // An icon after the title, e.g. "Sign in →" or "Create task ✓".
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  // Layout only (margins, flex, width). Colours come from the variant.
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// primary: the ink pill, one per screen. secondary: a white pill with a soft shadow.
// ghost: a text link. destructive: red, for deleting.
const VARIANT: Record<
  ButtonVariant,
  (theme: Theme) => { bg: string; tone: TextTone; shadow?: string }
> = {
  primary: ({ colors }) => ({ bg: colors.ink.fill, tone: 'onInk' }),
  secondary: ({ colors, shadows }) => ({
    bg: colors.bg.surface,
    tone: 'primary',
    shadow: shadows.sm,
  }),
  ghost: () => ({ bg: 'transparent', tone: 'accent' }),
  destructive: ({ colors }) => ({ bg: colors.danger.fill, tone: 'onAccent' }),
};

const SIZES = {
  sm: { minHeight: 40, paddingHorizontal: spacing.lg },
  md: { minHeight: 52, paddingHorizontal: spacing.xl },
  lg: { minHeight: 56, paddingHorizontal: spacing.xl },
} as const;

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const { bg, tone, shadow } = VARIANT[variant](theme);
  const inactive = disabled || loading;
  const contentColor = toneColor(tone, theme.colors);

  return (
    <Pressable
      accessibilityRole="button"
      // The title stays the label while the spinner replaces it.
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      // Small buttons still get a 44 pt tap area.
      hitSlop={size === 'sm' ? (MIN_TOUCH_TARGET - SIZES.sm.minHeight) / 2 : undefined}
      style={({ pressed }) => [
        {
          ...SIZES[size],
          flexDirection: 'row',
          gap: spacing.sm,
          backgroundColor: bg,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          ...(shadow && shadow !== 'none' ? { boxShadow: shadow } : {}),
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <ActivityIndicator color={contentColor} />
        </View>
      ) : (
        <>
          <Text variant={size === 'sm' ? 'label' : 'bodyStrong'} tone={tone}>
            {title}
          </Text>
          {icon && <Icon name={icon} size={18} color={contentColor} />}
        </>
      )}
    </Pressable>
  );
}
