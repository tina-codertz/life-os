import { AppText } from "@/components/AppText";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme";
import { StyleSheet } from "react-native";

export default function Index() {
  return (
    <Screen style={styles.container}>
      <AppText color="accentGreen">
        Hello World
      </AppText>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",

  },
});
