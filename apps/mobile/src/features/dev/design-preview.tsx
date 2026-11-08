import { THEMES, type Theme as ThemePreference } from '@life-os/shared';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonGroup,
  Text,
  useToast,
} from '@/components/ui';
import { ApiError } from '@/services/api-error';
import { spacing, type TextVariant, useThemePreference } from '@/theme';

// Every primitive in both themes, plus the theme switch (5.1). Reachable from More until the
// real Appearance settings screen exists.
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

export function DesignPreview() {
  const insets = useSafeAreaInsets();
  const { preference, setPreference } = useThemePreference();
  const toast = useToast();

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

      <View style={{ gap: spacing.sm }}>
        <Text variant="overline" tone="secondary">
          Feedback
        </Text>
        <Button
          title="Show a toast"
          variant="secondary"
          onPress={() =>
            toast({
              message: 'Task deleted',
              action: {
                label: 'Undo',
                onPress: () => toast({ message: 'Restored', tone: 'success' }),
              },
            })
          }
        />
        <Button
          title="Show an error toast"
          variant="secondary"
          onPress={() => toast({ message: "Couldn't save. Try again.", tone: 'error' })}
        />
        <Button
          title="Open a sheet"
          variant="secondary"
          onPress={() => router.push('/sheet-demo')}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="overline" tone="secondary">
          States
        </Text>
        <Card>
          <SkeletonGroup>
            <Skeleton shape="circle" delayMs={0} />
            <Skeleton width="60%" delayMs={0} />
            <Skeleton width="90%" delayMs={0} />
          </SkeletonGroup>
        </Card>
        <Card>
          <EmptyState
            title="No habits yet"
            description="Small daily actions add up."
            action={{ label: 'Add your first habit', onPress: () => {} }}
          />
        </Card>
        <Card>
          <ErrorState
            error={new ApiError(0, 'NETWORK_ERROR', 'offline', { requestId: 'req-demo' })}
            onRetry={() => {}}
          />
        </Card>
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
