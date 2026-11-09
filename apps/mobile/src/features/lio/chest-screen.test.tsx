import type { ChestReward, Progress, PublicHabit, PublicUser } from '@life-os/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { authStore } from '@/features/auth/auth-instance';
import { localToday } from '@/features/tasks/dates';
import { calls, resetMockApi, routes } from '@/test/mock-auth-instance';

jest.mock('@/features/auth/auth-instance', () => jest.requireActual('@/test/mock-auth-instance'));

const TODAY = localToday('UTC');
const USER: PublicUser = {
  id: 'u1',
  email: 'tina@example.com',
  displayName: 'Tina',
  emailVerifiedAt: null,
  onboardingCompletedAt: '2026-11-08T10:00:00.000Z',
  createdAt: '2026-11-08T09:00:00.000Z',
};
const progress = (o: Partial<Progress> = {}): Progress => ({
  xp: 1240,
  streak: { current: 12, best: 21 },
  level: { level: 5, start: 1000, next: 1500, toNext: 260 },
  dailyChest: 'ready',
  ...o,
});
const READ: PublicHabit = {
  id: 'h1',
  name: 'Read 20 min',
  icon: 'book-open',
  color: 'violet',
  targetCount: 1,
  unit: null,
  goalDays: 21,
  startDate: '2026-10-01',
  archivedAt: null,
  sortOrder: 0,
  schedule: { frequency: 'DAILY' },
  dueToday: true,
  today: { localDate: TODAY, count: 1, completedAt: 'x' },
  streak: { current: 14, best: 14, unit: 'days' },
  chest: { streakDay: 14, collected: false },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};
const reward = (p: Progress): ChestReward => ({ amount: 40, progress: p });

async function open(url: string, p: Progress = progress(), habits: PublicHabit[] = [READ]) {
  authStore.setState({ status: 'signedIn', user: USER, accessToken: 'a', refreshToken: 'r' });
  routes['GET /users/me'] = () => ({
    status: 200,
    body: { data: { user: USER, settings: { theme: 'LIGHT', timezone: 'UTC', weekStartsOn: 1 } } },
  });
  routes['GET /habits'] = () => ({ status: 200, body: { data: habits } });
  routes['GET /habits/h1/days'] = () => ({
    status: 200,
    body: { data: [{ date: TODAY, state: 'done', count: 1 }] },
  });
  routes['GET /progress'] = () => ({ status: 200, body: { data: p } });
  return renderRouter('src/app', { initialUrl: url });
}

beforeEach(async () => {
  resetMockApi();
  await AsyncStorage.clear();
});

describe('chests', () => {
  it('Lio page: the daily chest is locked until a task is done today', async () => {
    await open('/lio', progress({ dailyChest: 'locked' }));
    expect(await screen.findByText('Finish one task to open it')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Open' })).toBeNull();
  });

  it('daily chest: Open → the chest screen → Collect pays it and goes back', async () => {
    const after = progress({ xp: 1280, dailyChest: 'collected' });
    const router = await open('/lio');
    routes['POST /progress/daily-chest'] = () => {
      // Like the server: from now on the chest reads as collected.
      routes['GET /progress'] = () => ({ status: 200, body: { data: after } });
      return { status: 200, body: { data: reward(after) } };
    };
    await fireEvent.press(await screen.findByRole('button', { name: 'Open' }));
    await waitFor(() => expect(router.getPathname()).toBe('/chest'));
    expect(await screen.findByText('Chest opened!')).toBeOnTheScreen();
    expect(screen.getByLabelText('Daily reward: plus 40 XP')).toBeOnTheScreen();
    expect(screen.getByLabelText('12-day streak')).toBeOnTheScreen();
    expect(screen.getByText('Level 5 · 260 XP to level 6')).toBeOnTheScreen();
    // Nothing is paid until Collect.
    expect(calls.some((c) => c.route === 'POST /progress/daily-chest')).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Collect' }));
    await waitFor(() => expect(router.getPathname()).toBe('/lio'));
    expect(calls.filter((c) => c.route === 'POST /progress/daily-chest')).toHaveLength(1);
    // The new progress is put in the cache; React Query tells the screen on a timer.
    await act(async () => {
      jest.advanceTimersByTime(50);
    });
    expect(await screen.findByText('Daily chest opened')).toBeOnTheScreen();
  });

  it('habit chest: today’s 🎁 on the path opens it, and Collect pays it', async () => {
    routes['POST /habits/h1/chest'] = () => ({ status: 200, body: { data: reward(progress()) } });
    const router = await open('/habits');
    await fireEvent.press(
      await screen.findByRole('button', {
        name: 'Today, Read 20 min, done. Day 14 chest to open',
      }),
    );
    await waitFor(() => expect(router.getPathname()).toBe('/chest'));
    expect(await screen.findByLabelText('Read 20 min · day 14: plus 40 XP')).toBeOnTheScreen();
    expect(screen.getByLabelText('14-day streak')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Collect' }));
    await waitFor(() =>
      expect(calls.filter((c) => c.route === 'POST /habits/h1/chest')).toHaveLength(1),
    );
  });

  it('the habit detail’s button says to open the chest', async () => {
    const router = await open('/habit/h1');
    await fireEvent.press(await screen.findByRole('button', { name: 'Open your chest' }));
    await waitFor(() => expect(router.getPathname()).toBe('/chest'));
  });

  it('an opened chest is just a done day again', async () => {
    await open('/habits', progress(), [{ ...READ, chest: { streakDay: 14, collected: true } }]);
    expect(
      await screen.findByRole('button', { name: 'Today, Read 20 min, done' }),
    ).toBeOnTheScreen();
  });

  it('a chest that isn’t ready says so, and pays nothing', async () => {
    await open('/chest?kind=daily', progress({ dailyChest: 'locked' }));
    expect(await screen.findByText('This chest isn’t ready yet')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Collect' })).toBeNull();
  });
});
