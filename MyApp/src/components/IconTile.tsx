import { radius, pastelColors, type PastelKey } from "@/theme";
import { StyleSheet, Text, View } from "react-native";


type IconTileProps = {
  emoji: string;
  color: PastelKey;

};

export function IconTile({
  emoji,
  color,
}: IconTileProps) {
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: pastelColors[color] },
      ]}

    >
      <Text style={styles.emoji}>{emoji}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  tile: {
    width: 48,
    height: 48,
    borderRadius: radius.card,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 24,
  },
})
