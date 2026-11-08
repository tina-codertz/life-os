import { registerSchema, timezoneSchema } from '@life-os/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { FormScreen } from '@/components/form-screen';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { applyApiError, useZodForm } from '@/features/forms/zod-form';
import { skipOnboarding } from '@/features/onboarding/api';
import { deviceDefaults } from '@/features/onboarding/device-defaults';
import { updateDraft } from '@/features/onboarding/draft';
import { userKeys } from '@/features/users/queries';
import { spacing } from '@/theme';

const schema = z.object({
  displayName: registerSchema.shape.displayName,
  timezone: timezoneSchema,
});

// Onboarding step 1 of 2 (FR-ONB-001): name and time zone. Focus areas and a first habit
// (FR-ONB-002/003) join in Phase 6, once categories and habits exist.
export default function OnboardingProfile() {
  const { user } = useSession();
  const device = useMemo(() => deviceDefaults(), []);
  const queryClient = useQueryClient();
  const [editingZone, setEditingZone] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const { control, handleSubmit, setError, formState } = useZodForm(schema, {
    displayName: user?.displayName ?? '',
    timezone: device.timezone,
  });

  const next = handleSubmit((values) => {
    updateDraft({
      displayName: values.displayName,
      timezone: values.timezone,
      followDeviceTimezone: values.timezone === device.timezone,
    });
    router.push('/theme');
  });

  async function skip() {
    setSkipping(true);
    try {
      await skipOnboarding(device);
      void queryClient.invalidateQueries({ queryKey: userKeys.me });
    } catch (err) {
      applyApiError(err, setError, []);
      setSkipping(false);
    }
  }

  return (
    <FormScreen title="Welcome to Life OS" intro="Two quick questions, then you're in.">
      <Text variant="overline" tone="secondary">
        Step 1 of 2
      </Text>
      <Controller
        control={control}
        name="displayName"
        render={({ field, fieldState }) => (
          <TextField
            label="What should we call you?"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="name"
            textContentType="name"
          />
        )}
      />
      <Controller
        control={control}
        name="timezone"
        render={({ field, fieldState }) =>
          editingZone ? (
            <TextField
              label="Time zone"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              helper="A city name like Africa/Dar_es_Salaam or Europe/London."
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : (
            <Card variant="outlined">
              <View style={{ gap: spacing.xs }}>
                <Text variant="callout" tone="secondary">
                  Time zone (from your phone)
                </Text>
                <Text variant="bodyStrong">{field.value}</Text>
                <Text variant="caption" tone="secondary">
                  Used to decide what "today" means for your tasks and habits.
                </Text>
              </View>
              <Button
                title="Change time zone"
                variant="ghost"
                size="sm"
                onPress={() => setEditingZone(true)}
              />
            </Card>
          )
        }
      />
      {formState.errors.root?.['server'] && (
        <Text tone="danger" accessibilityRole="alert">
          {formState.errors.root['server'].message}
        </Text>
      )}
      <Button title="Continue" disabled={skipping} onPress={() => void next()} />
      <Button title="Skip for now" variant="ghost" loading={skipping} onPress={() => void skip()} />
    </FormScreen>
  );
}
