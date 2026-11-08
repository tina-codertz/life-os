import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWash } from '@/components/screen';
import { Button, Mascot, Text } from '@/components/ui';
import { signInAsDemoUser } from '@/features/dev/demo-account';
import { isApiError } from '@/services/api-error';
import { radius, spacing, useTheme } from '@/theme';

// The design's Splash screen, with the two ways in at the bottom.
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg.canvas,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + spacing.lg,
        paddingHorizontal: spacing.gutter,
      }}
    >
      <ScreenWash height={420} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
        <View
          style={{
            backgroundColor: colors.ink.fill,
            paddingHorizontal: spacing.md + 2,
            paddingVertical: spacing.sm,
            borderRadius: radius.lg,
          }}
        >
          <Text variant="label" tone="onInk">
            Hi, I'm Lio!
          </Text>
        </View>
        <Mascot mood="happy" height={170} decorative />
        <Text variant="hero" accessibilityRole="header" style={{ marginTop: spacing.md }}>
          Life OS
        </Text>
        <Text tone="secondary" style={{ textAlign: 'center' }}>
          Your day, but make it fun.
        </Text>
      </View>

      <View style={{ gap: spacing.md }}>
        <Button
          title="Create account"
          size="lg"
          icon="arrowRight"
          onPress={() => router.push('/register')}
        />
        <Button
          title="Sign in"
          size="lg"
          variant="secondary"
          onPress={() => router.push('/login')}
        />
        {__DEV__ && (
          // Development only: a throwaway account through the API.
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              title="Demo: new user"
              size="sm"
              variant="ghost"
              loading={busy === 'new'}
              disabled={busy !== null}
              onPress={() => void demo('new')}
              style={{ flex: 1 }}
            />
            <Button
              title="Demo: returning user"
              size="sm"
              variant="ghost"
              loading={busy === 'returning'}
              disabled={busy !== null}
              onPress={() => void demo('returning')}
              style={{ flex: 1 }}
            />
          </View>
        )}
        {error && (
          <Text tone="danger" accessibilityRole="alert" style={{ textAlign: 'center' }}>
            {error}
          </Text>
        )}
      </View>
    </View>
  );
}
