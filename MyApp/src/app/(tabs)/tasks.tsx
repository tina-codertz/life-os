import { AppText, Button, Card, IconTile, Screen } from "@/components";

export default function TasksScreen() {
  return (
    <Screen>
      <AppText variant="title">Tasks</AppText>
      <Card onPress={() => console.log("Task card pressed")}>
        <IconTile emoji="📝" color="pastelLavender" />
        <AppText variant="heading">No tasks yet</AppText>
        <AppText variant="caption">Tap the + button to add one</AppText>
      </Card>
      <Button variant="ghost" title="Show completed" onPress={() => console.log("Show completed pressed")} />
    </Screen>
  );
}
