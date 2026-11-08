import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { FormScreen } from '@/components/form-screen';
import { Button, Card, IconTile, Text } from '@/components/ui';
import { isApiError } from '@/services/api-error';
import { spacing, useTheme } from '@/theme';
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
      <Card>
        {state.kind === 'working' && (
          <ActivityIndicator accessibilityLabel="Working" color={colors.text.primary} />
        )}
        {state.kind === 'done' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <IconTile icon="check" tint={colors.success.soft} iconColor={colors.success.default} />
            <Text accessibilityLiveRegion="polite" style={{ flex: 1 }}>
              {successMessage}
            </Text>
          </View>
        )}
        {state.kind === 'failed' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <IconTile icon="warning" tint={colors.danger.soft} iconColor={colors.danger.text} />
            <Text tone="danger" accessibilityRole="alert" style={{ flex: 1 }}>
              {state.message}
            </Text>
          </View>
        )}
      </Card>
      {state.kind !== 'working' && (
        <Button title="Continue" size="lg" onPress={() => router.replace('/')} />
      )}
    </FormScreen>
  );
}
