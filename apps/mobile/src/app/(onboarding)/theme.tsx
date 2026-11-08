import { THEMES, type Theme as ThemePreference } from '@life-os/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { FormScreen } from '@/components/form-screen';
import { Button, Card, Icon, IconTile, type IconName, Text } from '@/components/ui';
import { finishOnboarding } from '@/features/onboarding/api';
import { deviceDefaults } from '@/features/onboarding/device-defaults';
import { updateDraft, useOnboardingDraft } from '@/features/onboarding/draft';
import { StepDots } from '@/features/onboarding/step-dots';
import { userKeys } from '@/features/users/queries';
import { isApiError } from '@/services/api-error';
import { radius, spacing, type ThemeColors, useTheme, useThemePreference } from '@/theme';

const OPTIONS: Record<
  ThemePreference,
  { title: string; description: string; icon: IconName; tint: keyof ThemeColors['tile'] }
> = {
  SYSTEM: {
    title: 'Match my phone',
    description: 'Dark at night, light by day, if your phone does that.',
    icon: 'phone',
    tint: 'sky',
  },
  DARK: { title: 'Dark', description: 'Easy on the eyes, always.', icon: 'moon', tint: 'lavender' },
  LIGHT: { title: 'Light', description: 'Bright and clear, always.', icon: 'sun', tint: 'peach' },
};

// Onboarding step 2 of 2: theme, applied live so the choice is seen before it's made.
export default function OnboardingTheme() {
  const draft = useOnboardingDraft();
  const { setPreference } = useThemePreference();
  const { colors } = useTheme();
  const device = useMemo(() => deviceDefaults(), []);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function choose(theme: ThemePreference) {
    updateDraft({ theme });
    setPreference(theme);
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      await finishOnboarding(draft, device);
      // New name and settings: the cached account data is out of date.
      void queryClient.invalidateQueries({ queryKey: userKeys.me });
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  return (
    <FormScreen title="Pick a look" intro="You can change this any time in Settings.">
      <StepDots step={2} of={2} />
      <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
        {THEMES.map((theme) => {
          const selected = draft.theme === theme;
          return (
            <Card
              key={theme}
              onPress={() => choose(theme)}
              accessibilityLabel={OPTIONS[theme].title}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                borderWidth: 2,
                borderColor: selected ? colors.ink.fill : 'transparent',
              }}
            >
              <IconTile icon={OPTIONS[theme].icon} tint={colors.tile[OPTIONS[theme].tint]} />
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <Text variant="bodyStrong">{OPTIONS[theme].title}</Text>
                <Text variant="callout" tone="secondary">
                  {OPTIONS[theme].description}
                </Text>
              </View>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: radius.full,
                  borderWidth: 2,
                  borderColor: selected ? colors.ink.fill : colors.border.subtle,
                  backgroundColor: selected ? colors.ink.fill : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selected && <Icon name="check" size={14} color={colors.ink.text} />}
              </View>
            </Card>
          );
        })}
      </View>
      {error && (
        <Text tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      )}
      <Button
        title="Finish"
        size="lg"
        icon="check"
        loading={saving}
        onPress={() => void finish()}
      />
      <Button title="Back" variant="ghost" disabled={saving} onPress={() => router.back()} />
    </FormScreen>
  );
}
