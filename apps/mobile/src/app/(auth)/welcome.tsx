import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { Button, Text } from '@/components/ui';
import { signInAsDemoUser } from '@/features/dev/demo-account';
import { isApiError } from '@/services/api-error';
import { spacing } from '@/theme';

export default function Welcome() {
  const [busy, setBusy] = useState<'new' | 'returning' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function demo(kind: 'new' | 'returning') {
    setBusy(kind);
    setError(null);
    try {
      await signInAsDemoUser({ onboarded: kind === 'returning' });
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Something went wrong.');
      setBusy(null);
    }
  }

  return (
    <PlaceholderScreen
      title="Life OS"
      description="Tasks, habits, goals and your calendar in one place."
    >
      <View style={{ gap: spacing.sm }}>
        <Button title="Create account" onPress={() => router.push('/register')} />
        <Button title="Log in" variant="secondary" onPress={() => router.push('/login')} />
        {__DEV__ && (
          // Development only, until real login (5.5): a throwaway account through the API.
          <>
            <Button
              title="Demo: new user"
              variant="ghost"
              loading={busy === 'new'}
              disabled={busy !== null}
              onPress={() => void demo('new')}
            />
            <Button
              title="Demo: returning user"
              variant="ghost"
              loading={busy === 'returning'}
              disabled={busy !== null}
              onPress={() => void demo('returning')}
            />
            {error && (
              <Text tone="danger" accessibilityRole="alert">
                {error}
              </Text>
            )}
          </>
        )}
      </View>
    </PlaceholderScreen>
  );
}
