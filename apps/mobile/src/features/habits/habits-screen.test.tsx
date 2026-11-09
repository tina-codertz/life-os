import type { HabitDay, PublicHabit, PublicUser } from '@life-os/shared';
import { fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { act } from 'react';
import { authStore } from '@/features/auth/auth-instance';
import { addDays, localToday } from '@/features/tasks/dates';
import { apiError, calls, resetMockApi, routes } from '@/test/mock-auth-instance';

jest.mock('@/features/auth/auth-instance', () => jest.requireActual('@/test/mock-auth-instance'));

const ZONE = 'Africa/Dar_es_Salaam';
const TODAY = localToday(ZONE);
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
  startDate: addDays(TODAY, -30),
  archivedAt: null,
  sortOrder: 0,
  schedule: { frequency: 'DAILY' },
  dueToday: true,
  today: null,
  streak: { current: 12, best: 12, unit: 'days' },
  chest: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...o,
});
// The last few days: done, missed, done, done, then today (not done yet).
const DAYS: HabitDay[] = [
  { date: addDays(TODAY, -4), state: 'done', count: 1 },
  { date: addDays(TODAY, -3), state: 'missed', count: 0 },
  { date: addDays(TODAY, -2), state: 'done', count: 1 },
  { date: addDays(TODAY, -1), state: 'done', count: 1 },
  { date: TODAY, state: 'today', count: 0 },
];

const posts = (path: string) => calls.filter((c) => c.route === `POST ${path}`).map((c) => c.body);

async function openHabits(list: PublicHabit[], days: HabitDay[] = DAYS) {
  authStore.setState({ status: 'signedIn', user: USER, accessToken: 'a', refreshToken: 'r' });
  routes['GET /users/me'] = () => ({
    status: 200,
    body: { data: { user: USER, settings: { theme: 'LIGHT', timezone: ZONE, weekStartsOn: 1 } } },
  });
  routes['GET /habits'] = () => ({ status: 200, body: { data: list } });
  routes['GET /progress'] = () => ({
    status: 200,
    body: { data: { xp: 1240, streak: { current: 12, best: 21 } } },
  });
  for (const h of list) {
    routes[`GET /habits/${h.id}/days`] = () => ({ status: 200, body: { data: days } });
  }
  return renderRouter('src/app', { initialUrl: '/habits' });
}

beforeEach(() => resetMockApi());

