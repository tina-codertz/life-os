import { PASSWORD_MIN_LENGTH, resetPasswordSchema } from '@life-os/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { FormScreen } from '@/components/form-screen';
import { Button, Text, TextField } from '@/components/ui';
import { resetPassword } from '@/features/auth/auth-api';
import { useSession } from '@/features/auth/session';
import { applyApiError, useZodForm } from '@/features/forms/zod-form';

const schema = resetPasswordSchema.pick({ newPassword: true });

// lifeos://reset-password?token=… from the forgot-password email (4.6). Outside the auth gate,
// so it works even if this phone is still signed in.
export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { status, signOut } = useSession();
  const [done, setDone] = useState(false);
  const { control, handleSubmit, setError, formState } = useZodForm(schema, { newPassword: '' });

  const submit = handleSubmit(async ({ newPassword }) => {
    if (!token) return;
    try {
      await resetPassword({ token, newPassword });
      // The API just ended every session, this one included.
      if (status === 'signedIn') await signOut();
      setDone(true);
    } catch (err) {
      applyApiError(err, setError, ['newPassword']);
    }
  });

  if (!token) {
    return (
      <FormScreen title="Reset password">
        <Text tone="danger" accessibilityRole="alert">
          This link is incomplete. Open it again from the email.
        </Text>
        <Button title="Continue" size="lg" onPress={() => router.replace('/')} />
      </FormScreen>
    );
  }

  if (done) {
    return (
      <FormScreen title="Password changed">
        <Text accessibilityLiveRegion="polite">
          You've been logged out everywhere. Sign in with your new password.
        </Text>
        <Button title="Sign in" size="lg" onPress={() => router.replace('/login')} />
      </FormScreen>
    );
  }

  return (
    <FormScreen title="Choose a new password">
      <Controller
        control={control}
        name="newPassword"
        render={({ field, fieldState }) => (
          <TextField
            label="New password"
            icon="lock"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            helper={`At least ${PASSWORD_MIN_LENGTH} characters.`}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
        )}
      />
      {formState.errors.root?.['server'] && (
        <Text tone="danger" accessibilityRole="alert">
          {formState.errors.root['server'].message}
        </Text>
      )}
      <Button
        title="Save password"
        size="lg"
        loading={formState.isSubmitting}
        onPress={() => void submit()}
      />
    </FormScreen>
  );
}
