import type { PublicUser } from '@life-os/shared';
import { getCalendars, Weekday } from 'expo-localization';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Appearance } from 'react-native';
import { authStore } from '@/features/auth/auth-instance';
import { apiError, calls, resetMockApi, routes } from '@/test/mock-auth-instance';
import { resetDraft } from './draft';

jest.mock('@/features/auth/auth-instance', () => jest.requireActual('@/test/mock-auth-instance'));

const NEW_USER: PublicUser = {
  id: 'u1',
  email: 'tina@example.com',
  displayName: 'Tina',
  emailVerifiedAt: null,
  onboardingCompletedAt: null,
  createdAt: '2026-11-08T09:00:00.000Z',
};

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const bodies = (route: string) => calls.filter((c) => c.route === route).map((c) => c.body);

// A new user, signed in; the fake API accepts the onboarding calls.
async function openOnboarding() {
  authStore.setState({ status: 'signedIn', user: NEW_USER, accessToken: 'a', refreshToken: 'r' });
  routes['PATCH /users/me/settings'] = () => ({ status: 200, body: { data: {} } });
  routes['PATCH /users/me'] = (body) => ({
    status: 200,
    body: {
      data: {
        ...NEW_USER,
        displayName: typeof body?.['displayName'] === 'string' ? body['displayName'] : 'Tina',
        onboardingCompletedAt: '2026-11-08T10:00:00.000Z',
      },
    },
  });
  routes['GET /users/me'] = () => ({
    status: 200,
    body: { data: { user: NEW_USER, settings: { theme: 'SYSTEM' } } },
  });
  return renderRouter('src/app', { initialUrl: '/' });
}

beforeEach(() => {
  resetMockApi();
  resetDraft();
});

describe('onboarding', () => {
  it('starts with the name from sign-up and the time zone from the phone', async () => {
    const router = await openOnboarding();
    expect(router.getPathname()).toBe('/profile');
    expect(screen.getByLabelText('What should we call you?').props.value).toBe('Tina');
    expect(screen.getByText('Africa/Dar_es_Salaam')).toBeOnTheScreen();
  });

  it('collects name and theme, saves them, and lands on Today', async () => {
    const setColorScheme = jest.spyOn(Appearance, 'setColorScheme');
    const router = await openOnboarding();

    await fireEvent.changeText(screen.getByLabelText('What should we call you?'), 'Tina K');
    await press('Continue');
    await waitFor(() => expect(router.getPathname()).toBe('/theme'));

    await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeSelected();
    expect(setColorScheme).toHaveBeenLastCalledWith('dark'); // applied live

    await press('Finish');
    await waitFor(() => expect(router.getPathname()).toBe('/today'));
    expect(bodies('PATCH /users/me/settings')).toEqual([
      {
        timezone: 'Africa/Dar_es_Salaam',
        followDeviceTimezone: true,
        weekStartsOn: 1, // the phone's Monday (expo-localization 2) in the API's numbering
        theme: 'DARK',
      },
    ]);
    expect(bodies('PATCH /users/me')).toEqual([
      { displayName: 'Tina K', onboardingCompleted: true },
    ]);
    setColorScheme.mockRestore();
  });

  it('a time zone typed by hand stops following the phone', async () => {
    await openOnboarding();
    await press('Change time zone');
    await fireEvent.changeText(screen.getByLabelText('Time zone'), 'europe/london');
    await press('Continue');
    await fireEvent.press(await screen.findByRole('button', { name: 'Finish' }));

    await waitFor(() => expect(bodies('PATCH /users/me/settings')).toHaveLength(1));
    expect(bodies('PATCH /users/me/settings')[0]).toMatchObject({
      timezone: 'Europe/London',
      followDeviceTimezone: false,
    });
  });

  it('refuses a time zone that does not exist', async () => {
    const router = await openOnboarding();
    await press('Change time zone');
    await fireEvent.changeText(screen.getByLabelText('Time zone'), 'Mars/Base');
    await press('Continue');

    expect(await screen.findByText('Choose a time zone from the list.')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/profile');
  });

  it('skipping still saves the time zone and week start, then opens Today', async () => {
    const router = await openOnboarding();
    await press('Skip for now');

    await waitFor(() => expect(router.getPathname()).toBe('/today'));
    expect(bodies('PATCH /users/me/settings')).toEqual([
      { timezone: 'Africa/Dar_es_Salaam', followDeviceTimezone: true, weekStartsOn: 1 },
    ]);
    expect(bodies('PATCH /users/me')).toEqual([{ onboardingCompleted: true }]);
  });

  it('falls back to UTC and Sunday when the phone does not say', async () => {
    const usual = jest.mocked(getCalendars).getMockImplementation();
    jest
      .mocked(getCalendars)
      .mockReturnValue([
        { timeZone: null, firstWeekday: Weekday.SUNDAY, calendar: null, uses24hourClock: null },
      ]);
    try {
      await openOnboarding();
      expect(screen.getByText('UTC')).toBeOnTheScreen();
      await press('Skip for now');
      await waitFor(() => expect(bodies('PATCH /users/me/settings')).toHaveLength(1));
      expect(bodies('PATCH /users/me/settings')[0]).toMatchObject({
        timezone: 'UTC',
        weekStartsOn: 0,
      });
    } finally {
      // Put the default phone back for the tests after this one.
      if (usual) jest.mocked(getCalendars).mockImplementation(usual);
    }
  });

  it('keeps the user on the theme step if saving fails', async () => {
    const router = await openOnboarding();
    routes['PATCH /users/me/settings'] = () => ({
      status: 503,
      body: apiError('SERVICE_UNAVAILABLE', 'The database is unavailable.'),
    });
    await press('Continue');
    await press('Finish');

    expect(await screen.findByRole('alert')).toHaveTextContent('The database is unavailable.');
    expect(router.getPathname()).toBe('/theme');
    expect(authStore.getState().user?.onboardingCompletedAt).toBeNull();
  });
});
