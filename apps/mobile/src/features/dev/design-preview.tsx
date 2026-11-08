import { THEMES, type Theme as ThemePreference } from '@life-os/shared';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScreenWash } from '@/components/screen';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  ListGroup,
  ListRow,
  Mascot,
  SegmentedControl,
  Skeleton,
  SkeletonGroup,
  Text,
  TextField,
  useToast,
} from '@/components/ui';
import { ApiError } from '@/services/api-error';
import { spacing, type TextVariant, useTheme, useThemePreference } from '@/theme';

// Every primitive in both themes, plus the theme switch (5.1). Reachable from More until the
// real Appearance settings screen exists.
const TEXT_VARIANTS: TextVariant[] = [
  'hero',
  'display',
  'title1',
  'title2',
  'title3',
  'body',
  'bodyStrong',
  'callout',
  'calloutStrong',
  'label',
  'caption',
  'overline',
];
const LABELS: Record<ThemePreference, string> = { SYSTEM: 'System', DARK: 'Dark', LIGHT: 'Light' };

export function DesignPreview() {
  const insets = useSafeAreaInsets();
  const { preference, setPreference } = useThemePreference();
  const toast = useToast();
  const { colors } = useTheme();
  const [segment, setSegment] = useState<'day' | 'week' | 'month'>('month');
  const [chip, setChip] = useState('Work');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
      <ScreenWash />
      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.gutter,
          gap: spacing.xl,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Mascot mood="excited" height={72} decorative />
          <Text variant="display" accessibilityRole="header">
            Life OS
          </Text>
        </View>

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
          <Button title="Primary" icon="arrowRight" />
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
              mascot="sleepy"
              title="No habits yet"
              description="Small daily actions add up."
              action={{ label: 'Add your first habit', icon: 'add', onPress: () => {} }}
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
            Controls
          </Text>
          <SegmentedControl
            accessibilityLabel="View"
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            value={segment}
            onChange={setSegment}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {[
              ['Work', colors.tile.sky],
              ['Learning', colors.tile.lavender],
              ['Personal', colors.tile.peach],
            ].map(([label, tint]) => (
              <Chip
                key={label}
                label={label ?? ''}
                tint={tint ?? ''}
                selected={chip === label}
                onPress={() => setChip(label ?? '')}
              />
            ))}
          </View>
          <TextField label="Email" icon="mail" placeholder="tina@example.com" />
          <ListGroup>
            <ListRow
              icon="calendar"
              tint={colors.tile.sky}
              title="Due date"
              value="Today"
              onPress={() => {}}
            />
            <ListRow
              icon="clock"
              tint={colors.tile.lime}
              title="Time"
              value="16:00"
              onPress={() => {}}
            />
            <ListRow icon="signOut" title="Sign out" tone="danger" onPress={() => {}} />
          </ListGroup>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <IconButton icon="close" accessibilityLabel="Close" onPress={() => {}} />
            <IconButton
              icon="add"
              variant="ink"
              size={56}
              accessibilityLabel="Add"
              onPress={() => {}}
            />
          </View>
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
    </View>
  );
}
