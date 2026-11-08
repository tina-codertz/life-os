import type { PublicUser } from '@life-os/shared';
import { act, renderRouter, waitFor } from 'expo-router/testing-library';
import { authStore } from '@/features/auth/auth-instance';
import { resetMockApi, routes } from '@/test/mock-auth-instance';

jest.mock('@/features/auth/auth-instance', () => jest.requireActual('@/test/mock-auth-instance'));

const USER: PublicUser = {
  id: 'u1',
  email: 'tina@example.com',
  displayName: 'Tina',
  emailVerifiedAt: null,
  onboardingCompletedAt: '2026-11-08T10:00:00.000Z',
  createdAt: '2026-11-08T09:00:00.000Z',
};

beforeEach(() => resetMockApi());

// A link that opens the app from cold: the URL arrives while the stored session is still being
// read. Once the session is known, the user must land where the link pointed.
it('a deep link opened during launch still lands on its screen once the session loads', async () => {
  routes['GET /tasks'] = () => ({
    status: 200,
    body: { data: [], meta: { nextCursor: null, hasMore: false } },
  });
  routes['GET /categories'] = () => ({ status: 200, body: { data: [] } });
  const realHydrate = authStore.getState().hydrate;
  let finishLaunch: (() => void) | undefined;
  authStore.setState({
    status: 'loading',
    user: null,
    accessToken: null,
    refreshToken: null,
    hydrate: () =>
      new Promise<void>((resolve) => {
        finishLaunch = () => {
          authStore.setState({
            status: 'signedIn',
            user: USER,
            accessToken: 'a',
            refreshToken: 'r',
          });
          resolve();
        };
      }),
  });

  try {
    const router = await renderRouter('src/app', { initialUrl: '/tasks' });
    await act(async () => finishLaunch?.());
    await waitFor(() => expect(router.getPathname()).toBe('/tasks'));
  } finally {
    authStore.setState({ hydrate: realHydrate });
  }
});

// The app is already open on Today when a link to another tab arrives.
it('a link to another tab switches to it while the app is open', async () => {
  routes['GET /tasks'] = () => ({
    status: 200,
    body: { data: [], meta: { nextCursor: null, hasMore: false } },
  });
  routes['GET /categories'] = () => ({ status: 200, body: { data: [] } });
  authStore.setState({ status: 'signedIn', user: USER, accessToken: 'a', refreshToken: 'r' });
  const router = await renderRouter('src/app', { initialUrl: '/today' });
  expect(router.getPathname()).toBe('/today');

  const { router: appRouter } = jest.requireActual<typeof import('expo-router')>('expo-router');
  await act(async () => appRouter.navigate('/tasks'));
  await waitFor(() => expect(router.getPathname()).toBe('/tasks'));
});
