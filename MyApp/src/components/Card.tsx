import { colors, radius, spacing } from "@/theme";
import { Pressable, type PressableProps, View, type ViewProps,StyleSheet } from "react-native";


type CardProps = {
  children: React.ReactNode;
  onPress?: PressableProps['onPress'];
  style?: ViewProps["style"];
};

export function Card({ children, onPress, style }: CardProps) {
  const cardStyle = [styles.card, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={cardStyle}
      >
        {children}
      </Pressable>
    )
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding:spacing.lg,

  },
});
