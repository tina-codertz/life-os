import type { HistoryDay, PublicTask, PublicUser } from '@life-os/shared';
import { router as appRouter } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { authStore } from '@/features/auth/auth-instance';
import { addDays, localToday } from '@/features/tasks/dates';
import { apiError, calls, resetMockApi, routes } from '@/test/mock-auth-instance';
import { lightColors } from '@/theme';
import { startOfWeek } from './history-dates';

jest.mock('@/features/auth/auth-instance', () => jest.requireActual('@/test/mock-auth-instance'));

const ZONE = 'Africa/Dar_es_Salaam';
const USER: PublicUser = {
  id: 'u1',
  email: 'tina@example.com',
  displayName: 'Tina',
  emailVerifiedAt: null,
  onboardingCompletedAt: '2026-11-08T10:00:00.000Z',
  createdAt: '2026-11-08T09:00:00.000Z',
};
const TODAY = localToday(ZONE);
const WEEK = startOfWeek(TODAY, 1); // the user's week starts on Monday

const task = (title: string, completedAt: string): PublicTask => ({
  id: title,
  title,
  description: null,
  priority: 'NONE',
  status: 'DONE',
  dueDate: null,
  dueTime: null,
  completedAt,
  categoryId: null,
  parentId: null,
  recurrenceRule: null,
  subtaskCount: 0,
  subtasksDone: 0,
  sortOrder: 0,
  createdAt: completedAt,
  updatedAt: completedAt,
});

// A fake server with these completed days; it answers any range like the real one.
let completed: HistoryDay[] = [];
const historyRequests = () => calls.filter((c) => c.route.startsWith('GET /tasks/history'));

async function openHistory() {
  authStore.setState({ status: 'signedIn', user: USER, accessToken: 'a', refreshToken: 'r' });
  routes['GET /users/me'] = () => ({
    status: 200,
    body: { data: { user: USER, settings: { theme: 'SYSTEM', timezone: ZONE, weekStartsOn: 1 } } },
  });
  routes['GET /categories'] = () => ({ status: 200, body: { data: [] } });
  routes['GET /tasks/history'] = (_b, path) => {
    const q = new URLSearchParams(path.split('?')[1]);
    const from = q.get('from') ?? '';
    const to = q.get('to') ?? '';
    const days = completed
      .filter((d) => d.date >= from && d.date <= to)
      .map((d) => (q.get('include') ? d : { date: d.date, count: d.count }));
    return {
      status: 200,
      body: { data: { from, to, total: days.reduce((a, d) => a + d.count, 0), days } },
    };
  };
  const router = await renderRouter('src/app', { initialUrl: '/more' });
  await fireEvent.press(await screen.findByRole('button', { name: 'History' }));
  await waitFor(() => expect(router.getPathname()).toBe('/history'));
  return router;
}

beforeEach(() => {
  resetMockApi();
  completed = [];
});