describe('Habits (the quest path)', () => {
  it('no habits yet: Lio sleeps, and New habit opens the sheet', async () => {
    const router = await openHabits([]);
    expect(await screen.findByText('No habits yet')).toBeOnTheScreen();
    const buttons = screen.getAllByRole('button', { name: 'New habit' });
    await fireEvent.press(buttons.at(-1)!);
    await waitFor(() => expect(router.getPathname()).toBe('/habit-form'));
  });

  it('the tab bar is in the design’s order, and Calendar opens from the Habits header', async () => {
    const router = await openHabits([]);
    await screen.findByText('No habits yet');
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityLabel)).toEqual([
      'Today',
      'Habits',
      'Tasks',
      'Money',
      'Settings',
    ]);
    await fireEvent.press(screen.getByRole('button', { name: 'Calendar' }));
    await waitFor(() => expect(router.getPathname()).toBe('/calendar'));
  });

  it('shows the 🔥 and ⚡ chips, the habit card and its path, like the design', async () => {
    await openHabits([habit(), habit({ id: 'h2', name: 'Workout', icon: 'dumbbell' })]);
    expect(await screen.findByText('READ 20 MIN · DAY 12 OF 21')).toBeOnTheScreen();
    expect(screen.getByText('Every day')).toBeOnTheScreen();
    expect(screen.getByLabelText('12-day streak')).toBeOnTheScreen();
    expect(screen.getByLabelText('1,240 XP')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Read 20 min' })).toBeSelected();
    // The path: past days in words, today's star, what's ahead.
    expect(
      await screen.findByRole('button', { name: 'Today, Read 20 min, not done yet' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Day 12. Keep going!')).toBeOnTheScreen();
    expect(screen.getByLabelText(/, day 14: a reward$/)).toBeOnTheScreen(); // 13 today, 14 🎁
  });

  it('choosing another habit shows its card', async () => {
    await openHabits([
      habit(),
      habit({
        id: 'h2',
        name: 'Workout',
        schedule: { frequency: 'WEEKLY_DAYS', weekdays: [1, 3, 5] },
      }),
    ]);
    await fireEvent.press(await screen.findByRole('radio', { name: 'Workout' }));
    expect(await screen.findByText('Mon, Wed and Fri')).toBeOnTheScreen();
  });

  it('tapping today checks in, says the new day and XP, and Undo takes it back', async () => {
    routes['POST /habits/h1/completions'] = (body) => ({
      status: 201,
      body: {
        data: {
          completion: { localDate: body?.['localDate'], count: 1, completedAt: 'x' },
          streak: { current: 13, best: 13, unit: 'days' },
        },
      },
    });
    routes[`DELETE /habits/h1/completions/${TODAY}`] = () => ({
      status: 200,
      body: { data: { completion: null, streak: { current: 12, best: 12, unit: 'days' } } },
    });
    await openHabits([habit()]);
    await fireEvent.press(await screen.findByTestId('quest-today'));
    await waitFor(() => expect(posts('/habits/h1/completions')).toEqual([{ localDate: TODAY }]));
    const toast = await screen.findByTestId('toast');
    expect(within(toast).getByText('Day 13! +5 XP')).toBeOnTheScreen();
    await fireEvent.press(within(toast).getByRole('button', { name: 'Undo' }));
    await waitFor(() =>
      expect(calls.some((c) => c.route === `DELETE /habits/h1/completions/${TODAY}`)).toBe(true),
    );
  });

  it('a count habit: each tap adds one ("4 of 8 glasses")', async () => {
    routes['POST /habits/h1/completions'] = (body) => ({
      status: 201,
      body: {
        data: {
          completion: { localDate: TODAY, count: body?.['count'], completedAt: 'x' },
          streak: { current: 12, best: 12, unit: 'days' },
        },
      },
    });
    const water = habit({ name: 'Drink water', targetCount: 8, unit: 'glasses' });
    await openHabits([water], [...DAYS.slice(0, -1), { date: TODAY, state: 'today', count: 3 }]);
    expect(
      await screen.findByRole('button', { name: 'Today, Drink water, 3 of 8 glasses' }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('quest-today'));
    await waitFor(() =>
      expect(posts('/habits/h1/completions')).toEqual([{ localDate: TODAY, count: 4 }]),
    );
    expect(await screen.findByText('4 of 8 glasses')).toBeOnTheScreen();
  });

  it('a missed day in the last week can be marked done', async () => {
    routes['POST /habits/h1/completions'] = () => ({
      status: 201,
      body: { data: { completion: null, streak: { current: 1, best: 12, unit: 'days' } } },
    });
    await openHabits([habit()]);
    const missed = addDays(TODAY, -3);
    await fireEvent.press(await screen.findByRole('button', { name: /, missed$/ }));
    await waitFor(() => expect(posts('/habits/h1/completions')).toEqual([{ localDate: missed }]));
  });

  it('undoing a done day asks first', async () => {
    routes[`DELETE /habits/h1/completions/${addDays(TODAY, -1)}`] = () => ({
      status: 200,
      body: { data: { completion: null, streak: { current: 0, best: 12, unit: 'days' } } },
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await openHabits([habit()]);
    const doneDays = await screen.findAllByRole('button', { name: /, done$/ });
    await fireEvent.press(doneDays.at(-1)!);
    const [title, , buttons = []] = alert.mock.calls.at(-1) ?? [];
    alert.mockRestore();
    expect(title).toBe('Undo this day?');
    expect(calls.some((c) => c.route.startsWith('DELETE'))).toBe(false);
    const undo = buttons.find((b) => b.text === 'Undo');
    await act(async () => undo?.onPress?.());
    await waitFor(() =>
      expect(
        calls.some((c) => c.route === `DELETE /habits/h1/completions/${addDays(TODAY, -1)}`),
      ).toBe(true),
    );
  });

  it('the tick shows at once, before the server answers', async () => {
    routes['POST /habits/h1/completions'] = () => new Promise(() => {}); // held
    await openHabits([habit()]);
    await fireEvent.press(await screen.findByTestId('quest-today'));
    expect(
      await screen.findByRole('button', { name: 'Today, Read 20 min, done' }),
    ).toBeOnTheScreen();
  });

  it('a refused check-in is undone and the server says why', async () => {
    routes['POST /habits/h1/completions'] = () => ({
      status: 422,
      body: apiError('CHECK_IN_OUT_OF_RANGE', 'Unarchive this habit to check in.'),
    });
    await openHabits([habit()]);
    await screen.findByTestId('quest-today');
    // Re-reading never finishes, so only the rollback can put today back.
    routes['GET /habits'] = () => new Promise(() => {});
    routes['GET /habits/h1/days'] = () => new Promise(() => {});
    await fireEvent.press(screen.getByTestId('quest-today'));
    expect(await screen.findByText('Unarchive this habit to check in.')).toBeOnTheScreen();
    // React Query hands cache changes to the screen on a timer, and these tests run on Jest's
    // fake timers: move the clock so the screen shows what the cache now holds.
    await act(async () => {
      jest.advanceTimersByTime(50);
    });
    expect(
      screen.getByRole('button', { name: 'Today, Read 20 min, not done yet' }),
    ).toBeOnTheScreen();
  });
});
