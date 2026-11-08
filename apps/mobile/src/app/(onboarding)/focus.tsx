import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { FormScreen } from '@/components/form-screen';
import { Button, Chip, Text } from '@/components/ui';
import { updateDraft, useOnboardingDraft } from '@/features/onboarding/draft';
import { FOCUS_AREAS, type FocusAreaKey, MAX_FOCUS_AREAS } from '@/features/onboarding/focus-areas';
import { StepDots } from '@/features/onboarding/step-dots';
import { spacing, useTheme } from '@/theme';

// Onboarding step 2 of 3 (FR-ONB-002): pick 1–3 focus areas; each becomes a task category.
// Built from the design's own pieces (the New task sheet's category chips), as the design has
// no screen for this step.
export default function OnboardingFocus() {
  const draft = useOnboardingDraft();
  const { colors } = useTheme();
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

  function next() {
    if (chosen.length === 0) {
      setMessage('Pick at least one area.');
      return;
    }
    router.push('/first-habit');
  }

  return (
    <FormScreen
      title="What matters most?"
      intro={`Pick up to ${MAX_FOCUS_AREAS}. Each one becomes a category for your tasks.`}
    >
      <StepDots step={2} of={3} />
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
      <Button title="Continue" size="lg" icon="arrowRight" onPress={next} />
      <Button title="Back" variant="ghost" onPress={() => router.back()} />
    </FormScreen>
  );
}
