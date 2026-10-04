import { AppText, Button, Card, IconTile, Screen } from '@/components';

export default function Index() {
  return (
    <Screen
      style={{
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText variant="title">
        Life OS
      </AppText>

      <AppText variant="heading" color="accentRed">
        Component Showcase
      </AppText>

      <AppText variant="body" color="textSecondary">
        Testing the design system components.
      </AppText>

      <Card>
        <AppText variant="heading">
          Static Card
        </AppText>

        <AppText variant="caption" color="textSecondary">
          This card is not pressable.
        </AppText>
      </Card>

      <Card
        onPress={() => console.log('Card pressed')}
      >
        <AppText variant="heading">
          Pressable Card
        </AppText>

        <AppText variant="caption" color="textSecondary">
          Tap this card.
        </AppText>
      </Card>

      <IconTile
        emoji="🏋️"
        color="pastelLavender"
      />

      <IconTile
        emoji="📚"
        color="pastelGreen"
      />

      <Button
        variant="primary"
        label="Primary Button"
        onPress={() => console.log('Primary pressed')}
      />

      <Button
        variant="ghost"
        label="Ghost Button"
        onPress={() => console.log('Ghost pressed')}
      />
    </Screen>
  );
}
