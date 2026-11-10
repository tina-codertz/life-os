import type {
  CalendarEvent,
  CalendarHabit,
  CalendarRange,
  PublicTask,
  PublicUser,
} from '@life-os/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { authStore } from '@/features/auth/auth-instance';
import { startOfWeek } from '@/features/history/history-dates';
import { addDays, addMonths, formatDayLong, localToday, monthOf } from '@/features/tasks/dates';
import { apiError, calls, resetMockApi, routes } from '@/test/mock-auth-instance';

jest.mock('@/features/auth/auth-instance', () => jest.requireActual('@/test/mock-auth-instance'));

const ZONE = 'Africa/Dar_es_Salaam';
const TODAY = localToday(ZONE);
const MONDAY = startOfWeek(TODAY, 1);
const USER: PublicUser = {
  id: 'u1',
  email: 'tina@example.com',
  displayName: 'Tina',
  emailVerifiedAt: null,
  onboardingCompletedAt: '2026-11-08T10:00:00.000Z',
  createdAt: '2026-11-08T09:00:00.000Z',
};
const EVENT_ID = '0190f1c4-6c1e-7cc0-8000-0000000000e1';
const TASK_ID = '0190f1c4-6c1e-7cc0-8000-0000000000a1';
const HABIT_ID = '0190f1c4-6c1e-7cc0-8000-0000000000b1';

const lunch: CalendarEvent = {
  id: EVENT_ID,
  title: 'Lunch with Amina',
  notes: null,
  location: 'Café',
  color: 'orange',
  startDate: TODAY,
  endDate: TODAY,
  startTime: 750,
  endTime: 810,
  recurrenceRule: null,
  recurrenceUntil: null,
  reminderMinutes: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};
const deepWork: PublicTask = {
  id: TASK_ID,
  title: 'Deep work: auth module',
  description: null,
  priority: 'NONE',
  status: 'TODO',
  dueDate: TODAY,
  dueTime: 600,
  durationMinutes: 120,
  completedAt: null,
  categoryId: null,
  goalId: null,
  milestoneId: null,
  parentId: null,
  recurrenceRule: null,
  subtaskCount: 0,
  subtasksDone: 0,
  sortOrder: 0,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};
const study: CalendarHabit = {
  id: HABIT_ID,
  name: 'Study Prisma relations',
  icon: 'book-open',
  color: 'green',
  reminderTimes: [840],
  days: [{ date: TODAY, state: 'today', count: 0 }],
};

// GET /calendar answers with these for whatever range is asked.
let content: Pick<CalendarRange, 'events' | 'tasks' | 'habits'>;
const ranges = () =>
  calls
    .filter((c) => c.route.startsWith('GET /calendar?'))
    .map((c) => c.route.replace('GET /calendar?', ''));
const sent = (route: string) => calls.filter((c) => c.route === route).map((c) => c.body);
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

async function open(url = '/calendar') {
  authStore.setState({ status: 'signedIn', user: USER, accessToken: 'a', refreshToken: 'r' });
  routes['GET /users/me'] = () => ({
    status: 200,
    body: {
      data: {
        user: USER,
        settings: { theme: 'LIGHT', timezone: ZONE, weekStartsOn: 1, habitRemindersOn: false },
      },
    },
  });
  routes['GET /categories'] = () => ({ status: 200, body: { data: [] } });
  routes['GET /calendar'] = (_body, path) => {
    const query = new URLSearchParams(path.split('?')[1]);
    return {
      status: 200,
      body: { data: { from: query.get('from'), to: query.get('to'), ...content } },
    };
  };
  return renderRouter('src/app', { initialUrl: url });
}

beforeEach(async () => {
  resetMockApi();
  await AsyncStorage.clear();
  content = { events: [lunch], tasks: [deepWork], habits: [study] };
});

