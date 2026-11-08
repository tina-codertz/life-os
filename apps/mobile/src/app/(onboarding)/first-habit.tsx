import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { FormScreen } from '@/components/form-screen';
import { Button, Chip, Mascot, Text } from '@/components/ui';
import { habitKeys } from '@/features/habits/queries';
import { finishOnboarding } from '@/features/onboarding/api';
import { deviceDefaults } from '@/features/onboarding/device-defaults';
import { updateDraft, useOnboardingDraft } from '@/features/onboarding/draft';
import { HABIT_TEMPLATES } from '@/features/onboarding/habit-templates';
import { StepDots } from '@/features/onboarding/step-dots';
import { categoryKeys } from '@/features/tasks/queries';
import { userKeys } from '@/features/users/queries';
import { isApiError } from '@/services/api-error';
import { spacing } from '@/theme';

// Onboarding step 3 of 3 (FR-ONB-003, optional): start one habit from a template. Finishing
// saves everything (categories, the habit, settings, profile); "Skip this step" finishes
// without a habit.
export default function OnboardingFirstHabit() {
  const draft = useOnboardingDraft();
  const device = useMemo(() => deviceDefaults(), []);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<'finish' | 'skip' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function finish(withHabit: boolean) {
    setSaving(withHabit ? 'finish' : 'skip');
    setMessage(null);
    try {
      await finishOnboarding(withHabit ? draft : { ...draft, firstHabit: null }, device);
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      void queryClient.invalidateQueries({ queryKey: habitKeys.all });
      void queryClient.invalidateQueries({ queryKey: userKeys.me });
    } catch (err) {
      setMessage(isApiError(err) ? err.message : 'Something went wrong. Please try again.');
      setSaving(null);
    }
  }

  return (
    <FormScreen title="Start a habit?" intro="One small thing to do often. You can add more later.">
      <StepDots step={3} of={3} />
      <View style={{ alignItems: 'center' }}>
        <Mascot mood="planning" height={96} decorative />
      </View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="First habit"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
      >
        {HABIT_TEMPLATES.map((t) => (
          <Chip
            key={t.key}
            label={t.label}
            icon={t.glyph}
            selected={draft.firstHabit === t.key}
            onPress={() => updateDraft({ firstHabit: draft.firstHabit === t.key ? null : t.key })}
          />
        ))}
      </View>
      {message && (
        <Text tone="danger" accessibilityRole="alert">
          {message}
        </Text>
      )}
      <Button
        title="Finish"
        size="lg"
        icon="check"
        loading={saving === 'finish'}
        disabled={saving !== null}
        onPress={() => void finish(true)}
      />
      <Button
        title="Skip this step"
        variant="ghost"
        loading={saving === 'skip'}
        disabled={saving !== null}
        onPress={() => void finish(false)}
      />
      <Button
        title="Back"
        variant="ghost"
        disabled={saving !== null}
        onPress={() => router.back()}
      />
    </FormScreen>
  );
}
