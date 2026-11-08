import { PASSWORD_MIN_LENGTH, registerSchema } from '@life-os/shared';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Controller } from 'react-hook-form';
import { FormScreen } from '@/components/form-screen';
import { Button, Text, TextField, type TextFieldHandle } from '@/components/ui';
import { register } from '@/features/auth/auth-api';
import { useSession } from '@/features/auth/session';
import { applyApiError, useZodForm } from '@/features/forms/zod-form';

const schema = registerSchema.omit({ deviceName: true });

export default function Register() {
  const { signIn } = useSession();
  const emailRef = useRef<TextFieldHandle>(null);
  const passwordRef = useRef<TextFieldHandle>(null);
  const { control, handleSubmit, setError, formState } = useZodForm(schema, {
    displayName: '',
    email: '',
    password: '',
  });

  const submit = handleSubmit(async (values) => {
    try {
      await signIn(await register(values));
    } catch (err) {
      const code = applyApiError(err, setError, ['displayName', 'email', 'password']);
      if (code === 'EMAIL_TAKEN') {
        setError('email', {
          message: 'An account with this email already exists. Log in instead?',
        });
        setError('root.server', { message: '' });
      }
    }
  });

  const serverError = formState.errors.root?.['server']?.message;

  return (
    <FormScreen title="Create account" intro="Takes a minute. You can change everything later.">
      <Controller
        control={control}
        name="displayName"
        render={({ field, fieldState }) => (
          <TextField
            label="Name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            ref={emailRef}
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            ref={passwordRef}
            label="Password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            helper={`At least ${PASSWORD_MIN_LENGTH} characters. A short sentence works well.`}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
        )}
      />
      {serverError ? (
        <Text tone="danger" accessibilityRole="alert">
          {serverError}
        </Text>
      ) : null}
      <Button
        title="Create account"
        loading={formState.isSubmitting}
        onPress={() => void submit()}
      />
      <Button
        title="Already have an account? Log in"
        variant="ghost"
        onPress={() => router.replace('/login')}
      />
    </FormScreen>
  );
}
