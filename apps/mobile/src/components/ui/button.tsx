import { ActivityIndicator, Pressable, type StyleProp, View, type ViewStyle } from 'react-native';
import { MIN_TOUCH_TARGET, radius, spacing, type Theme, useTheme } from '@/theme';
import { Text, type TextTone } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  // Layout only (margins, flex, width). Colours come from the variant.
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const VARIANT: Record<ButtonVariant, (theme: Theme) => { bg: string; tone: TextTone }> = {
  primary: ({ colors }) => ({ bg: colors.accent.fill, tone: 'onAccent' }),
  secondary: ({ colors }) => ({ bg: colors.accent.soft, tone: 'accent' }),
  ghost: () => ({ bg: 'transparent', tone: 'accent' }),
  destructive: ({ colors }) => ({ bg: colors.danger.fill, tone: 'onAccent' }),
};

const SIZES = {
  sm: { minHeight: 36, paddingHorizontal: spacing.md },
  md: { minHeight: MIN_TOUCH_TARGET, paddingHorizontal: spacing.lg },
  lg: { minHeight: 52, paddingHorizontal: spacing.xl },
} as const;

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const { bg, tone } = VARIANT[variant](theme);
  const inactive = disabled || loading;

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
          backgroundColor: bg,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <ActivityIndicator
            color={theme.colors.text[tone === 'onAccent' ? 'onAccent' : 'primary']}
          />
        </View>
      ) : (
        <Text variant={size === 'sm' ? 'callout' : 'bodyStrong'} tone={tone}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
