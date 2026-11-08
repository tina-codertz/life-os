import type { AuthResult, PublicUser, TokenPair } from '@life-os/shared';
import { createStore } from 'zustand/vanilla';
import { isApiError } from '@/services/api-error';
import { createHttpClient, type FetchLike, type HttpClient } from '@/services/http';
import type { SessionStorage } from './session-storage';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthState {
  status: AuthStatus;
  user: PublicUser | null;
  accessToken: string | null; // memory only
  refreshToken: string | null; // also in SecureStore
}

// Function-typed properties, not methods: they don't use `this`, so they can be passed around
// (`const { signIn } = store.getState()`) safely.
export interface AuthActions {
  // App launch: restore the stored session. Only acts while status is 'loading'.
  hydrate: () => Promise<void>;
  // After login/register.
  signIn: (result: AuthResult) => Promise<void>;
  // Local sign-out always succeeds; telling the server is best-effort (works offline).
  signOut: () => Promise<void>;
  // TokenSource.refresh for the HTTP client.
  refresh: () => Promise<string | null>;
  // Keep the cached user in step after profile changes (e.g. onboarding completed).
  setUser: (user: PublicUser) => Promise<void>;
}

export type AuthStore = ReturnType<typeof createAuthStore>;

export interface AuthStoreDeps {
  storage: SessionStorage;
  baseUrl: string | (() => string);
  fetch?: FetchLike;
}

const SIGNED_OUT: AuthState = {
  status: 'signedOut',
  user: null,
  accessToken: null,
  refreshToken: null,
};

// A vanilla Zustand store: usable from React (useStore) and from plain code (the HTTP client's
// token source) alike. It owns the app's one HTTP client.
export function createAuthStore({ storage, baseUrl, fetch }: AuthStoreDeps) {
  const store = createStore<AuthState & AuthActions & { http: HttpClient }>()((set, get) => {
    const http = createHttpClient({
      baseUrl,
      ...(fetch ? { fetch } : {}),
      tokens: {
        getAccessToken: () => get().accessToken,
        refresh: () => get().refresh(),
      },
    });

    async function endSession(): Promise<void> {
      set(SIGNED_OUT);
      await storage.clear();
    }

    return {
      status: 'loading',
      user: null,
      accessToken: null,
      refreshToken: null,
      http,

      async hydrate() {
        if (get().status !== 'loading') return;
        const stored = await storage.load().catch(() => null);
        if (!stored) {
          set(SIGNED_OUT);
          return;
        }
        // Open the app at once with the cached user, then get an access token in the
        // background. Offline is fine: the first request retries the refresh.
        set({ status: 'signedIn', user: stored.user, refreshToken: stored.refreshToken });
        await get()
          .refresh()
          .catch(() => undefined);
      },

      async signIn({ user, accessToken, refreshToken }) {
        await storage.save({ refreshToken, user });
        set({ status: 'signedIn', user, accessToken, refreshToken });
      },

      async signOut() {
        const { refreshToken } = get();
        await endSession();
        if (refreshToken) {
          await http.post('/auth/logout', { refreshToken }, { auth: false }).catch(() => undefined);
        }
      },

      async refresh() {
        const { refreshToken, user } = get();
        if (!refreshToken || !user) return null;
        try {
          const pair = await http.post<TokenPair>(
            '/auth/refresh',
            { refreshToken },
            { auth: false },
          );
          // Store the new refresh token before using it: the old one is already spent on the
          // server, so losing the new one would end the session at the next launch.
          await storage.save({ refreshToken: pair.refreshToken, user });
          set({ accessToken: pair.accessToken, refreshToken: pair.refreshToken });
          return pair.accessToken;
        } catch (err) {
          // The server says the session is over (expired, revoked, reused): sign out.
          if (isApiError(err, 'INVALID_REFRESH_TOKEN')) {
            await endSession();
            return null;
          }
          throw err; // offline / timeout: keep the session, the request fails as such
        }
      },

      async setUser(user) {
        const { refreshToken } = get();
        if (refreshToken) await storage.save({ refreshToken, user });
        set({ user });
      },
    };
  });
  return store;
}
