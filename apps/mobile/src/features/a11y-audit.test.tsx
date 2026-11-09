import type { GoalDetail, HistoryDay, PublicTask, PublicUser } from '@life-os/shared';
import { router as appRouter, type Href } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { authStore } from '@/features/auth/auth-instance';
import { localToday } from '@/features/tasks/dates';
import { unnamedControls } from '@/test/a11y';
import { resetMockApi, routes } from '@/test/mock-auth-instance';

jest.mock('@/features/auth/auth-instance', () => jest.requireActual('@/test/mock-auth-instance'));

// Week 13 accessibility pass: every finished screen, in the states people see, must give each
// control a name a screen reader can say. (Contrast is checked in colors.test.ts; labels in
// words, not colour alone, in each screen's own tests.)

const ZONE = 'Africa/Dar_es_Salaam';
const TODAY = localToday(ZONE);
const user = (onboarded: boolean): PublicUser => ({
  id: 'u1',
  email: 'tina@example.com',
  displayName: 'Tina',
  emailVerifiedAt: null,
  onboardingCompletedAt: onboarded ? '2026-11-08T10:00:00.000Z' : null,
  createdAt: '2026-11-08T09:00:00.000Z',
});
const task = (o: Partial<PublicTask>): PublicTask => ({
  id: 't1',
  title: 'Pay rent',
  description: null,
  priority: 'HIGH',
  status: 'TODO',
  dueDate: TODAY,
  dueTime: 540,
  completedAt: null,
  categoryId: 'c1',
  goalId: null,
  milestoneId: null,
  parentId: null,
  recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=1',
  subtaskCount: 2,
  subtasksDone: 1,
  sortOrder: 0,
  createdAt: '2026-11-08T09:00:00.000Z',
  updatedAt: '2026-11-08T09:00:00.000Z',
  ...o,
});
const TASKS = [
  task({}),
  task({
    id: 't2',
    title: 'Call mum',
    priority: 'LOW',
    dueDate: null,
    dueTime: null,
    recurrenceRule: null,
  }),
  task({ id: 't3', title: 'Old', status: 'DONE', completedAt: `${TODAY}T08:00:00.000Z` }),
];

