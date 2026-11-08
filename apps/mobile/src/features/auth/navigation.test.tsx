import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import type { SessionState } from './session';

// Renders the real src/app routes with the session starting in a chosen state, then checks
// where the user ends up. (`mock` prefix: jest.mock factories may only use such variables.)
let mockInitialState: SessionState = { status: 'signedOut', onboarded: false };

jest.mock('./session', () => {
  const actual: typeof import('./session') = jest.requireActual('./session');
  return {
    ...actual,
    SessionProvider: ({ children }: { children: React.ReactNode }) => (
      <actual.SessionProvider initialState={mockInitialState}>{children}</actual.SessionProvider>
    ),
  };
});

async function open(state: SessionState, url = '/') {
  mockInitialState = state;
  return renderRouter('src/app', { initialUrl: url });
}

const SIGNED_OUT: SessionState = { status: 'signedOut', onboarded: false };
const NEW_USER: SessionState = { status: 'signedIn', onboarded: false };
const RETURNING: SessionState = { status: 'signedIn', onboarded: true };

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

  it('a session that is still loading shows nothing yet (the splash screen stays)', async () => {
    await open({ status: 'loading', onboarded: false });
    expect(screen.queryByRole('header')).toBeNull();
  });

  it('follows the session through sign-in, onboarding and sign-out', async () => {
    const router = await open(SIGNED_OUT);
    expect(router.getPathname()).toBe('/welcome');

    await fireEvent.press(screen.getByRole('button', { name: 'Demo: new user' }));
    expect(router.getPathname()).toBe('/profile');

    await fireEvent.press(screen.getByRole('button', { name: 'Finish onboarding' }));
    expect(router.getPathname()).toBe('/today');
  });

  it('signing out from the app returns to welcome', async () => {
    const router = await open(RETURNING, '/more');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(router.getPathname()).toBe('/welcome');
  });
});
