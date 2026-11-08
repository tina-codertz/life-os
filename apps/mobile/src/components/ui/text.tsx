import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { type ThemeColors, type TextVariant, typography, useTheme } from '@/theme';

export type TextTone = 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'onAccent';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
}

// A Record, so adding a tone without a colour is a type error.
const TONE_COLOR: Record<TextTone, (colors: ThemeColors) => string> = {
  primary: (c) => c.text.primary,
  secondary: (c) => c.text.secondary,
  accent: (c) => c.accent.default,
  success: (c) => c.success.default,
  danger: (c) => c.danger.text,
  onAccent: (c) => c.text.onAccent,
};

// All text in the app goes through this: sizes from the type ramp, colours from the theme.
// Text scales with the user's font-size setting, up to 2× (docs/07 §3); layouts must wrap.
export function Text({ variant = 'body', tone = 'primary', style, ...props }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={2}
      {...props}
      style={[typography[variant], { color: TONE_COLOR[tone](colors) }, style]}
    />
  );
}
