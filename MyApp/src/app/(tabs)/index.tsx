import { format } from "date-fns";
import { View } from "react-native";
import { AppText, Button, Card, IconTile, Screen } from "@/components";
import { spacing } from "@/theme";

export default function TodayScreen() {
  return (
    <Screen>
      <View>
        <AppText variant="caption">{format(new Date(), "EEEE, d MMMM")}</AppText>
        <AppText variant="title">Today</AppText>
      </View>
      <Card>
        <AppText variant="heading">Your Progress</AppText>
        <AppText variant="caption">0/0 habits · 0%</AppText>
      </Card>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <IconTile emoji="💧" color="pastelBlue" />
        <AppText>Habits and tasks land here in V1a</AppText>
      </Card>
      <Button title="Create habit" onPress={() => console.log("Create habit pressed")} />
    </Screen>
  );
}
