import type {
  GoalDetail,
  PublicCategory,
  PublicGoal,
  PublicMilestone,
  PublicTask,
  PublicUser,
} from '@life-os/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { act } from 'react';
import { Alert } from 'react-native';
import { authStore } from '@/features/auth/auth-instance';
import { addDays, addMonths, formatDayLong, localToday } from '@/features/tasks/dates';
import { apiError, calls, resetMockApi, routes } from '@/test/mock-auth-instance';
import { dayMonth } from './pace';

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
const CAREER: PublicCategory = {
  id: '0190f1c4-6c1e-7cc0-8000-0000000000c1',
  name: 'Career',
  color: 'violet',
  icon: 'briefcase',
  sortOrder: 0,
};
const LEARNING: PublicCategory = {
  id: '0190f1c4-6c1e-7cc0-8000-0000000000c2',
  name: 'Learning',
  color: 'blue',
  icon: 'book-open',
  sortOrder: 1,
};

const milestone = (
  id: string,
  title: string,
  o: Partial<PublicMilestone> = {},
): PublicMilestone => ({
  id,
  title,
  dueDate: null,
  completedAt: null,
  sortOrder: 0,
  tasks: { total: 0, done: 0 },
  ...o,
});
// Made 20 days ago with its target 20 days ahead: half the time has gone.
const goal = (o: Partial<PublicGoal> = {}): PublicGoal => ({
  id: 'g1',
  title: 'Ship Life OS MVP',
  description: null,
  status: 'ACTIVE',
  progressMode: 'MILESTONES',
  manualProgress: null,
  targetDate: addDays(TODAY, 20),
  completedAt: null,
  categoryId: '0190f1c4-6c1e-7cc0-8000-0000000000c1',
  progress: { percent: 67, done: 2, total: 3 },
  milestones: [
    milestone('m1', 'Product requirements doc', {
      completedAt: `${addDays(TODAY, -7)}T09:00:00.000Z`,
    }),
    milestone('m2', 'Database schema', { completedAt: `${addDays(TODAY, -1)}T09:00:00.000Z` }),
    milestone('m3', 'Core screens', { dueDate: addDays(TODAY, 10), tasks: { total: 3, done: 1 } }),
  ],
  tasks: { total: 1, done: 0 },
  habitIds: [],
  createdAt: `${addDays(TODAY, -20)}T09:00:00.000Z`,
  updatedAt: `${TODAY}T09:00:00.000Z`,
  ...o,
});
const task: PublicTask = {
  id: 't1',
  title: 'Finish API auth module',
  description: null,
  priority: 'HIGH',
  status: 'TODO',
  dueDate: TODAY,
  dueTime: 600,
  completedAt: null,
  categoryId: null,
  goalId: 'g1',
  milestoneId: 'm3',
  parentId: null,
  recurrenceRule: null,
  subtaskCount: 0,
  subtasksDone: 0,
  sortOrder: 0,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};
const detail = (g: PublicGoal, linkedTasks: PublicTask[] = [task]): GoalDetail => ({
  ...g,
  linkedTasks,
});

const posts = (path: string) => calls.filter((c) => c.route === `POST ${path}`).map((c) => c.body);
const patches = (path: string) =>
  calls.filter((c) => c.route === `PATCH ${path}`).map((c) => c.body);

async function open(url: string, goals: PublicGoal[] = [goal()], linked: PublicTask[] = [task]) {
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
  routes['GET /categories'] = () => ({ status: 200, body: { data: [CAREER, LEARNING] } });
  routes['GET /goals'] = () => ({ status: 200, body: { data: goals } });
  for (const g of goals) {
    routes[`GET /goals/${g.id}`] = () => ({ status: 200, body: { data: detail(g, linked) } });
  }
  return renderRouter('src/app', { initialUrl: url });
}

beforeEach(async () => {
  resetMockApi();
  await AsyncStorage.clear();
});