describe('Calendar: Day (FR-CAL-001, 004, 005)', () => {
  it('asks for the week and shows the day’s task, event and habit as blocks', async () => {
    await open();
    expect(
      await screen.findByRole('button', {
        name: 'Deep work: auth module, 10:00 – 12:00 · Task',
      }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Lunch with Amina, 12:30 – 13:30 · Event' }));
    expect(screen.getByRole('button', { name: 'Study Prisma relations, 14:00 – 14:30 · Habit' }));
    expect(ranges()).toContain(`from=${MONDAY}&to=${addDays(MONDAY, 6)}`);
    expect(screen.getByRole('tab', { name: formatDayLong(TODAY), selected: true }));
  });

  it('untimed things sit in the All day row', async () => {
    content = {
      events: [],
      tasks: [{ ...deepWork, dueTime: null, durationMinutes: null, title: 'Pay rent' }],
      habits: [{ ...study, reminderTimes: [] }],
    };
    await open();
    expect(await screen.findByText('All day')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pay rent, All day · Task' }));
    expect(screen.getByRole('button', { name: 'Study Prisma relations, All day · Habit' }));
  });

  it('a task block opens the task sheet', async () => {
    const router = await open();
    await fireEvent.press(await screen.findByRole('button', { name: /^Deep work/ }));
    await waitFor(() => expect(router.getPathname()).toBe('/task-form'));
    expect(router.getSearchParams()).toMatchObject({ id: TASK_ID });
  });

  it('a habit block opens the habit', async () => {
    const router = await open();
    await fireEvent.press(await screen.findByRole('button', { name: /^Study Prisma/ }));
    await waitFor(() => expect(router.getPathname()).toBe(`/habit/${HABIT_ID}`));
  });

  it('another day of the week shows that day', async () => {
    content = { events: [], tasks: [{ ...deepWork, dueDate: addDays(MONDAY, 2) }], habits: [] };
    await open();
    await screen.findByRole('tab', { name: formatDayLong(TODAY), selected: true });
    expect(screen.queryByRole('button', { name: /^Deep work/ })).toBeNull();
    await fireEvent.press(screen.getByRole('tab', { name: formatDayLong(addDays(MONDAY, 2)) }));
    expect(await screen.findByRole('button', { name: /^Deep work/ })).toBeOnTheScreen();
  });

  it('a load error offers to try again', async () => {
    await open();
    routes['GET /calendar'] = () => ({ status: 400, body: apiError('VALIDATION_FAILED', 'No') });
    // The month is a new range, and asking for it fails (a 400 isn't retried).
    await fireEvent.press(await screen.findByRole('tab', { name: 'Month' }));
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  });
});

describe('Calendar: Week', () => {
  it('shows each block (named for screen readers); a day opens in Day', async () => {
    await open();
    await fireEvent.press(await screen.findByRole('tab', { name: 'Week' }));
    expect(
      await screen.findByRole('button', {
        name: `${formatDayLong(TODAY)}: Lunch with Amina, 12:30 – 13:30 · Event`,
      }),
    ).toBeOnTheScreen();
    const other = addDays(MONDAY, TODAY === MONDAY ? 1 : 0);
    await press(new RegExp(`^${formatDayLong(other)}`));
    expect(await screen.findByRole('tab', { name: 'Day', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: formatDayLong(other), selected: true }));
  });
});

describe('Calendar: Month', () => {
  it('dots say what a day has; picking a day lists it; arrows change the month', async () => {
    await open();
    await fireEvent.press(await screen.findByRole('tab', { name: 'Month' }));
    expect(
      await screen.findByRole('button', { name: `Today, ${formatDayLong(TODAY)}, tasks, events` }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Lunch with Amina, 12:30 – 13:30 · Event' }));

    const next = addMonths(monthOf(TODAY), 1);
    await press('Next month');
    await waitFor(() => expect(ranges().some((r) => r.includes(`${next}-0`))).toBe(true));
    await fireEvent.press(await screen.findByRole('button', { name: formatDayLong(`${next}-15`) }));
    expect(await screen.findByText('Nothing planned.')).toBeOnTheScreen();
  });
});

describe('Event sheet (FR-CAL-002, your choice)', () => {
  it('+ opens a new event on the chosen day; a start time adds an end an hour later', async () => {
    routes['POST /events'] = (body) => ({ status: 201, body: { data: { ...lunch, ...body } } });
    const router = await open();
    await press('New event');
    await waitFor(() => expect(router.getPathname()).toBe('/event-form'));
    await fireEvent.changeText(await screen.findByLabelText('Title'), 'Stand-up');
    await press('Starts, None');
    await fireEvent(screen.getByTestId('start-time-picker'), 'onChange', {
      nativeEvent: { timestamp: new Date(2026, 0, 1, 9, 0).getTime() },
    });
    expect(screen.getByRole('button', { name: 'Ends, 10:00' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Blue' }));
    const fetchedBefore = ranges().length;
    await press('Add event');

    await waitFor(() => expect(sent('POST /events')).toHaveLength(1));
    expect(sent('POST /events')[0]).toMatchObject({
      title: 'Stand-up',
      color: 'blue',
      startDate: TODAY,
      endDate: TODAY,
      startTime: 540,
      endTime: 600,
      recurrenceRule: null,
    });
    await waitFor(() => expect(router.getPathname()).toBe('/calendar'));
    // Any save makes the calendar fetch again (query-client.ts), so the new event shows.
    await waitFor(() => expect(ranges().length).toBeGreaterThan(fetchedBefore));
  });

  it('without a time it’s all day; All day clears both times', async () => {
    routes['POST /events'] = (body) => ({ status: 201, body: { data: { ...lunch, ...body } } });
    await open('/event-form');
    await fireEvent.changeText(await screen.findByLabelText('Title'), 'Holiday');
    await press('Starts, None');
    expect(screen.getByRole('button', { name: /^Ends, / })).toBeOnTheScreen();
    await press('All day');
    expect(screen.queryByRole('button', { name: /^Ends, / })).toBeNull();
    await press('Add event');
    await waitFor(() => expect(sent('POST /events')).toHaveLength(1));
    expect(sent('POST /events')[0]).toMatchObject({ startTime: null, endTime: null });
  });

  it('editing fills the sheet, saves with PATCH, and delete asks first', async () => {
    routes[`GET /events/${EVENT_ID}`] = () => ({ status: 200, body: { data: lunch } });
    routes[`PATCH /events/${EVENT_ID}`] = (body) => ({
      status: 200,
      body: { data: { ...lunch, ...body } },
    });
    routes[`DELETE /events/${EVENT_ID}`] = () => ({ status: 204 });
    const alert = jest.spyOn(Alert, 'alert');
    const router = await open();
    await fireEvent.press(await screen.findByRole('button', { name: /^Lunch with Amina/ }));
    await waitFor(() => expect(router.getPathname()).toBe('/event-form'));
    expect(await screen.findByRole('header', { name: 'Edit event' })).toBeOnTheScreen();
    expect(await screen.findByDisplayValue('Lunch with Amina')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Starts, 12:30' }));

    await fireEvent.changeText(screen.getByLabelText('Title'), 'Lunch');
    await press('Save');
    await waitFor(() => expect(sent(`PATCH /events/${EVENT_ID}`)).toHaveLength(1));
    expect(sent(`PATCH /events/${EVENT_ID}`)[0]).toMatchObject({
      title: 'Lunch',
      location: 'Café',
    });

    // Back on the calendar (which still answers with the old title).
    await fireEvent.press(await screen.findByRole('button', { name: /^Lunch with Amina/ }));
    await press('Delete event');
    expect(alert).toHaveBeenCalledWith('Delete this event?', undefined, expect.any(Array));
    const buttons = alert.mock.calls[0]?.[2] ?? [];
    await waitFor(() => buttons.find((b) => b.text === 'Delete')?.onPress?.());
    await waitFor(() => expect(sent(`DELETE /events/${EVENT_ID}`)).toHaveLength(1));
    alert.mockRestore();
  });
});