function serve(onboarded = true) {
  routes['GET /users/me'] = () => ({
    status: 200,
    body: {
      data: {
        user: user(onboarded),
        settings: { theme: 'LIGHT', timezone: ZONE, weekStartsOn: 1 },
      },
    },
  });
  routes['GET /categories'] = () => ({
    status: 200,
    body: { data: [{ id: 'c1', name: 'Work', color: 'blue', icon: 'briefcase', sortOrder: 0 }] },
  });
  routes['GET /tasks'] = () => ({
    status: 200,
    body: { data: TASKS, meta: { nextCursor: null, hasMore: false } },
  });
  routes['GET /tasks/t1'] = () => ({
    status: 200,
    body: {
      data: {
        ...TASKS[0],
        subtasks: [
          task({ id: 's1', title: 'Transfer', parentId: 't1', status: 'DONE' }),
          task({ id: 's2', title: 'Receipt', parentId: 't1' }),
        ],
      },
    },
  });
  const habit = {
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
  routes['GET /habits'] = () => ({ status: 200, body: { data: [habit] } });
  routes['GET /habits/h1/days'] = () => ({
    status: 200,
    body: { data: [{ date: TODAY, state: 'today', count: 0 }] },
  });
  routes['GET /habits/h1/stats'] = () => ({
    status: 200,
    body: { data: { consistency: 86, totalDays: 48 } },
  });
  routes['GET /progress'] = () => ({
    status: 200,
    body: {
      data: {
        xp: 1240,
        streak: { current: 3, best: 3 },
        level: { level: 5, start: 1000, next: 1500, toNext: 260 },
        dailyChest: 'ready',
      },
    },
  });
  routes['GET /goals'] = () => ({
    status: 200,
    body: { data: [GOAL, { ...GOAL, id: 'g2', title: 'Learn NestJS' }] },
  });
  routes['GET /goals/g1'] = () => ({ status: 200, body: { data: GOAL } });
  routes['GET /tasks/history'] = () => {
    const days: HistoryDay[] = [{ date: TODAY, count: 1, tasks: [TASKS[2] as PublicTask] }];
    return { status: 200, body: { data: { from: TODAY, to: TODAY, total: 1, days } } };
  };
}

// A goal with each kind of milestone (done, next with tasks, later) and a linked task.
const GOAL: GoalDetail = {
  id: 'g1',
  title: 'Ship Life OS MVP',
  description: null,
  status: 'ACTIVE',
  progressMode: 'MILESTONES',
  manualProgress: null,
  targetDate: '2027-01-20',
  completedAt: null,
  categoryId: 'c1',
  progress: { percent: 33, done: 1, total: 3 },
  milestones: [
    {
      id: 'm1',
      title: 'PRD',
      dueDate: null,
      completedAt: `${TODAY}T08:00:00.000Z`,
      sortOrder: 0,
      tasks: { total: 0, done: 0 },
    },
    {
      id: 'm2',
      title: 'Core screens',
      dueDate: '2026-12-28',
      completedAt: null,
      sortOrder: 1,
      tasks: { total: 3, done: 1 },
    },
    {
      id: 'm3',
      title: 'Release',
      dueDate: null,
      completedAt: null,
      sortOrder: 2,
      tasks: { total: 0, done: 0 },
    },
  ],
  tasks: { total: 1, done: 0 },
  habitIds: [],
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
  linkedTasks: [TASKS[0] as PublicTask],
};

async function open(url: Href, signedIn: 'no' | 'new' | 'yes' = 'yes') {
  resetMockApi();
  serve(signedIn === 'yes');
  if (signedIn !== 'no') {
    authStore.setState({
      status: 'signedIn',
      user: user(signedIn === 'yes'),
      accessToken: 'a',
      refreshToken: 'r',
    });
  } else {
    authStore.setState({ status: 'signedOut', user: null, accessToken: null, refreshToken: null });
  }
  await renderRouter('src/app', { initialUrl: '/' });
  if (url !== '/') await act(async () => appRouter.push(url));
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

describe('every control can be named by a screen reader', () => {
  it.each([
    ['Welcome', '/welcome', 'no'],
    ['Sign in', '/login', 'no'],
    ['Create account', '/register', 'no'],
    ['Forgot password', '/forgot-password', 'no'],
    ['Onboarding: profile', '/profile', 'new'],
  ] as const)('%s', async (_name, url, signedIn) => {
    await open(url, signedIn);
    expect(unnamedControls()).toEqual([]);
  });

  it('Onboarding: focus areas', async () => {
    await open('/profile', 'new');
    await press('Continue');
    await screen.findByRole('checkbox', { name: 'Work' });
    expect(unnamedControls()).toEqual([]);
  });

  it('Tasks, with the highlighted card, rows and search open', async () => {
    await open('/tasks');
    await screen.findByTestId('focus-card');
    await press('Search tasks');
    expect(unnamedControls()).toEqual([]);
  });

  it('New task, with the calendar, repeat choices and subtasks open', async () => {
    await open('/tasks');
    await act(async () => appRouter.push('/task-form'));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Today' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Pick a date' }));
    await press('Repeat, Never');
    await fireEvent.press(screen.getByRole('radio', { name: 'Weekly' }));
    expect(unnamedControls()).toEqual([]);
  });

  it('Edit task, with live subtasks', async () => {
    await open('/tasks');
    await act(async () => appRouter.push('/task-form?id=t1'));
    await screen.findByRole('checkbox', { name: 'Transfer' });
    expect(unnamedControls()).toEqual([]);
  });

  it('Settings', async () => {
    await open('/more');
    await screen.findByText('tina@example.com');
    expect(unnamedControls()).toEqual([]);
  });

  it('Goals: the big card with milestones, and a tile', async () => {
    await open('/goals');
    await screen.findByTestId('goal-hero');
    expect(unnamedControls()).toEqual([]);
  });

  it('Goal detail: the ring, the milestone timeline and a linked task', async () => {
    await open('/goal/g1');
    await screen.findByRole('button', { name: /^Core screens, / });
    expect(unnamedControls()).toEqual([]);
  });

  it('Goal sheet, with the calendar and manual progress open', async () => {
    await open('/goal-form?id=g1');
    await screen.findByDisplayValue('Ship Life OS MVP'); // filled in from the goal first
    // The target date's chip shows the date; pressing it opens the calendar.
    await fireEvent.press(await screen.findByRole('radio', { name: /2027/ }));
    await screen.findByTestId('month-calendar');
    await fireEvent.press(screen.getByRole('radio', { name: 'I’ll set it' }));
    await screen.findByLabelText('Progress (%)');
    expect(unnamedControls()).toEqual([]);
  });

  it('Milestone sheet (editing)', async () => {
    await open('/milestone-form?goalId=g1&id=m2');
    await screen.findByDisplayValue('Core screens');
    expect(unnamedControls()).toEqual([]);
  });

  it.each(['insights', 'ask-lio'])('Coming soon: %s', async (feature) => {
    await open(`/coming-soon?feature=${feature}`);
    await screen.findByText('Coming soon');
    expect(unnamedControls()).toEqual([]);
  });

  it('Habits: chips, the card and the quest path', async () => {
    await open('/habits');
    await screen.findByTestId('quest-today');
    expect(unnamedControls()).toEqual([]);
  });

  it('Habit detail: streak, tiles, the month and Mark done today', async () => {
    await open('/habit/h1');
    await screen.findByLabelText('Consistency: 86%');
    expect(unnamedControls()).toEqual([]);
  });

  it('Lio page', async () => {
    await open('/lio');
    await screen.findByText('260 XP to level 6');
    expect(unnamedControls()).toEqual([]);
  });

  it('Chest reward (daily)', async () => {
    await open('/chest?kind=daily');
    await screen.findByText('Chest opened!');
    expect(unnamedControls()).toEqual([]);
  });

  it('Habit sheet, with some days and a target', async () => {
    await open('/habits');
    await act(async () => appRouter.push('/habit-form'));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Some days' }));
    await fireEvent.changeText(screen.getByLabelText('How many a day?'), '8');
    expect(unnamedControls()).toEqual([]);
  });

  it('Onboarding: first habit', async () => {
    await open('/profile', 'new');
    await press('Continue');
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Work' }));
    await press('Continue');
    await screen.findByRole('radio', { name: 'Walk' });
    expect(unnamedControls()).toEqual([]);
  });

  it.each(['Week', 'Month', 'Year'])('History: %s', async (tab) => {
    await open('/history');
    await fireEvent.press(await screen.findByRole('tab', { name: tab }));
    await screen.findByLabelText(/completed$/);
    expect(unnamedControls()).toEqual([]);
  });
});
