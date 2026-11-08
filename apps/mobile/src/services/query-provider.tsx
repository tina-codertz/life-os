import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { type ReactNode, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { authStore } from '@/features/auth/auth-instance';
import { CACHE_MAX_AGE, createQueryClient } from './query-client';
import { connectQueryToDevice } from './network';

// The saved cache: server data (tasks, habits…) so screens show something offline. Never
// tokens. AsyncStorage is not encrypted; the OS's file protection applies (docs/04 §4.4).
//
// Saves are throttled (at most one per second), so a save scheduled for one user can run *after*
// they signed out, or after someone else signed in. The storage therefore only writes a cache
// that belongs to whoever is signed in right now (its `buster` is their user ID); anything else
// is dropped instead of resurrecting or overwriting data.
const userOnlyStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: async (key: string, value: string) => {
    const currentUser = authStore.getState().user?.id;
    if (currentUser && ownerOf(value) === currentUser) await AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

function ownerOf(serialized: string): string | null {
  try {
    const value: unknown = JSON.parse(serialized);
    return typeof value === 'object' &&
      value !== null &&
      'buster' in value &&
      typeof value.buster === 'string'
      ? value.buster
      : null;
  } catch {
    return null;
  }
}

export const queryPersister = createAsyncStoragePersister({
  storage: userOnlyStorage,
  key: 'lifeos.queryCache',
  throttleTime: 1000,
});

// Server data belongs to one user. Each user gets their own client (keyed below), the saved
// cache is tagged with their ID (`buster`: another user's cache is discarded on restore), and
// signing out deletes it.
export function QueryProvider({ children }: { children: ReactNode }) {
  const userId = useStore(authStore, (s) => s.user?.id ?? null);

  useEffect(() => connectQueryToDevice(), []);
  useEffect(() => {
    if (userId === null) void queryPersister.removeClient();
  }, [userId]);

  return (
    <UserQueryProvider key={userId ?? 'signed-out'} userId={userId}>
      {children}
    </UserQueryProvider>
  );
}

function UserQueryProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [client] = useState(createQueryClient);

  if (!userId) return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister: queryPersister, maxAge: CACHE_MAX_AGE, buster: userId }}
      // Changes made offline (paused mutations) are sent once the cache is back (ADR-010).
      onSuccess={() => client.resumePausedMutations()}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
