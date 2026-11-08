import type { AuthResult, PublicUser } from '@life-os/shared';
import { type ReactNode, useEffect } from 'react';
import { useStore } from 'zustand';
import { authStore } from './auth-instance';
import type { AuthStatus } from './auth-store';

// What screens and the navigation gate use. Backed by the auth store (5.4): the refresh token
// in SecureStore, so a signed-in user stays signed in across app restarts.
export type SessionStatus = AuthStatus;

export interface SessionState {
  status: SessionStatus;
  onboarded: boolean;
}

export interface Session extends SessionState {
  user: PublicUser | null;
  signIn: (result: AuthResult) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Restores the stored session once, at launch. Until it's done, status is 'loading' and the
// root layout keeps the splash screen up.
export function SessionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void authStore.getState().hydrate();
  }, []);
  return children;
}

export function useSession(): Session {
  const status = useStore(authStore, (s) => s.status);
  const user = useStore(authStore, (s) => s.user);
  const { signIn, signOut, setUser, http } = authStore.getState();
  return {
    status,
    user,
    onboarded: Boolean(user?.onboardingCompletedAt),
    signIn,
    signOut,
    async completeOnboarding() {
      await setUser(await http.patch<PublicUser>('/users/me', { onboardingCompleted: true }));
    },
  };
}

// Which part of the app this session may see. One function, used by the root layout's guards
// and by the "/" redirect, so the two can't disagree.
export type AppArea = 'auth' | 'onboarding' | 'app';

export function areaFor({ status, onboarded }: SessionState): AppArea | null {
  if (status === 'loading') return null;
  if (status === 'signedOut') return 'auth';
  return onboarded ? 'app' : 'onboarding';
}

export const HOME_OF: Record<AppArea, '/welcome' | '/profile' | '/today'> = {
  auth: '/welcome',
  onboarding: '/profile',
  app: '/today',
};
