import type { HabitDay, PublicHabit, PublicUser } from '@life-os/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { act } from 'react';
import { authStore } from '@/features/auth/auth-instance';
import { localToday } from '@/features/tasks/dates';
import { lightColors } from '@/theme/colors';
import { calls, resetMockApi, routes } from '@/test/mock-auth-instance';

jest.mock('@/features/auth/auth-instance', () => jest.requireActual('@/test/mock-auth-instance'));

const ZONE = 'Africa/Dar_es_Salaam';
const TODAY = localToday(ZONE);
const MONTH = TODAY.slice(0, 7);
const USER: PublicUser = {
  id: 'u1',
  email: 'tina@example.com',
  displayName: 'Tina',
  emailVerifiedAt: null,
  onboardingCompletedAt: '2026-11-08T10:00:00.000Z',
  createdAt: '2026-11-08T09:00:00.000Z',
};
const habit = (o: Partial<PublicHabit> = {}): PublicHabit => ({
  id: 'h1',
  name: 'Read 20 min',
  icon: 'book-open',
  color: 'violet',
  targetCount: 1,
  unit: null,
  goalDays: 21,
  startDate: `${MONTH}-01`,
  archivedAt: null,
  sortOrder: 0,
  schedule: { frequency: 'DAILY' },
  dueToday: true,
  today: null,
  streak: { current: 12, best: 21, unit: 'days' },
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...o,
});
// The server answers each day of the asked range; here the 1st is done and the 2nd missed.
function days(from: string, to: string): HabitDay[] {
  const out: HabitDay[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to;) {
    const date = d.toISOString().slice(0, 10);
    let state: HabitDay['state'] = date < TODAY ? 'done' : date === TODAY ? 'today' : 'upcoming';
    if (date === `${MONTH}-02` && date < TODAY) state = 'missed';
    out.push({ date, state, count: state === 'done' ? 1 : 0 });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

async function openDetail(
  h: PublicHabit,
  url = '/habit/h1',
  stats: { consistency: number | null; totalDays: number } = { consistency: 86, totalDays: 48 },
) {
  authStore.setState({ status: 'signedIn', user: USER, accessToken: 'a', refreshToken: 'r' });
  routes['GET /users/me'] = () => ({
    status: 200,
    body: { data: { user: USER, settings: { theme: 'LIGHT', timezone: ZONE, weekStartsOn: 1 } } },
  });
  routes['GET /habits'] = () => ({ status: 200, body: { data: [h] } });
  routes['GET /progress'] = () => ({
    status: 200,
    body: { data: { xp: 0, streak: { current: 0, best: 0 } } },
  });
  routes['GET /habits/h1/stats'] = () => ({ status: 200, body: { data: stats } });
  routes['GET /habits/h1/days'] = (_body, path) => {
    const query = new URLSearchParams(path.split('?')[1]);
    return {
      status: 200,
      body: { data: days(query.get('from') ?? TODAY, query.get('to') ?? TODAY) },
    };
  };
  return renderRouter('src/app', { initialUrl: url });
}

beforeEach(async () => {
  resetMockApi();
  // The app saves its query cache; start each test without the last one's habit.
  await AsyncStorage.clear();
});

describe('Habit detail (the design’s screen)', () => {
  it('shows the streak, the three tiles and this month’s days', async () => {
    await openDetail(habit());
    expect(await screen.findByRole('header', { name: 'Read 20 min' })).toBeOnTheScreen();
    expect(screen.getByText('Every day')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('12-day streak. Best: 21 days. Plus 5 XP a day.'),
    ).toBeOnTheScreen();
    expect(await screen.findByLabelText('Consistency: 86%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Total days: 48')).toBeOnTheScreen();
    expect(screen.getByLabelText('Best streak: 21')).toBeOnTheScreen();
    expect(screen.getByText('Missed days are okay')).toBeOnTheScreen();
    expect(await screen.findByTestId(`day-${TODAY}`)).toHaveProp(
      'accessibilityLabel',
      expect.stringMatching(/today, not done yet$/),
    );
    if (TODAY > `${MONTH}-02`) {
      expect(screen.getByTestId(`day-${MONTH}-02`)).toHaveProp(
        'accessibilityLabel',
        expect.stringMatching(/, missed$/),
      );
      // The colours: green done, grey missed, purple today.
      expect(screen.getByTestId(`day-${MONTH}-02`)).toHaveStyle({
        backgroundColor: lightColors.quest.day.missedFill,
      });
      expect(screen.getByTestId(`day-${MONTH}-01`)).toHaveStyle({
        backgroundColor: lightColors.quest.day.doneFill,
      });
    }
    expect(screen.getByTestId(`day-${TODAY}`)).toHaveStyle({
      backgroundColor: lightColors.accent.fill,
    });
  });

  it('Mark done today checks in, with the toast and Undo', async () => {
    routes['POST /habits/h1/completions'] = (body) => ({
      status: 201,
      body: {
        data: {
          completion: { localDate: body?.['localDate'], count: 1, completedAt: 'x' },
          streak: { current: 13, best: 21, unit: 'days' },
        },
      },
    });
    await openDetail(habit());
    await fireEvent.press(await screen.findByRole('button', { name: 'Mark done today' }));
    await waitFor(() =>
      expect(
        calls.filter((c) => c.route === 'POST /habits/h1/completions').map((c) => c.body),
      ).toEqual([{ localDate: TODAY }]),
    );
    const toast = await screen.findByTestId('toast');
    expect(within(toast).getByText('Day 13! +5 XP')).toBeOnTheScreen();
  });

  it('a count habit: the button adds one', async () => {
    await openDetail(
      habit({
        targetCount: 8,
        unit: 'glasses',
        today: { localDate: TODAY, count: 3, completedAt: 'x' },
      }),
    );
    expect(
      await screen.findByRole('button', { name: 'Add one · 3 of 8 glasses' }),
    ).toBeOnTheScreen();
  });

  it('done today: the button asks before undoing', async () => {
    await openDetail(habit({ today: { localDate: TODAY, count: 1, completedAt: 'x' } }));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await fireEvent.press(await screen.findByRole('button', { name: 'Done today' }));
    const [title] = alert.mock.calls.at(-1) ?? [];
    alert.mockRestore();
    expect(title).toBe('Undo this day?');
    expect(calls.some((c) => c.route.startsWith('DELETE'))).toBe(false);
  });

  it('not one of its days: no button; a new habit has no consistency yet', async () => {
    await openDetail(
      habit({ dueToday: false, schedule: { frequency: 'WEEKLY_DAYS', weekdays: [1] } }),
      '/habit/h1',
      { consistency: null, totalDays: 0 },
    );
    expect(await screen.findByLabelText('Consistency: not yet')).toBeOnTheScreen();
    expect(screen.getByText('–')).toBeOnTheScreen();
    expect(screen.getByLabelText('Total days: 0')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Mark done today' })).toBeNull();
  });

  it('opens from the habit card on Habits; the pencil opens the edit sheet', async () => {
    const router = await openDetail(habit(), '/habits');
    await fireEvent.press(await screen.findByTestId('habit-card'));
    await waitFor(() => expect(router.getPathname()).toBe('/habit/h1'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Edit habit' }));
    await waitFor(() => expect(router.getPathname()).toBe('/habit-form'));
  });

  it('a habit that’s gone says so', async () => {
    await openDetail(habit(), '/habit/nope');
    expect(await screen.findByText('This habit isn’t here any more')).toBeOnTheScreen();
    await act(async () => {});
  });
});
