
import { Pressable, StyleSheet, type PressableProps } from "react-native";
import { AppText } from "./AppText";
import { colors, radius, spacing } from "@/theme";

type ButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'ghost';
};

export function Button({
  label,
  variant = 'primary',
  style,
  ...props

}: ButtonProps) {
  return (
    <Pressable
      {...props}
      style={(state) => [
        styles.button,
        variant === 'primary'
          ? styles.primary
          : styles.ghost,
        state.pressed && styles.pressed,
        typeof style === 'function'
          ? style(state): style,
      ]}
    >
      <AppText
        color={
          variant === 'primary'
            ? 'bg'
            : 'textPrimary'
        }
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent:"center",
  },
  primary: {
    backgroundColor:colors.accentGreen

  },
  ghost: {
    backgroundColor: "transparent",
  },
  pressed: {
    opacity:0.7
  },
})