describe('Settings shortcuts (the design’s four tiles)', () => {
  it.each([
    ['Goals', '/goals'],
    ['Calendar', '/calendar'],
  ])('%s opens its screen', async (name, path) => {
    const router = await open('/more');
    await fireEvent.press(await screen.findByRole('button', { name }));
    await waitFor(() => expect(router.getPathname()).toBe(path));
  });

  it.each(['Insights', 'Ask Lio'])('%s says coming soon', async (name) => {
    await open('/more');
    await fireEvent.press(await screen.findByRole('button', { name }));
    expect(await screen.findByRole('header', { name })).toBeOnTheScreen();
    expect(screen.getByText('Coming soon')).toBeOnTheScreen();
  });
});

describe('Goals (the design’s screen)', () => {
  it('no goals yet: says so, and New goal opens the sheet', async () => {
    const router = await open('/goals', []);
    expect(await screen.findByText('No goals yet')).toBeOnTheScreen();
    expect(screen.getByText('0 active')).toBeOnTheScreen();
    const buttons = screen.getAllByRole('button', { name: 'New goal' });
    await fireEvent.press(buttons.at(-1)!);
    await waitFor(() => expect(router.getPathname()).toBe('/goal-form'));
  });

  it('the closest deadline is the big card; the others are tiles; completed ones below', async () => {
    await open('/goals', [
      goal(),
      goal({
        id: 'g2',
        title: 'Learn NestJS',
        categoryId: '0190f1c4-6c1e-7cc0-8000-0000000000c2',
        targetDate: addDays(TODAY, 80),
        progress: { percent: 45, done: 0, total: 0 },
        progressMode: 'MANUAL',
        manualProgress: 45,
        milestones: [],
      }),
      goal({
        id: 'g3',
        title: 'Read 12 books',
        categoryId: null,
        targetDate: null,
        milestones: [],
      }),
      goal({
        id: 'g4',
        title: 'Run a 10K',
        status: 'COMPLETED',
        completedAt: `${addDays(TODAY, -3)}T08:00:00.000Z`,
        progress: { percent: 100, done: 2, total: 2 },
        milestones: [],
      }),
      goal({ id: 'g5', title: 'Learn the violin', status: 'ABANDONED', milestones: [] }),
    ]);
    expect(await screen.findByText('3 active')).toBeOnTheScreen();
    const hero = screen.getByTestId('goal-hero');
    expect(hero).toHaveAccessibleName('Ship Life OS MVP, 67%, 2 of 3 milestones');
    expect(screen.getByText(dayMonth(addDays(TODAY, 20), TODAY))).toBeOnTheScreen(); // closest deadline
    expect(screen.getByText('Career')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Core screens' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Database schema' })).toBeChecked();

    expect(
      screen.getByRole('button', {
        name: `Learn NestJS, 45%, Due ${dayMonth(addDays(TODAY, 80), TODAY)}`,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Read 12 books, 67%, No target date' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Completed' })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: `Run a 10K, 100%, Done ${dayMonth(addDays(TODAY, -3), TODAY)}`,
      }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Learn the violin')).toBeNull();
  });

  it('ticking a milestone on the card moves the ring at once and saves it', async () => {
    routes['PATCH /goals/g1/milestones/m3'] = () => new Promise(() => {}); // held
    await open('/goals');
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Core screens' }));
    await act(async () => {
      jest.advanceTimersByTime(50);
    });
    expect(screen.getByRole('checkbox', { name: 'Core screens' })).toBeChecked();
    expect(screen.getByTestId('goal-hero')).toHaveAccessibleName(
      'Ship Life OS MVP, 100%, 3 of 3 milestones',
    );
    expect(patches('/goals/g1/milestones/m3')).toEqual([{ completed: true }]);
  });

  it('a refused tick goes back and says so', async () => {
    routes['PATCH /goals/g1/milestones/m3'] = () => ({
      status: 500,
      body: apiError('INTERNAL_ERROR', 'x'),
    });
    await open('/goals');
    await screen.findByRole('checkbox', { name: 'Core screens' });
    // Re-reading never finishes, so only the rollback can put it back.
    routes['GET /goals'] = () => new Promise(() => {});
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Core screens' }));
    expect(await screen.findByText("Couldn't save the milestone. Try again.")).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(50);
    });
    expect(screen.getByRole('checkbox', { name: 'Core screens' })).not.toBeChecked();
  });
});

