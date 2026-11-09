import type { PublicHabit, PublicUser } from '@life-os/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router as appRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { authStore } from '@/features/auth/auth-instance';
import { localToday } from '@/features/tasks/dates';
import { calls, resetMockApi, routes } from '@/test/mock-auth-instance';

jest.mock('@/features/auth/auth-instance', () => jest.requireActual('@/test/mock-auth-instance'));

// The in-memory phone from jest.setup.js.
const phone = Notifications as typeof Notifications & {
  mockReset: () => void;
  mockSetPermission: (p: string) => void;
};

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
  reminderTimes: [23 * 60 + 59],
  startDate: '2026-10-01',
  archivedAt: null,
  sortOrder: 0,
  schedule: { frequency: 'DAILY' },
  dueToday: true,
  today: null,
  streak: { current: 3, best: 3, unit: 'days' },
  chest: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...o,
});

async function open(url: string, habits: PublicHabit[], remindersOn = true) {
  authStore.setState({ status: 'signedIn', user: USER, accessToken: 'a', refreshToken: 'r' });
  routes['GET /users/me'] = () => ({
    status: 200,
    body: {
      data: {
        user: USER,
        settings: {
          theme: 'LIGHT',
          timezone: ZONE,
          weekStartsOn: 1,
          habitRemindersOn: remindersOn,
        },
      },
    },
  });
  routes['GET /habits'] = () => ({ status: 200, body: { data: habits } });
  routes['GET /habits/h1/days'] = () => ({ status: 200, body: { data: [] } });
  routes['GET /habits/h1/stats'] = () => ({
    status: 200,
    body: { data: { consistency: 100, totalDays: 3 } },
  });
  routes['GET /progress'] = () => ({
    status: 200,
    body: {
      data: {
        xp: 0,
        streak: { current: 0, best: 0 },
        level: { level: 1, start: 0, next: 100, toNext: 100 },
        dailyChest: 'locked',
      },
    },
  });
  return renderRouter('src/app', { initialUrl: url });
}

const scheduledIds = async () =>
  (await Notifications.getAllScheduledNotificationsAsync()).map((n) => n.identifier);

beforeEach(async () => {
  resetMockApi();
  phone.mockReset();
  await AsyncStorage.clear();
});

describe('habit reminders (FR-HAB-006)', () => {
  it('the phone gets a reminder for each of the next 14 days', async () => {
    await open('/habits', [habit()]);
    await waitFor(async () => expect(await scheduledIds()).toHaveLength(14));
    expect((await scheduledIds())[0]).toBe(`habit-reminder:h1:${TODAY}:1439`);
    const [first] = await Notifications.getAllScheduledNotificationsAsync();
    expect(first?.content).toMatchObject({
      title: 'Read 20 min',
      body: 'Keep your 3-day streak going.',
      data: { habitId: 'h1' },
    });
  });

  it('none when reminders are off in Settings', async () => {
    await open('/habits', [habit()], false);
    await screen.findByTestId('quest-today');
    expect(await scheduledIds()).toEqual([]);
  });

  it('none when notifications aren’t allowed', async () => {
    phone.mockSetPermission('denied');
    await open('/habits', [habit()]);
    await screen.findByTestId('quest-today');
    expect(await scheduledIds()).toEqual([]);
  });

  it('the sheet: add a time, save, and notifications are asked for', async () => {
    routes['POST /habits'] = (body) => ({
      status: 201,
      body: { data: habit({ ...(body as Partial<PublicHabit>), id: 'h9' }) },
    });
    await open('/habits', []);
    await screen.findByText('No habits yet');
    await act(async () => appRouter.push('/habit-form'));
    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Stretch');
    await fireEvent.press(screen.getByRole('button', { name: 'Add a reminder' }));
    expect(screen.getByTestId('reminder-picker')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Add 21:00' }));
    expect(screen.getByRole('button', { name: 'Remove the 21:00 reminder' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Create habit' }));
    await waitFor(() =>
      expect(calls.find((c) => c.route === 'POST /habits')?.body).toMatchObject({
        name: 'Stretch',
        reminderTimes: [1260],
      }),
    );
    await waitFor(() => expect(Notifications.getPermissionsAsync).toHaveBeenCalled());
  });

  it('notifications not allowed: saving says how to turn them on', async () => {
    phone.mockSetPermission('denied');
    routes['POST /habits'] = () => ({ status: 201, body: { data: habit({ id: 'h9' }) } });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await open('/habits', []);
    await screen.findByText('No habits yet');
    await act(async () => appRouter.push('/habit-form'));
    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Stretch');
    await fireEvent.press(screen.getByRole('button', { name: 'Add a reminder' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add 21:00' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Create habit' }));
    await waitFor(() =>
      expect(alert.mock.calls.some(([title]) => title === 'Notifications are off')).toBe(true),
    );
    alert.mockRestore();
  });

  it('the habit detail says when, like the design', async () => {
    await open('/habit/h1', [habit({ reminderTimes: [21 * 60] })]);
    expect(await screen.findByText('Every day · reminder 21:00')).toBeOnTheScreen();
  });

  it('Settings → Notifications turns habit reminders off', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await open('/more', [habit()]);
    const reads = routes['GET /users/me'];
    routes['PATCH /users/me/settings'] = (body) => {
      // Like the server: from now on the settings read as changed.
      routes['GET /users/me'] = async (b, path) => {
        const reply = await reads!(b, path);
        const data = (reply.body as { data: { settings: object } }).data;
        return { ...reply, body: { data: { ...data, settings: { ...data.settings, ...body } } } };
      };
      return { status: 200, body: { data: body } };
    };
    await waitFor(async () => expect(await scheduledIds()).toHaveLength(14));
    await fireEvent.press(await screen.findByRole('button', { name: 'Notifications, On' }));
    const [title, , buttons = []] = alert.mock.calls.at(-1) ?? [];
    alert.mockRestore();
    expect(title).toBe('Habit reminders');
    await act(async () => buttons.find((b) => b.text === 'Off')?.onPress?.());
    await waitFor(() =>
      expect(calls.find((c) => c.route === 'PATCH /users/me/settings')?.body).toEqual({
        habitRemindersOn: false,
      }),
    );
    // The scheduled reminders are cancelled at once (the setting changes in the cache first).
    await act(async () => {
      jest.advanceTimersByTime(50);
    });
    await waitFor(async () => expect(await scheduledIds()).toEqual([]));
  });
});
