import type { PublicUser } from '@life-os/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dehydrate, useIsRestoring, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { authStore } from '@/features/auth/auth-instance';
import { createQueryClient } from './query-client';
import { QueryProvider } from './query-provider';

jest.mock('@/features/auth/auth-instance', () => jest.requireActual('@/test/mock-auth-instance'));

const user = (id: string): PublicUser => ({
  id,
  email: `${id}@example.com`,
  displayName: id,
  emailVerifiedAt: null,
  onboardingCompletedAt: null,
  createdAt: '2026-11-08T09:00:00.000Z',
});
const signInAs = (id: string) =>
  act(() =>
    authStore.setState({ status: 'signedIn', user: user(id), refreshToken: 'r', accessToken: 'a' }),
  );
const signOut = () =>
  act(() =>
    authStore.setState({ status: 'signedOut', user: null, refreshToken: null, accessToken: null }),
  );

// Shows what the current client holds for ['secret'] once the saved cache is restored.
const clients: QueryClient[] = [];
function Probe() {
  const client = useQueryClient();
  const restoring = useIsRestoring();
  if (clients.at(-1) !== client) clients.push(client);
  const data = client.getQueryData<string>(['secret']);
  return <Text testID="probe">{restoring ? 'restoring' : (data ?? 'empty')}</Text>;
}

// Puts a saved cache on "disk" directly, in the persister's format, as if an earlier session
// had left it there. (Going through the persister would hit its 1 s throttle between tests.)
async function saveCacheFor(userId: string, secret: string) {
  const client = createQueryClient();
  clients.push(client);
  client.setQueryData(['secret'], secret);
  const persisted = { timestamp: Date.now(), buster: userId, clientState: dehydrate(client) };
  await AsyncStorage.setItem('lifeos.queryCache', JSON.stringify(persisted));
}

beforeEach(async () => {
  clients.length = 0;
  await AsyncStorage.clear();
});

// Query clients keep unused data for 24 h (gcTime) with a timer each; clear them so Jest can exit.
afterEach(() => {
  for (const client of clients) client.clear();
});

describe('QueryProvider', () => {
  it("restores the user's own saved cache", async () => {
    await signInAs('alice'); // the cache is only ever written while signed in
    await saveCacheFor('alice', "alice's tasks");
    await render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent("alice's tasks"));
  });

  it("never shows another user's saved cache", async () => {
    // A cache Alice left behind (say the app was killed before sign-out could delete it),
    // tagged with her ID. Bob is signed in when it's found.
    await signInAs('bob');
    await saveCacheFor('alice', "alice's tasks");
    await render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('empty'));
  });

  it('switching user gives a brand-new client (nothing carried over in memory)', async () => {
    await signInAs('alice');
    await render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('empty'));
    await act(async () => {
      clients.at(-1)?.setQueryData(['secret'], "alice's tasks");
    });

    await signOut();
    await signInAs('bob');
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('empty'));
    expect(new Set(clients).size).toBeGreaterThanOrEqual(2);
  });

  it('signing out deletes the saved cache', async () => {
    await signInAs('alice'); // the cache is only ever written while signed in
    await saveCacheFor('alice', "alice's tasks");
    await render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent("alice's tasks"));

    // Change the cache just before signing out, so a throttled save is pending.
    await act(async () => {
      clients.at(-1)?.setQueryData(['secret'], "alice's newer tasks");
    });
    await signOut();
    // Wait past the 1 s save throttle: the pending save must not write the data back.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    });
    expect(await AsyncStorage.getItem('lifeos.queryCache')).toBeNull();
  });
});
