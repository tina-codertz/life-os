import { StyleSheet, Text, View } from "react-native";
import { colors, type PastelKey } from "@/theme";

type Props = {
  emoji: string;
  // A token key ("pastelPink"), never a hex value, so stored habit colours survive theme changes.
  color: PastelKey;
  size?: number;
};

export function IconTile({ emoji, color, size = 48 }: Props) {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.3, backgroundColor: colors[color] },
      ]}
    >
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
  },
});
