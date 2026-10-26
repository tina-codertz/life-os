import { AppText, Card, IconTile, Screen } from "@/components";

export default function SettingsScreen() {
  return (
    <Screen>
      <AppText variant="title">Settings</AppText>
      <Card>
        <IconTile emoji="⚙️" color="pastelLilac" size={40} />
        <AppText variant="heading">MyLife</AppText>
        <AppText variant="caption">V0 · dark theme only</AppText>
      </Card>
    </Screen>
  );
}
