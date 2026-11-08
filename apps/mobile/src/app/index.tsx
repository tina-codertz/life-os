import { THEMES, type Theme as ThemePreference } from '@life-os/shared';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Text } from '@/components/ui';
import { spacing, type TextVariant, useThemePreference } from '@/theme';

// Temporary preview of the design system (5.1): every primitive in both themes, and the
// theme switch. Replaced by the auth gate in 5.2.
const TEXT_VARIANTS: TextVariant[] = [
  'display',
  'title1',
  'title2',
  'title3',
  'body',
  'bodyStrong',
  'callout',
  'caption',
  'overline',
];
const LABELS: Record<ThemePreference, string> = { SYSTEM: 'System', DARK: 'Dark', LIGHT: 'Light' };

export default function DesignPreview() {
  const insets = useSafeAreaInsets();
  const { preference, setPreference } = useThemePreference();

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.lg,
        gap: spacing.xl,
      }}
    >
      <Text variant="display" accessibilityRole="header">
        Life OS
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Text variant="overline" tone="secondary">
          Theme
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {THEMES.map((option) => (
            <Button
              key={option}
              title={LABELS[option]}
              size="sm"
              variant={preference === option ? 'primary' : 'secondary'}
              onPress={() => setPreference(option)}
              style={{ flex: 1 }}
              testID={`theme-${option}`}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.xs }}>
        <Text variant="overline" tone="secondary">
          Type ramp
        </Text>
        {TEXT_VARIANTS.map((variant) => (
          <Text key={variant} variant={variant}>
            {variant}
          </Text>
        ))}
        <Text tone="secondary">Secondary text</Text>
        <Text tone="accent">Accent text</Text>
        <Text tone="success">Success text</Text>
        <Text tone="danger">Danger text</Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="overline" tone="secondary">
          Buttons
        </Text>
        <Button title="Primary" />
        <Button title="Secondary" variant="secondary" />
        <Button title="Ghost" variant="ghost" />
        <Button title="Delete" variant="destructive" />
        <Button title="Saving" loading />
        <Button title="Disabled" disabled />
      </View>

      <View style={{ gap: spacing.md }}>
        <Text variant="overline" tone="secondary">
          Cards
        </Text>
        <Card>
          <Text variant="title3">Surface card</Text>
          <Text tone="secondary">Content comes from the screen.</Text>
        </Card>
        <Card variant="elevated">
          <Text variant="title3">Elevated card</Text>
        </Card>
        <Card variant="outlined" onPress={() => {}} accessibilityLabel="Open outlined card">
          <Text variant="title3">Outlined, pressable</Text>
        </Card>
      </View>
    </ScrollView>
  );
}
