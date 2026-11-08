import type { Progress, PublicUser } from '@life-os/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
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
const PROGRESS: Progress = {
  xp: 1240,
  streak: { current: 12, best: 21 },
  level: { level: 5, start: 1000, next: 1500, toNext: 260 },
};

async function open(url: string, progress: Progress = PROGRESS) {
  authStore.setState({ status: 'signedIn', user: USER, accessToken: 'a', refreshToken: 'r' });
  routes['GET /users/me'] = () => ({
    status: 200,
    body: { data: { user: USER, settings: { theme: 'LIGHT', timezone: 'UTC', weekStartsOn: 1 } } },
  });
  routes['GET /habits'] = () => ({ status: 200, body: { data: [] } });
  routes['GET /progress'] = () => ({ status: 200, body: { data: progress } });
  return renderRouter('src/app', { initialUrl: url });
}

beforeEach(async () => {
  resetMockApi();
  await AsyncStorage.clear();
});

describe('Lio', () => {
  it('the bubble floats on the tabs and opens the Lio page', async () => {
    const router = await open('/habits');
    await screen.findByText('No habits yet');
    await fireEvent.press(screen.getByRole('button', { name: 'Lio' }));
    await waitFor(() => expect(router.getPathname()).toBe('/lio'));
  });

  it('shows the streak, the level and the XP to the next one, like the design', async () => {
    await open('/lio');
    expect(await screen.findByRole('header', { name: 'Lio · Level 5' })).toBeOnTheScreen();
    expect(screen.getByText('12 days strong!')).toBeOnTheScreen();
    expect(screen.getByText('260 XP to level 6')).toBeOnTheScreen();
    // 240 of the 500 XP between level 5 and 6.
    expect(screen.getByRole('progressbar', { name: 'Level 6' })).toHaveProp('accessibilityValue', {
      min: 0,
      max: 100,
      now: 48,
    });
    expect(screen.getByLabelText('12-day streak')).toBeOnTheScreen();
    expect(screen.getByLabelText('1,240 XP')).toBeOnTheScreen();
    // The page is pushed over the tabs: no bubble on it.
    expect(screen.queryByTestId('lio-bubble')).toBeNull();
  });

  it('no streak yet: no "days strong" pill', async () => {
    await open('/lio', {
      xp: 0,
      streak: { current: 0, best: 0 },
      level: { level: 1, start: 0, next: 100, toNext: 100 },
    });
    expect(await screen.findByText('100 XP to level 2')).toBeOnTheScreen();
    expect(screen.queryByText(/days? strong!/)).toBeNull();
  });
});
