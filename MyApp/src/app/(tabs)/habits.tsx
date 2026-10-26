import { AppText, Button, Card, IconTile, Screen } from "@/components";

export default function HabitsScreen() {
  return (
    <Screen>
      <AppText variant="title">Habits</AppText>
      <Card style={{ alignItems: "center" }}>
        <IconTile emoji="🐣" color="pastelGreen" size={80} />
        <AppText variant="heading">No habits yet</AppText>
        <AppText variant="caption">Small steps every day add up</AppText>
        <Button title="Create habit" onPress={() => console.log("Create habit pressed")} />
      </Card>
    </Screen>
  );
}
