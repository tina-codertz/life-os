import type { PublicHabit, PublicUser } from '@life-os/shared';
import { router as appRouter, type Href } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { authStore } from '@/features/auth/auth-instance';
import { calls, resetMockApi, routes } from '@/test/mock-auth-instance';

jest.mock('@/features/auth/auth-instance', () => jest.requireActual('@/test/mock-auth-instance'));

const USER: PublicUser = {
  id: 'u1',
  email: 'tina@example.com',
  displayName: 'Tina',
  emailVerifiedAt: null,
  onboardingCompletedAt: '2026-11-08T10:00:00.000Z',
  createdAt: '2026-11-08T09:00:00.000Z',
};
const READ: PublicHabit = {
  id: 'h1',
  name: 'Read 20 min',
  icon: 'book-open',
  color: 'violet',
  targetCount: 1,
  unit: null,
  goalDays: 21,
  reminderTimes: [],
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
};

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const choose = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));
const tick = (name: string) => fireEvent.press(screen.getByRole('checkbox', { name }));
const bodies = (route: string) => calls.filter((c) => c.route === route).map((c) => c.body);

async function openForm(url: Href) {
  authStore.setState({ status: 'signedIn', user: USER, accessToken: 'a', refreshToken: 'r' });
  routes['GET /users/me'] = () => ({
    status: 200,
    body: { data: { user: USER, settings: { theme: 'LIGHT', timezone: 'UTC', weekStartsOn: 1 } } },
  });
  routes['GET /habits'] = () => ({ status: 200, body: { data: [READ] } });
  routes['GET /progress'] = () => ({
    status: 200,
    body: { data: { xp: 0, streak: { current: 0, best: 0 } } },
  });
  routes['GET /habits/h1/days'] = () => ({ status: 200, body: { data: [] } });
  const router = await renderRouter('src/app', { initialUrl: '/habits' });
  await act(async () => appRouter.push(url));
  return router;
}

beforeEach(() => resetMockApi());

describe('habit sheet', () => {
  it('creates a habit with icon, colour, some days, a target and a challenge', async () => {
    routes['POST /habits'] = (body) => ({
      status: 201,
      body: { data: { ...READ, ...body, id: 'h9' } },
    });
    const router = await openForm('/habit-form');

    await fireEvent.changeText(await screen.findByLabelText('Name'), ' Drink water ');
    await choose('Water');
    await choose('Sky');
    await choose('Some days'); // starts on Mon, Wed, Fri
    await tick('Sun');
    await fireEvent.changeText(screen.getByLabelText('How many a day?'), '8');
    await fireEvent.changeText(await screen.findByLabelText('Of what?'), 'glasses');
    await choose('30 days');
    await press('Create habit');

    await waitFor(() => expect(bodies('POST /habits')).toHaveLength(1));
    expect(bodies('POST /habits')[0]).toEqual({
      name: 'Drink water',
      icon: 'droplet',
      color: 'blue',
      targetCount: 8,
      unit: 'glasses',
      goalDays: 30,
      reminderTimes: [],
      schedule: { frequency: 'WEEKLY_DAYS', weekdays: [0, 1, 3, 5] },
    });
    await waitFor(() => expect(router.getPathname()).toBe('/habits'));
  });

  it('needs a name', async () => {
    await openForm('/habit-form');
    await screen.findByLabelText('Name');
    await press('Create habit');
    expect(await screen.findByText('Give the habit a name.')).toBeOnTheScreen();
    expect(bodies('POST /habits')).toHaveLength(0);
  });

  it('editing: an unchanged schedule isn’t sent (it would start a new version)', async () => {
    routes['PATCH /habits/h1'] = (body) => ({ status: 200, body: { data: { ...READ, ...body } } });
    await openForm('/habit-form?id=h1');
    await fireEvent.changeText(await screen.findByDisplayValue('Read 20 min'), 'Read 30 min');
    await press('Save');
    await waitFor(() => expect(bodies('PATCH /habits/h1')).toHaveLength(1));
    expect(bodies('PATCH /habits/h1')[0]).not.toHaveProperty('schedule');
    expect(bodies('PATCH /habits/h1')[0]).toMatchObject({ name: 'Read 30 min' });
  });

  it('editing: a changed schedule is sent', async () => {
    routes['PATCH /habits/h1'] = (body) => ({ status: 200, body: { data: { ...READ, ...body } } });
    await openForm('/habit-form?id=h1');
    await screen.findByDisplayValue('Read 20 min');
    await choose('Times a week');
    await choose('4×');
    await press('Save');
    await waitFor(() => expect(bodies('PATCH /habits/h1')).toHaveLength(1));
    expect(bodies('PATCH /habits/h1')[0]).toMatchObject({
      schedule: { frequency: 'TIMES_PER_WEEK', timesPerWeek: 4 },
    });
  });

  it('archive, and delete after asking', async () => {
    routes['POST /habits/h1/archive'] = () => ({ status: 200, body: { data: READ } });
    routes['DELETE /habits/h1'] = () => ({ status: 204 });
    await openForm('/habit-form?id=h1');
    await screen.findByDisplayValue('Read 20 min');
    await press('Archive habit');
    await waitFor(() =>
      expect(calls.some((c) => c.route === 'POST /habits/h1/archive')).toBe(true),
    );

    await act(async () => appRouter.push('/habit-form?id=h1'));
    await screen.findByDisplayValue('Read 20 min');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await press('Delete habit');
    const [title, , buttons = []] = alert.mock.calls.at(-1) ?? [];
    alert.mockRestore();
    expect(title).toBe('Delete this habit?');
    expect(calls.some((c) => c.route === 'DELETE /habits/h1')).toBe(false);
    const remove = buttons.find((b) => b.text === 'Delete');
    await act(async () => remove?.onPress?.());
    await waitFor(() => expect(calls.some((c) => c.route === 'DELETE /habits/h1')).toBe(true));
  });
});