describe('Goal detail (the design’s screen)', () => {
  it('shows the ring, days left and On track, the milestones and the linked task', async () => {
    await open('/goal/g1');
    expect(await screen.findByRole('header', { name: 'Ship Life OS MVP' })).toBeOnTheScreen();
    expect(screen.getByText('Career')).toBeOnTheScreen();
    expect(
      await screen.findByLabelText(
        `67% done. Target ${dayMonth(addDays(TODAY, 20), TODAY)}. 20 days left. On track.`,
      ),
    ).toBeOnTheScreen();
    // Timeline: done, the next one (with its tasks), nothing after.
    expect(
      screen.getByRole('button', {
        name: `Database schema, Done ${dayMonth(addDays(TODAY, -1), TODAY)}`,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: `Core screens, Due ${dayMonth(addDays(TODAY, 10), TODAY)} · 3 tasks`,
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: 'Finish API auth module, linked task · Today · 10:00, plus 15 XP',
      }),
    ).toBeOnTheScreen();
  });

  it('Behind when progress trails the time gone; no target says what it counts', async () => {
    await open('/goal/g1', [goal({ progress: { percent: 20, done: 1, total: 5 } })]);
    expect(
      await screen.findByLabelText(
        `20% done. Target ${dayMonth(addDays(TODAY, 20), TODAY)}. 20 days left. Behind.`,
      ),
    ).toBeOnTheScreen();
  });

  it('without a target date it says what the progress counts', async () => {
    await open('/goal/g1', [goal({ targetDate: null })]);
    expect(
      await screen.findByLabelText('67% done. No target date. 2 of 3 milestones.'),
    ).toBeOnTheScreen();
  });

  it('Add milestone opens a new milestone sheet for this goal', async () => {
    await open('/goal/g1');
    await fireEvent.press(await screen.findByRole('button', { name: 'Add milestone' }));
    // The detail's own "id" (the goal) mustn't make the sheet think it's editing a milestone.
    expect(await screen.findByRole('header', { name: 'New milestone' })).toBeOnTheScreen();
  });

  it('a milestone row opens it to edit', async () => {
    await open('/goal/g1');
    await fireEvent.press(await screen.findByRole('button', { name: /^Core screens, / }));
    expect(await screen.findByRole('header', { name: 'Edit milestone' })).toBeOnTheScreen();
    expect(await screen.findByDisplayValue('Core screens')).toBeOnTheScreen();
  });

  it('Edit opens the goal sheet', async () => {
    await open('/goal/g1');
    await fireEvent.press(await screen.findByRole('button', { name: 'Edit' }));
    expect(await screen.findByRole('header', { name: 'Edit goal' })).toBeOnTheScreen();
  });

  it('a deleted goal says so', async () => {
    routes['GET /goals/g1'] = () => ({
      status: 404,
      body: apiError('GOAL_NOT_FOUND', 'Goal not found.'),
    });
    await open('/goal/g1', []);
    expect(await screen.findByText('This goal isn’t here any more')).toBeOnTheScreen();
  });
});

