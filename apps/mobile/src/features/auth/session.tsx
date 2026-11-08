import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

// What the navigation gate needs to know about the user. 5.4 replaces the in-memory state
// with the real auth store (tokens in SecureStore, restored on launch); screens keep using
// useSession() unchanged.
export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

export interface SessionState {
  status: SessionStatus;
  onboarded: boolean;
}

export interface Session extends SessionState {
  signIn: (user: { onboarded: boolean }) => void;
  completeOnboarding: () => void;
  signOut: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({
  children,
  initialState = { status: 'signedOut', onboarded: false },
}: {
  children: ReactNode;
  initialState?: SessionState;
}) {
  const [state, setState] = useState<SessionState>(initialState);
  const session = useMemo<Session>(
    () => ({
      ...state,
      signIn: ({ onboarded }) => setState({ status: 'signedIn', onboarded }),
      completeOnboarding: () => setState((s) => ({ ...s, onboarded: true })),
      signOut: () => setState({ status: 'signedOut', onboarded: false }),
    }),
    [state],
  );
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession() must be used inside <SessionProvider>');
  return session;
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
