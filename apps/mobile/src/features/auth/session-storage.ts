import type { PublicUser } from '@life-os/shared';
import * as SecureStore from 'expo-secure-store';

// What survives an app restart. The access token is never stored (docs/04): it lives 15 minutes
// in memory and is re-obtained with the refresh token.
export interface StoredSession {
  refreshToken: string;
  user: PublicUser; // cached so the app opens instantly, and offline
}

export interface SessionStorage {
  load(): Promise<StoredSession | null>;
  save(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
}

const REFRESH_TOKEN_KEY = 'lifeos.refreshToken';
const USER_KEY = 'lifeos.user';

// Keychain (iOS) / Keystore-encrypted storage (Android), never AsyncStorage (plain files).
// AFTER_FIRST_UNLOCK: readable in the background once the phone has been unlocked since boot.
// THIS_DEVICE_ONLY: not copied into backups; a refresh token restored onto a second phone would
// be used twice and trip reuse detection (4.5), logging out both.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const secureSessionStorage: SessionStorage = {
  async load() {
    const [refreshToken, userJson] = await Promise.all([
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY, OPTIONS),
      SecureStore.getItemAsync(USER_KEY, OPTIONS),
    ]);
    if (!refreshToken || !userJson) return null;
    const user = parseUser(userJson);
    return user ? { refreshToken, user } : null;
  },
  async save({ refreshToken, user }) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken, OPTIONS);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user), OPTIONS);
  },
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, OPTIONS),
      SecureStore.deleteItemAsync(USER_KEY, OPTIONS),
    ]);
  },
};

// A damaged or outdated cached user counts as "no session" rather than crashing the launch.
function parseUser(json: string): PublicUser | null {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const { id, email, displayName, emailVerifiedAt, onboardingCompletedAt, createdAt } = value;
  if (typeof id !== 'string' || typeof email !== 'string' || typeof displayName !== 'string') {
    return null;
  }
  return {
    id,
    email,
    displayName,
    emailVerifiedAt: typeof emailVerifiedAt === 'string' ? emailVerifiedAt : null,
    onboardingCompletedAt: typeof onboardingCompletedAt === 'string' ? onboardingCompletedAt : null,
    createdAt: typeof createdAt === 'string' ? createdAt : '',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// For tests: the same contract, in memory.
export function memorySessionStorage(initial: StoredSession | null = null): SessionStorage & {
  current: () => StoredSession | null;
} {
  let stored = initial;
  return {
    load: async () => stored,
    save: async (session) => {
      stored = session;
    },
    clear: async () => {
      stored = null;
    },
    current: () => stored,
  };
}
