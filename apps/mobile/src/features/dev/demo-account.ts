import type { AuthResult, PublicUser } from '@life-os/shared';
import { api, authStore } from '@/features/auth/auth-instance';

// Development only (welcome screen, __DEV__): creates a real throwaway account through the API
// and signs in with it, until the login and register forms exist (5.5). Uses the same store and
// SecureStore as real sign-in, so "stays signed in after restart" can be tried today.
export async function signInAsDemoUser({ onboarded }: { onboarded: boolean }): Promise<void> {
  const stamp = Date.now().toString(36);
  const result = await api().post<AuthResult>(
    '/auth/register',
    {
      email: `demo-${stamp}@example.test`,
      password: `demo passphrase ${stamp}`,
      displayName: 'Demo',
      deviceName: 'Dev demo',
    },
    { auth: false },
  );
  await authStore.getState().signIn(result);
  if (onboarded) {
    const user = await api().patch<PublicUser>('/users/me', { onboardingCompleted: true });
    await authStore.getState().setUser(user);
  }
}
