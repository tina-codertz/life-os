import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, spacing } from "@/theme";
import { AppText } from "./AppText";

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = "primary", style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, style]}
    >
      <AppText variant="heading" style={variant === "ghost" && styles.ghostText}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  primary: {
    backgroundColor: colors.accentRed,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.surfaceRaised,
  },
  ghostText: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
});
