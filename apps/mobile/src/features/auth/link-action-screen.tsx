import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { FormScreen } from '@/components/form-screen';
import { Button, Text } from '@/components/ui';
import { isApiError } from '@/services/api-error';
import { useTheme } from '@/theme';
import { fetchMe } from './auth-api';
import { authStore } from './auth-instance';

type State = { kind: 'working' } | { kind: 'done' } | { kind: 'failed'; message: string };

// For links from emails that just need one API call (verify email, confirm a new email). Runs
// it once, shows the result, and refreshes the signed-in user so the app sees the change.
export function LinkActionScreen({
  title,
  token,
  action,
  successMessage,
}: {
  title: string;
  token: string | undefined;
  action: (token: string) => Promise<void>;
  successMessage: string;
}) {
  const { colors } = useTheme();
  // A link without a token can't work: start in that state rather than discovering it in an effect.
  const [state, setState] = useState<State>(() =>
    token
      ? { kind: 'working' }
      : { kind: 'failed', message: 'This link is incomplete. Open it again from the email.' },
  );
  // Links are single-use: a second call (a re-render, React's dev double-effects) would get
  // INVALID_LINK and show an error for a link that just worked.
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    action(token)
      .then(async () => {
        if (authStore.getState().status === 'signedIn') {
          await authStore
            .getState()
            .setUser(await fetchMe())
            .catch(() => undefined);
        }
        setState({ kind: 'done' });
      })
      .catch((err: unknown) => {
        setState({
          kind: 'failed',
          message: isApiError(err) ? err.message : 'Something went wrong. Please try again.',
        });
      });
  }, [action, token]);

  return (
    <FormScreen title={title}>
      {state.kind === 'working' && (
        <ActivityIndicator accessibilityLabel="Working" color={colors.accent.default} />
      )}
      {state.kind === 'done' && <Text accessibilityLiveRegion="polite">{successMessage}</Text>}
      {state.kind === 'failed' && (
        <Text tone="danger" accessibilityRole="alert">
          {state.message}
        </Text>
      )}
      {state.kind !== 'working' && <Button title="Continue" onPress={() => router.replace('/')} />}
    </FormScreen>
  );
}
