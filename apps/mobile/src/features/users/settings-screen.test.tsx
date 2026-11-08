import type { PublicUser } from '@life-os/shared';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, type AlertButton, Appearance } from 'react-native';
import { authStore } from '@/features/auth/auth-instance';
import { apiError, calls, resetMockApi, routes } from '@/test/mock-auth-instance';

jest.mock('@/features/auth/auth-instance', () => jest.requireActual('@/test/mock-auth-instance'));

const USER: PublicUser = {
  id: 'u1',
  email: 'tina@example.com',
  displayName: 'Tina',
  emailVerifiedAt: null,
  onboardingCompletedAt: '2026-11-08T10:00:00.000Z',
  createdAt: '2026-11-08T09:00:00.000Z',
};

// A fake server that remembers the theme, so re-reading settings after a save sees it.
let savedTheme = 'LIGHT';

async function openSettings() {
  authStore.setState({ status: 'signedIn', user: USER, accessToken: 'a', refreshToken: 'r' });
  routes['GET /users/me'] = () => ({
    status: 200,
    body: {
      data: { user: USER, settings: { theme: savedTheme, timezone: 'Africa/Dar_es_Salaam' } },
    },
  });
  await renderRouter('src/app', { initialUrl: '/more' });
  return screen.findByRole('button', { name: 'Appearance, Light' });
}

// Taps Appearance, then the given choice in the dialog the app opened.
async function chooseAppearance(label: string) {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await fireEvent.press(screen.getByRole('button', { name: /^Appearance/ }));
  const buttons: AlertButton[] = alert.mock.calls.at(-1)?.[2] ?? [];
  expect(buttons.map((b) => b.text)).toEqual(['Light', 'Dark', 'System', 'Cancel']);
  await waitFor(() => buttons.find((b) => b.text === label)?.onPress?.());
  alert.mockRestore();
}

beforeEach(() => {
  resetMockApi();
  savedTheme = 'LIGHT';
});

describe('Settings', () => {
  it('shows the profile and preferences, as in the design', async () => {
    await openSettings();
    expect(screen.getByRole('header', { name: 'Settings' })).toBeOnTheScreen();
    expect(screen.getByText('tina@example.com')).toBeOnTheScreen();
    expect(screen.getByLabelText('Time zone, Dar es Salaam')).toBeOnTheScreen();
  });

  it('Appearance: choosing Dark saves it and applies it at once', async () => {
    const setColorScheme = jest.spyOn(Appearance, 'setColorScheme');
    routes['PATCH /users/me/settings'] = (body) => {
      savedTheme = String(body?.['theme']);
      return { status: 200, body: { data: { theme: savedTheme } } };
    };
    await openSettings();

    await chooseAppearance('Dark');

    expect(await screen.findByRole('button', { name: 'Appearance, Dark' })).toBeOnTheScreen();
    await waitFor(() => expect(setColorScheme).toHaveBeenLastCalledWith('dark'));
    expect(calls.filter((c) => c.route === 'PATCH /users/me/settings').map((c) => c.body)).toEqual([
      { theme: 'DARK' },
    ]);
    setColorScheme.mockRestore();
  });

  it('Appearance: if saving fails, the old theme comes back and a toast says so', async () => {
    routes['PATCH /users/me/settings'] = () => ({
      status: 503,
      body: apiError('SERVICE_UNAVAILABLE', 'The database is unavailable.'),
    });
    await openSettings();
    // Re-reading settings never finishes (offline, say), so only the rollback can restore Light.
    routes['GET /users/me'] = () => new Promise(() => {});

    await chooseAppearance('Dark');

    expect(await screen.findByText("Couldn't change the appearance. Try again.")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Appearance, Light' })).toBeOnTheScreen();
  });
});
