import { loginSchema } from '@life-os/shared';
import { router } from 'expo-router';
import { useRef } from 'react';
import { Controller } from 'react-hook-form';
import { FormScreen } from '@/components/form-screen';
import { View } from 'react-native';
import { Button, Text, TextField, type TextFieldHandle } from '@/components/ui';
import { login } from '@/features/auth/auth-api';
import { AuthSwitch } from '@/features/auth/auth-switch';
import { useSession } from '@/features/auth/session';
import { applyApiError, useZodForm } from '@/features/forms/zod-form';
import { spacing } from '@/theme';

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
    <FormScreen title="Welcome back" intro="Sign in to pick up where you left off." brand>
      <AuthSwitch current="login" />
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
            icon="lock"
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
      <View style={{ alignItems: 'flex-end', marginTop: -spacing.sm }}>
        <Button
          title="Forgot password?"
          variant="ghost"
          size="sm"
          onPress={() => router.push('/forgot-password')}
          style={{ paddingHorizontal: 0 }}
        />
      </View>
      <Button
        title="Sign in"
        size="lg"
        icon="arrowRight"
        loading={formState.isSubmitting}
        onPress={() => void submit()}
      />
    </FormScreen>
  );
}