describe('History', () => {
  it('Week: the total, the change from last week, and each day’s tasks with times', async () => {
    completed = [
      // Last week: counted for the comparison, but its tasks aren't listed.
      {
        date: addDays(WEEK, -3),
        count: 2,
        tasks: [task('Last week one', `${addDays(WEEK, -3)}T08:00:00.000Z`)],
      },
      {
        date: TODAY,
        count: 2,
        tasks: [
          task('Review PRD draft', `${TODAY}T06:40:00.000Z`), // 09:40 in Dar es Salaam
          task('Plan the week', `${TODAY}T05:30:00.000Z`),
        ],
      },
    ];
    // Something earlier this week too, unless today is the week's first day.
    if (TODAY !== WEEK) {
      completed.push({
        date: WEEK,
        count: 1,
        tasks: [task('Workout', `${WEEK}T14:10:00.000Z`)],
      });
    }
    const thisWeek = TODAY === WEEK ? 2 : 3;
    await openHistory();

    expect(await screen.findByLabelText(`${thisWeek} completed`)).toBeOnTheScreen();
    // On the week's first day both weeks have 2: no change.
    expect(
      screen.getByText(thisWeek === 2 ? 'Same as last week' : `+${thisWeek - 2} vs last week`),
    ).toBeOnTheScreen();
    expect(historyRequests().at(-1)?.route).toBe(
      `GET /tasks/history?from=${addDays(WEEK, -7)}&to=${addDays(WEEK, 6)}&include=tasks`,
    );
    // Today's card comes first, with its badge and the times on the user's clock.
    expect(screen.getByText(/^Today · /)).toBeOnTheScreen();
    expect(screen.getByLabelText('Review PRD draft, task, done at 09:40')).toBeOnTheScreen();
    expect(screen.getAllByText('2 done')[0]).toBeOnTheScreen();
    expect(screen.queryByText('Last week one')).toBeNull();
  });

  it('Week: nothing yet says so', async () => {
    await openHistory();
    expect(await screen.findByText('Nothing completed this week')).toBeOnTheScreen();
    expect(screen.getByText('Same as last week')).toBeOnTheScreen();
  });

  it('the arrows step back a week, and forward again (never past this week)', async () => {
    await openHistory();
    await screen.findByText('Nothing completed this week');
    expect(screen.queryByRole('button', { name: 'Next week' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Previous week' }));
    await waitFor(() =>
      expect(historyRequests().at(-1)?.route).toBe(
        `GET /tasks/history?from=${addDays(WEEK, -14)}&to=${addDays(WEEK, -1)}&include=tasks`,
      ),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.queryByRole('button', { name: 'Next week' })).toBeNull();
  });

  it('Month: a heatmap of each day and the weeks with their best day', async () => {
    const month = TODAY.slice(0, 7);
    completed = [
      { date: `${month}-01`, count: 6 },
      { date: `${month}-02`, count: 1 },
    ];
    await openHistory();
    await fireEvent.press(screen.getByRole('tab', { name: 'Month' }));

    expect(await screen.findByLabelText('7 completed')).toBeOnTheScreen();
    const first = screen.getByTestId(`heat-${month}-01`);
    expect(first.props.accessibilityLabel).toMatch(/, 6 done$/);
    // Darkest for the busiest day, lightest step for 1 of 6, none for an empty day.
    expect(first).toHaveStyle({ backgroundColor: lightColors.heat.fill[4] });
    expect(screen.getByTestId(`heat-${month}-02`)).toHaveStyle({
      backgroundColor: lightColors.heat.fill[1],
    });
    expect(screen.getByTestId(`heat-${month}-03`)).toHaveStyle({
      backgroundColor: lightColors.heat.fill[0],
    });
    expect(screen.getByText(/^Best day .* · 6$/)).toBeOnTheScreen();
  });

  it('Year: best month, the month bars, the longest streak and the best months', async () => {
    const year = TODAY.slice(0, 4);
    completed = [
      { date: `${year}-10-03`, count: 5 },
      { date: `${year}-10-04`, count: 3 },
      { date: `${year}-10-05`, count: 1 },
      { date: `${year}-08-20`, count: 2 },
    ];
    await openHistory();
    await fireEvent.press(screen.getByRole('tab', { name: 'Year' }));

    expect(await screen.findByText('Best: Oct')).toBeOnTheScreen();
    expect(screen.getByLabelText('11 completed')).toBeOnTheScreen();
    expect(screen.getByLabelText('Longest streak, 3 days in a row')).toBeOnTheScreen();
    expect(screen.getByLabelText('October, 9 done')).toBeOnTheScreen();
    expect(screen.getByLabelText('August, 2 done')).toBeOnTheScreen();
  });

  it('shows an error with retry when history can’t load', async () => {
    authStore.setState({ status: 'signedIn', user: USER, accessToken: 'a', refreshToken: 'r' });
    // A 4xx isn't retried (a 5xx would be, after a delay the fake timers never reach).
    routes['GET /tasks/history'] = () => ({
      status: 400,
      body: apiError('VALIDATION_FAILED', 'Some fields are invalid.'),
    });
    await renderRouter('src/app', { initialUrl: '/today' });
    await act(async () => appRouter.push('/history'));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load this.");
    const before = historyRequests().length;
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(historyRequests().length).toBe(before + 1));
  });
});
