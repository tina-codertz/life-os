import { THEMES, type Theme as ThemePreference } from '@life-os/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { FormScreen } from '@/components/form-screen';
import { Button, Card, Text } from '@/components/ui';
import { finishOnboarding } from '@/features/onboarding/api';
import { deviceDefaults } from '@/features/onboarding/device-defaults';
import { updateDraft, useOnboardingDraft } from '@/features/onboarding/draft';
import { userKeys } from '@/features/users/queries';
import { isApiError } from '@/services/api-error';
import { spacing, useThemePreference } from '@/theme';

const OPTIONS: Record<ThemePreference, { title: string; description: string }> = {
  SYSTEM: {
    title: 'Match my phone',
    description: 'Dark at night, light by day, if your phone does that.',
  },
  DARK: { title: 'Dark', description: 'Easy on the eyes, always.' },
  LIGHT: { title: 'Light', description: 'Bright and clear, always.' },
};

// Onboarding step 2 of 2: theme, applied live so the choice is seen before it's made.
export default function OnboardingTheme() {
  const draft = useOnboardingDraft();
  const { setPreference } = useThemePreference();
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
      <Text variant="overline" tone="secondary">
        Step 2 of 2
      </Text>
      <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
        {THEMES.map((theme) => {
          const selected = draft.theme === theme;
          return (
            <Card
              key={theme}
              variant={selected ? 'surface' : 'outlined'}
              onPress={() => choose(theme)}
              accessibilityLabel={OPTIONS[theme].title}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
            >
              <Text variant="bodyStrong" tone={selected ? 'accent' : 'primary'}>
                {selected ? '● ' : '○ '}
                {OPTIONS[theme].title}
              </Text>
              <Text variant="callout" tone="secondary">
                {OPTIONS[theme].description}
              </Text>
            </Card>
          );
        })}
      </View>
      {error && (
        <Text tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      )}
      <Button title="Finish" loading={saving} onPress={() => void finish()} />
      <Button title="Back" variant="ghost" disabled={saving} onPress={() => router.back()} />
    </FormScreen>
  );
}
