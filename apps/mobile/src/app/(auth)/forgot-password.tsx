import { forgotPasswordSchema } from '@life-os/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { FormScreen } from '@/components/form-screen';
import { Button, Text, TextField } from '@/components/ui';
import { requestPasswordReset } from '@/features/auth/auth-api';
import { applyApiError, useZodForm } from '@/features/forms/zod-form';

export default function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { control, handleSubmit, setError, formState } = useZodForm(forgotPasswordSchema, {
    email: '',
  });

  const submit = handleSubmit(async (values) => {
    try {
      await requestPasswordReset(values);
      setSentTo(values.email);
    } catch (err) {
      applyApiError(err, setError, ['email']);
    }
  });

  // The API answers the same whether or not the email has an account, so the app does too.
  if (sentTo) {
    return (
      <FormScreen title="Check your email">
        <Text accessibilityLiveRegion="polite">
          If {sentTo} has a Life OS account, we've sent a link to reset the password. It works for 1
          hour.
        </Text>
        <Button title="Back to sign in" size="lg" onPress={() => router.replace('/login')} />
      </FormScreen>
    );
  }

  return (
    <FormScreen
      title="Reset password"
      intro="Enter your email and we'll send you a link to choose a new password."
    >
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label="Email"
            icon="mail"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="send"
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
        title="Send link"
        size="lg"
        icon="arrowRight"
        loading={formState.isSubmitting}
        onPress={() => void submit()}
      />
    </FormScreen>
  );
}
