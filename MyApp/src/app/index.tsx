import { Text, View, StyleSheet } from "react-native";
import { colors } from "@/theme"
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Edit src/app/index.tsx to edit this screen.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  text: {
    color: colors.pastelGreen
  },
});
