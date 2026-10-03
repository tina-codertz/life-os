import { colors, spacing } from "@/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, type ViewProps } from "react-native";

type ScreenProps = ViewProps;

export function Screen({ style, children, ...props }: ScreenProps) {
  return (
    <SafeAreaView
      style={[styles.container, style]}
      {...props}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal:spacing.lg
  }
})
