import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { FormScreen } from '@/components/form-screen';
import { Button, Chip, Text } from '@/components/ui';
import { finishOnboarding } from '@/features/onboarding/api';
import { deviceDefaults } from '@/features/onboarding/device-defaults';
import { updateDraft, useOnboardingDraft } from '@/features/onboarding/draft';
import { FOCUS_AREAS, type FocusAreaKey, MAX_FOCUS_AREAS } from '@/features/onboarding/focus-areas';
import { StepDots } from '@/features/onboarding/step-dots';
import { categoryKeys } from '@/features/tasks/queries';
import { userKeys } from '@/features/users/queries';
import { isApiError } from '@/services/api-error';
import { spacing, useTheme } from '@/theme';

// Onboarding step 2 of 2 (FR-ONB-002): pick 1–3 focus areas; each becomes a task category.
// Built from the design's own pieces (the New task sheet's category chips), as the design has
// no screen for this step.
export default function OnboardingFocus() {
  const draft = useOnboardingDraft();
  const { colors } = useTheme();
  const device = useMemo(() => deviceDefaults(), []);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const chosen = draft.focusAreas;

  function toggle(key: FocusAreaKey) {
    setMessage(null);
    if (chosen.includes(key)) {
      updateDraft({ focusAreas: chosen.filter((k) => k !== key) });
    } else if (chosen.length >= MAX_FOCUS_AREAS) {
      setMessage(`You can pick up to ${MAX_FOCUS_AREAS}. Tap one to remove it first.`);
    } else {
      updateDraft({ focusAreas: [...chosen, key] });
    }
  }

  async function finish() {
    if (chosen.length === 0) {
      setMessage('Pick at least one area.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await finishOnboarding(draft, device);
      // New categories, name and settings: the cached copies are out of date.
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      void queryClient.invalidateQueries({ queryKey: userKeys.me });
    } catch (err) {
      setMessage(isApiError(err) ? err.message : 'Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  return (
    <FormScreen
      title="What matters most?"
      intro={`Pick up to ${MAX_FOCUS_AREAS}. Each one becomes a category for your tasks.`}
    >
      <StepDots step={2} of={2} />
      <View
        accessibilityLabel="Focus areas"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
      >
        {FOCUS_AREAS.map((area) => (
          <Chip
            key={area.key}
            mode="multiple"
            label={area.name}
            icon={area.glyph}
            tint={colors.categoryTile[area.color]}
            selected={chosen.includes(area.key)}
            onPress={() => toggle(area.key)}
          />
        ))}
      </View>
      <Text variant="caption" tone="secondary">
        {chosen.length} of {MAX_FOCUS_AREAS} chosen. You can add or rename categories later.
      </Text>
      {message && (
        <Text tone="danger" accessibilityRole="alert">
          {message}
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
