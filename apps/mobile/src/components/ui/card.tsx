import type { ReactNode } from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';
import { radius, spacing, type Theme, useTheme } from '@/theme';

export type CardVariant = 'surface' | 'elevated' | 'outlined';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  // Makes the whole card tappable; give it an accessibilityLabel describing the action.
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// A container that takes children, not content props (title, icon…): what goes inside is up
// to the screen. Depth comes from the surface colour, plus a shadow in light mode.
const BASE: ViewStyle = {
  padding: spacing.lg,
  borderRadius: radius.lg,
  borderCurve: 'continuous',
  gap: spacing.sm,
};

const VARIANT: Record<CardVariant, (theme: Theme) => ViewStyle> = {
  surface: ({ colors, shadows }) => ({ backgroundColor: colors.bg.surface, boxShadow: shadows.sm }),
  elevated: ({ colors, shadows }) => ({
    backgroundColor: colors.bg.elevated,
    boxShadow: shadows.md,
  }),
  outlined: ({ colors }) => ({
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  }),
};

export function Card({
  children,
  variant = 'surface',
  onPress,
  accessibilityLabel,
  style,
  testID,
}: CardProps) {
  const theme = useTheme();
  const base = [BASE, VARIANT[variant](theme)];

  if (!onPress) {
    return (
      <View style={[...base, style]} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [...base, { opacity: pressed ? 0.85 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}
