import type { PublicUser } from '@life-os/shared';
import { renderRouter, waitFor } from 'expo-router/testing-library';
import { Appearance } from 'react-native';
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

it("applies the theme saved in the user's settings (it follows them to a new phone)", async () => {
  const setColorScheme = jest.spyOn(Appearance, 'setColorScheme');
  routes['GET /users/me'] = () => ({
    status: 200,
    body: { data: { user: USER, settings: { theme: 'LIGHT', timezone: 'UTC' } } },
  });
  authStore.setState({ status: 'signedIn', user: USER, accessToken: 'a', refreshToken: 'r' });

  await renderRouter('src/app', { initialUrl: '/today' });

  await waitFor(() => expect(setColorScheme).toHaveBeenLastCalledWith('light'));
  setColorScheme.mockRestore();
});

it('does not ask for settings while signed out', async () => {
  const seen: string[] = [];
  routes['GET /users/me'] = () => {
    seen.push('me');
    return { status: 401 };
  };
  await renderRouter('src/app', { initialUrl: '/' });
  expect(seen).toEqual([]);
});