describe('Goal sheet', () => {
  it('a new goal: title, category, target date and what progress counts', async () => {
    routes['POST /goals'] = (body) => ({
      status: 201,
      body: { data: goal({ id: 'g9', ...body }) },
    });
    await open('/goal-form', []);
    await fireEvent.changeText(await screen.findByLabelText('Title'), 'Learn NestJS');
    await fireEvent.press(await screen.findByRole('radio', { name: 'Learning' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Pick a date' }));
    // The 1st of next month (days before today can't be picked).
    const target = `${addMonths(TODAY.slice(0, 7), 1)}-01`;
    await fireEvent.press(await screen.findByRole('button', { name: 'Next month' }));
    await fireEvent.press(await screen.findByRole('button', { name: formatDayLong(target) }));
    await fireEvent.press(screen.getByRole('radio', { name: 'I’ll set it' }));
    await fireEvent.changeText(await screen.findByLabelText('Progress (%)'), '45');
    await fireEvent.press(screen.getByRole('button', { name: 'Add goal' }));
    await waitFor(() =>
      expect(posts('/goals')).toEqual([
        {
          title: 'Learn NestJS',
          description: null,
          categoryId: '0190f1c4-6c1e-7cc0-8000-0000000000c2',
          targetDate: target,
          progressMode: 'MANUAL',
          manualProgress: 45,
        },
      ]),
    );
  });

  it('editing fills the form; Mark goal complete; Delete asks first', async () => {
    routes['PATCH /goals/g1'] = (body) => ({ status: 200, body: { data: goal(body) } });
    routes['DELETE /goals/g1'] = () => ({ status: 204 });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await open('/goal-form?id=g1');
    expect(await screen.findByDisplayValue('Ship Life OS MVP')).toBeOnTheScreen();
    expect(await screen.findByRole('radio', { name: 'Career' })).toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: 'Mark goal complete' }));
    await waitFor(() => expect(patches('/goals/g1')).toEqual([{ status: 'COMPLETED' }]));

    await open('/goal-form?id=g1');
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete goal' }));
    const [title, , buttons = []] = alert.mock.calls.at(-1) ?? [];
    alert.mockRestore();
    expect(title).toBe('Delete this goal?');
    expect(calls.some((c) => c.route === 'DELETE /goals/g1')).toBe(false);
    await act(async () => buttons.find((b) => b.text === 'Delete')?.onPress?.());
    await waitFor(() => expect(calls.some((c) => c.route === 'DELETE /goals/g1')).toBe(true));
  });

  it('the server’s field errors show under the field', async () => {
    routes['POST /goals'] = () => ({
      status: 400,
      body: apiError('VALIDATION_FAILED', 'Check the form.', [
        { field: 'categoryId', message: 'Choose one of your categories.' },
      ]),
    });
    await open('/goal-form', []);
    await fireEvent.changeText(await screen.findByLabelText('Title'), 'X');
    await fireEvent.press(screen.getByRole('button', { name: 'Add goal' }));
    expect(await screen.findByText('Choose one of your categories.')).toBeOnTheScreen();
  });
});

describe('Milestone sheet', () => {
  it('adds a milestone with a due date', async () => {
    routes['POST /goals/g1/milestones'] = () => ({ status: 201, body: { data: goal() } });
    await open('/milestone-form?goalId=g1');
    await fireEvent.changeText(await screen.findByLabelText('Title'), 'Release to testers');
    await fireEvent.press(screen.getByRole('radio', { name: 'Tomorrow' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add milestone' }));
    await waitFor(() =>
      expect(posts('/goals/g1/milestones')).toEqual([
        { title: 'Release to testers', dueDate: addDays(TODAY, 1) },
      ]),
    );
  });

  it('edits one: filled in, saved, and Delete asks first', async () => {
    routes['PATCH /goals/g1/milestones/m3'] = () => ({ status: 200, body: { data: goal() } });
    await open('/milestone-form?goalId=g1&id=m3');
    const field = await screen.findByDisplayValue('Core screens');
    await fireEvent.changeText(field, 'Core screens v2');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(patches('/goals/g1/milestones/m3')).toEqual([
        { title: 'Core screens v2', dueDate: addDays(TODAY, 10) },
      ]),
    );
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await open('/milestone-form?goalId=g1&id=m3');
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete milestone' }));
    expect(alert.mock.calls.at(-1)?.[0]).toBe('Delete this milestone?');
    alert.mockRestore();
  });
});

describe('Linked task card', () => {
  it('a done linked task says Done instead of its XP', async () => {
    await open(
      '/goal/g1',
      [goal()],
      [{ ...task, status: 'DONE', completedAt: `${TODAY}T08:00:00.000Z` }],
    );
    const card = await screen.findByRole('button', {
      name: /^Finish API auth module, linked task.*, done$/,
    });
    expect(within(card).getByText('Done')).toBeOnTheScreen();
    expect(within(card).queryByText('+15 XP')).toBeNull();
  });
});
