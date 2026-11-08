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
  // A tappable card is a button by default; 'radio' for one choice in a list (with `selected`).
  accessibilityRole?: 'button' | 'radio';
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean };
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// A container that takes children, not content props (title, icon…): what goes inside is up
// to the screen. White "glass" cards on the canvas, lifted by a soft shadow in light mode.
const BASE: ViewStyle = {
  padding: spacing.lg,
  borderRadius: radius.xl,
  borderCurve: 'continuous',
  gap: spacing.sm,
};

const VARIANT: Record<CardVariant, (theme: Theme) => ViewStyle> = {
  surface: ({ colors, shadows }) => ({ backgroundColor: colors.bg.surface, boxShadow: shadows.md }),
  elevated: ({ colors, shadows }) => ({
    backgroundColor: colors.bg.surface,
    boxShadow: shadows.lg,
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
  accessibilityRole = 'button',
  accessibilityState,
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
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      {...(accessibilityState ? { accessibilityState } : {})}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        ...base,
        { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
