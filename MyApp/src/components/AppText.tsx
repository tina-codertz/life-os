import { StyleSheet, Text, type TextProps } from "react-native";
import { colors, typography } from "@/theme";

type Variant = keyof typeof typography;

type Props = TextProps & {
  variant?: Variant;
};

export function AppText({ variant = "body", style, ...rest }: Props) {
  return <Text style={[typography[variant], styles[variant], style]} {...rest} />;
}

// Colour per variant; size and weight come from the typography tokens.
const styles = StyleSheet.create({
  title: { color: colors.textPrimary },
  heading: { color: colors.textPrimary },
  body: { color: colors.textPrimary },
  caption: { color: colors.textSecondary },
  link: { color: colors.accentGreen },
});
