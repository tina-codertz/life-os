import type { PublicUser } from '@life-os/shared';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';
import type { FetchLike } from '@/services/http';
import { authStore } from './auth-instance';
import type { AuthState } from './auth-store';

// The real src/app routes and the real auth store, with in-memory storage and a fake API.
// Each test puts the store in a state, renders, and checks where the user ends up.

const user = (onboarded: boolean): PublicUser => ({
  id: 'u1',
  email: 'tina@example.com',
  displayName: 'Tina',
  emailVerifiedAt: null,
  onboardingCompletedAt: onboarded ? '2026-11-08T10:00:00.000Z' : null,
  createdAt: '2026-11-08T09:00:00.000Z',
});

// Function declaration (hoisted), so the jest.mock factory below can use it.
function mockReply(status: number, body?: unknown) {
  return Promise.resolve({
    ok: status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

function mockFetch(...[url, init]: Parameters<FetchLike>): ReturnType<FetchLike> {
  const reply = mockReply;
  if (url.endsWith('/auth/register')) {
    return reply(201, {
      data: { user: user(false), accessToken: 'access-1', refreshToken: 'refresh-1' },
    });
  }
  if (url.endsWith('/users/me') && init.method === 'PATCH') return reply(200, { data: user(true) });
  if (url.endsWith('/users/me/settings')) return reply(200, { data: {} });
  if (url.endsWith('/auth/logout')) return reply(204);
  return reply(404, { error: { code: 'NOT_FOUND', message: 'nope', details: [], requestId: 'r' } });
}

jest.mock('./auth-instance', () => {
  const { createAuthStore } = jest.requireActual<typeof import('./auth-store')>('./auth-store');
  const { memorySessionStorage } =
    jest.requireActual<typeof import('./session-storage')>('./session-storage');
  const store = createAuthStore({
    storage: memorySessionStorage(),
    baseUrl: 'http://api.test',
    fetch: mockFetch,
  });
  return { authStore: store, api: () => store.getState().http };
});

const SIGNED_OUT: AuthState = {
  status: 'signedOut',
  user: null,
  accessToken: null,
  refreshToken: null,
};
const signedIn = (onboarded: boolean): AuthState => ({
  status: 'signedIn',
  user: user(onboarded),
  accessToken: 'access-0',
  refreshToken: 'refresh-0',
});
const NEW_USER = signedIn(false);
const RETURNING = signedIn(true);

async function open(state: AuthState, url = '/') {
  authStore.setState(state);
  return renderRouter('src/app', { initialUrl: url });
}

// The confirmation dialog the app opened, and its buttons.
async function pressSignOut() {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  const [title, message, buttons = []] = alert.mock.calls.at(-1) ?? [];
  alert.mockRestore();
  const choices: AlertButton[] = buttons;
  return { title, message, buttons: choices };
}

describe('auth gate', () => {
  it.each([
    ['signed out', SIGNED_OUT, '/welcome'],
    ['signed in, not onboarded', NEW_USER, '/profile'],
    ['signed in and onboarded', RETURNING, '/today'],
  ])('"/" sends a %s user to %s', async (_who, state, path) => {
    const router = await open(state);
    expect(router.getPathname()).toBe(path);
  });

  it.each([
    ['signed-out user to the app', SIGNED_OUT, '/today', '/welcome'],
    ['signed-out user to onboarding', SIGNED_OUT, '/profile', '/welcome'],
    ['new user past onboarding', NEW_USER, '/today', '/profile'],
    ['signed-in user back to login', RETURNING, '/login', '/today'],
    ['onboarded user back to onboarding', RETURNING, '/profile', '/today'],
  ])('a deep link cannot take a %s', async (_case, state, url, expected) => {
    const router = await open(state, url);
    expect(router.getPathname()).toBe(expected);
  });

  it('shows nothing while the session is loading (the splash screen stays)', async () => {
    // Real hydration would finish at once with empty storage; swap in one that never ends.
    const realHydrate = authStore.getState().hydrate;
    authStore.setState({ ...SIGNED_OUT, status: 'loading', hydrate: () => new Promise(() => {}) });
    try {
      await renderRouter('src/app', { initialUrl: '/' });
      expect(screen.queryByRole('header')).toBeNull();
    } finally {
      authStore.setState({ hydrate: realHydrate });
    }
  });

  it('follows the session through sign-up, onboarding and sign-out', async () => {
    const router = await open(SIGNED_OUT);
    expect(router.getPathname()).toBe('/welcome');

    await fireEvent.press(screen.getByRole('button', { name: 'Demo: new user' }));
    await waitFor(() => expect(router.getPathname()).toBe('/profile'));

    await fireEvent.press(screen.getByRole('button', { name: 'Skip for now' }));
    await waitFor(() => expect(router.getPathname()).toBe('/today'));
  });

  it('signing out asks first, then returns to welcome', async () => {
    const router = await open(RETURNING, '/more');
    const dialog = await pressSignOut();
    expect(dialog.title).toBe('Sign out?');
    expect(dialog.message).toBe('Are you sure you want to sign out?');
    expect(dialog.buttons.map((b) => [b.text, b.style])).toEqual([
      ['Cancel', 'cancel'],
      ['Sign out', 'destructive'],
    ]);

    await act(async () => dialog.buttons[1]?.onPress?.());
    await waitFor(() => expect(router.getPathname()).toBe('/welcome'));
  });

  it('Cancel keeps the user signed in', async () => {
    const router = await open(RETURNING, '/more');
    const dialog = await pressSignOut();
    await act(async () => dialog.buttons[0]?.onPress?.());
    expect(router.getPathname()).toBe('/more');
    expect(authStore.getState().status).toBe('signedIn');
  });
});
