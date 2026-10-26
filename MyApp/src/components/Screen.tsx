import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Top edge only: inside the tabs the tab bar already handles the bottom inset.
export function Screen({ children, style }: Props) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
});
