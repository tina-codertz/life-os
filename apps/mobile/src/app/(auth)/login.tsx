import { loginSchema } from '@life-os/shared';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Controller } from 'react-hook-form';
import { FormScreen } from '@/components/form-screen';
import { Button, Text, TextField, type TextFieldHandle } from '@/components/ui';
import { login } from '@/features/auth/auth-api';
import { useSession } from '@/features/auth/session';
import { applyApiError, useZodForm } from '@/features/forms/zod-form';

const schema = loginSchema.omit({ deviceName: true });

export default function Login() {
  const { signIn } = useSession();
  const passwordRef = useRef<TextFieldHandle>(null);
  const { control, handleSubmit, setError, formState } = useZodForm(schema, {
    email: '',
    password: '',
  });

  // On success the gate sees the new session and moves the user on; nothing to navigate here.
  const submit = handleSubmit(async (values) => {
    try {
      await signIn(await login(values));
    } catch (err) {
      applyApiError(err, setError, ['email', 'password']);
    }
  });

  return (
    <FormScreen title="Log in" intro="Welcome back.">
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
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
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
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
      <Button title="Log in" loading={formState.isSubmitting} onPress={() => void submit()} />
      <Button
        title="Forgot password?"
        variant="ghost"
        onPress={() => router.push('/forgot-password')}
      />
      <Button
        title="No account yet? Create one"
        variant="ghost"
        onPress={() => router.replace('/register')}
      />
    </FormScreen>
  );
}
