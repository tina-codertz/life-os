import type { PublicCategory, PublicTask, PublicUser } from '@life-os/shared';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';
import { layout, swipe } from '@/test/gestures';
import { authStore } from '@/features/auth/auth-instance';
import { apiError, calls, resetMockApi, routes } from '@/test/mock-auth-instance';
import { addDays, localToday } from './dates';

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
const WORK: PublicCategory = {
  id: '0198b7a2-5a6b-7c3d-8e9f-0a1b2c3d4e5f',
  name: 'Work',
  color: 'blue',
  icon: null,
  sortOrder: 0,
};

let n = 0;
const task = (overrides: Partial<PublicTask> = {}): PublicTask => {
  n += 1;
  return {
    id: `t${n}`,
    title: `Task ${n}`,
    description: null,
    priority: 'NONE',
    status: 'TODO',
    dueDate: null,
    dueTime: null,
    durationMinutes: null,
    completedAt: null,
    categoryId: null,
    goalId: null,
    milestoneId: null,
    parentId: null,
    recurrenceRule: null,
    subtaskCount: 0,
    subtasksDone: 0,
    sortOrder: 0,
    createdAt: '2026-11-08T09:00:00.000Z',
    updatedAt: '2026-11-08T09:00:00.000Z',
    ...overrides,
  };
};
const page = (items: PublicTask[], nextCursor: string | null = null) => ({
  status: 200,
  body: { data: items, meta: { nextCursor, hasMore: nextCursor !== null } },
});
const gets = (prefix: string) =>
  calls.filter((c) => c.route.startsWith(`GET ${prefix}`)).map((c) => c.route);

async function openTasks() {
  authStore.setState({ status: 'signedIn', user: USER, accessToken: 'a', refreshToken: 'r' });
  routes['GET /users/me'] = () => ({
    status: 200,
    body: { data: { user: USER, settings: { theme: 'SYSTEM', timezone: ZONE } } },
  });
  routes['GET /categories'] = () => ({ status: 200, body: { data: [WORK] } });
  return renderRouter('src/app', { initialUrl: '/tasks' });
}

// A fake server that searches titles like the real one (case-insensitive).
const searchable = () => {
  const all = [task({ title: 'Pay rent' }), task({ title: 'Call mum' })];
  routes['GET /tasks'] = (_b, path) => {
    const q = new URLSearchParams(path.split('?')[1]).get('q')?.toLowerCase();
    return page(q ? all.filter((t) => t.title.toLowerCase().includes(q)) : all);
  };
};

// renderRouter runs Jest's fake timers: the search pause passes only when we move the clock.
const wait = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

const parent = () => task({ title: 'Ship MVP', subtaskCount: 3, subtasksDone: 1 });

// Ticks the task and returns the dialog's buttons (the phone's own dialog, mocked).
async function tickAndGetDialog() {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await fireEvent.press(await screen.findByRole('checkbox', { name: 'Ship MVP' }));
  const call = alert.mock.calls.at(-1);
  alert.mockRestore();
  const buttons: AlertButton[] = call?.[2] ?? [];
  return { title: call?.[0], message: call?.[1], buttons };
}

const dueToday = (o: Partial<PublicTask> = {}) =>
  task({ title: 'Ship MVP', dueDate: localToday(ZONE), dueTime: 600, ...o });

// The row's frame, measured 300 pt wide, and the part that moves.
async function rowFor(title: string) {
  await screen.findByText(title);
  const frames = screen.getAllByTestId('swipe-row-frame');
  const rows = screen.getAllByTestId('swipe-row');
  const i = rows.findIndex((r) => within(r).queryByText(title) !== null);
  await layout(frames[i]!, 300);
  // Fetched again: measuring re-renders the row with handlers that know its width.
  return screen.getAllByTestId('swipe-row')[i]!;
}

beforeEach(() => {
  resetMockApi();
  n = 0;
});

describe('Tasks screen', () => {
  it('lists tasks with due label, priority and category in words', async () => {
    const today = localToday(ZONE);
    routes['GET /tasks'] = () =>
      page([
        task({
          title: 'Pay rent',
          dueDate: addDays(today, 1),
          priority: 'HIGH',
          categoryId: WORK.id,
        }),
        task({ title: 'Old thing', dueDate: addDays(today, -3) }),
      ]);
    await openTasks();

    // What a screen reader says for each row: everything in words, nothing only in colour.
    expect(
      await screen.findByRole('button', { name: 'Pay rent, Tomorrow, High priority, Work' }),
    ).toBeOnTheScreen();
    // The overdue task is the one due soonest, so it's the highlighted card (in words too).
    expect(
      within(screen.getByTestId('focus-card')).getByRole('button', {
        name: /^Old thing, Overdue · /,
      }),
    ).toBeOnTheScreen();
    expect(gets('/tasks')[0]).toBe('GET /tasks?status=TODO'); // "To do" is the default filter
  });

  it('shows an empty state with a way to add a task', async () => {
    routes['GET /tasks'] = () => page([]);
    const router = await openTasks();

    expect(await screen.findByText('Nothing to do')).toBeOnTheScreen();
    const empty = screen.getAllByRole('button', { name: 'New task' });
    await fireEvent.press(empty.at(-1)!);
    await waitFor(() => expect(router.getPathname()).toBe('/task-form'));
  });

  it('switching to Done asks for done tasks', async () => {
    routes['GET /tasks'] = (_b, path) =>
      page(path.includes('status=DONE') ? [task({ title: 'Finished', status: 'DONE' })] : []);
    await openTasks();
    await screen.findByText('Nothing to do');

    await fireEvent.press(screen.getByRole('radio', { name: 'Done' }));
    expect(await screen.findByText('Finished')).toBeOnTheScreen();
    // Done shows as a status badge on the row, not as struck-through text.
    const row = screen.getByRole('button', { name: /^Finished/ });
    expect(within(row).getByText('Done')).toBeOnTheScreen();
    expect(screen.getByText('Finished')).not.toHaveStyle({ textDecorationLine: 'line-through' });
    expect(gets('/tasks')).toContain('GET /tasks?status=DONE');
  });

  it('loads the next page when the end of the list is reached', async () => {
    routes['GET /tasks'] = (_b, path) =>
      path.includes('cursor=next-1')
        ? page([task({ title: 'From page 2' })])
        : page([task({ title: 'From page 1' })], 'next-1');
    await openTasks();
    await screen.findByText('From page 1');

    await fireEvent(screen.getByTestId('task-list'), 'onEndReached');
    expect(await screen.findByText('From page 2')).toBeOnTheScreen();
    expect(screen.getByText('From page 1')).toBeOnTheScreen();
  });

  it('completing a task shows at once, before the server answers', async () => {
    const pay = task({ title: 'Pay rent' });
    let done = false;
    let answer: (() => void) | undefined;
    routes['GET /tasks'] = () => page([{ ...pay, status: done ? 'DONE' : 'TODO' }]);
    routes[`POST /tasks/${pay.id}/complete`] = () =>
      new Promise((resolve) => {
        // Held until the test lets it go.
        answer = () => {
          done = true;
          resolve({ status: 200, body: { data: { task: { ...pay, status: 'DONE' } } } });
        };
      });
    await openTasks();

    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Pay rent' }));
    await waitFor(() => expect(answer).toBeDefined()); // the request is out, still unanswered
    // Ticked while the server's answer is still being held back: optimistic.
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Pay rent' })).toBeChecked());

    answer?.();
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Pay rent' })).toBeChecked());
  });

  it('puts the task back and says so if completing fails', async () => {
    const pay = task({ title: 'Pay rent' });
    // After the first load every refresh hangs (as when offline), so nothing but the rollback
    // can change what's on screen.
    let loads = 0;
    routes['GET /tasks'] = () => {
      loads += 1;
      return loads === 1 ? page([pay]) : new Promise(() => {});
    };
    let fail: (() => void) | undefined;
    routes[`POST /tasks/${pay.id}/complete`] = () =>
      new Promise((resolve) => {
        fail = () => resolve({ status: 503, body: apiError('SERVICE_UNAVAILABLE', 'down') });
      });
    await openTasks();

    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Pay rent' }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Pay rent' })).toBeChecked());

    fail?.();
    expect(await screen.findByText("Couldn't update the task. Try again.")).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Pay rent' })).not.toBeChecked();
  });

  it('shows an error with retry when the list cannot load', async () => {
    let fail = true;
    routes['GET /tasks'] = () =>
      fail ? { status: 404, body: apiError('NOT_FOUND', 'nope') } : page([task({ title: 'Back' })]);
    await openTasks();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load this.");
    fail = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Back')).toBeOnTheScreen();
  });

  it('screen-reader "Delete" action removes the task and offers Undo', async () => {
    const pay = task({ title: 'Pay rent' });
    let deleted = false;
    routes['GET /tasks'] = () => page(deleted ? [] : [pay]);
    routes[`DELETE /tasks/${pay.id}`] = () => {
      deleted = true;
      return { status: 204 };
    };
    routes[`POST /tasks/${pay.id}/restore`] = () => {
      deleted = false;
      return { status: 200, body: { data: pay } };
    };
    await openTasks();

    const row = await screen.findByRole('button', { name: /^Pay rent/ });
    await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
    await waitFor(() => expect(screen.queryByText('Pay rent')).toBeNull());

    const toast = await screen.findByTestId('toast');
    await fireEvent.press(within(toast).getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText('Pay rent')).toBeOnTheScreen();
  });

  describe('search', () => {
    it('asks the server once, after a pause in typing', async () => {
      searchable();
      await openTasks();
      await screen.findByText('Call mum');

      await fireEvent.press(screen.getByRole('button', { name: 'Search tasks' }));
      // Typed letter by letter, faster than the 300 ms pause.
      for (const text of ['R', 'RE', 'REN', 'RENT']) {
        await fireEvent.changeText(screen.getByLabelText('Search tasks'), text);
        await wait(100);
      }
      expect(gets('/tasks').filter((r) => r.includes('q='))).toHaveLength(0);
      await wait(300);

      expect(await screen.findByText('Pay rent')).toBeOnTheScreen();
      expect(screen.queryByText('Call mum')).toBeNull();
      expect(gets('/tasks').filter((r) => r.includes('q='))).toEqual([
        'GET /tasks?status=TODO&q=RENT',
      ]);
    });

    it('says when nothing matches, and Clear search shows everything again', async () => {
      searchable();
      await openTasks();
      await fireEvent.press(await screen.findByRole('button', { name: 'Search tasks' }));
      await fireEvent.changeText(screen.getByLabelText('Search tasks'), 'zzz');
      await wait(300);

      expect(await screen.findByText('No tasks match “zzz”')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
      expect(await screen.findByText('Call mum')).toBeOnTheScreen();
    });

    it('closing search clears it', async () => {
      searchable();
      await openTasks();
      await fireEvent.press(await screen.findByRole('button', { name: 'Search tasks' }));
      await fireEvent.changeText(screen.getByLabelText('Search tasks'), 'rent');
      await wait(300);
      expect(await screen.findByText('Pay rent')).toBeOnTheScreen();
      expect(screen.queryByText('Call mum')).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: 'Close search' }));
      await wait(300);
      expect(screen.queryByPlaceholderText('Search tasks')).toBeNull();
      expect(await screen.findByText('Call mum')).toBeOnTheScreen();
    });
  });

  describe('subtasks', () => {
    it('a task shows how many of its subtasks are done', async () => {
      routes['GET /tasks'] = () => page([parent()]);
      await openTasks();
      expect(await screen.findByText('1 of 3 subtasks')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Ship MVP, 1 of 3 subtasks' })).toBeOnTheScreen();
    });

    it.each([
      ['Complete all', { includeSubtasks: true }],
      ['Only this task', undefined],
    ])('with open subtasks, ticking asks first: "%s"', async (choice, body) => {
      routes['GET /tasks'] = () => page([parent()]);
      routes['POST /tasks/t1/complete'] = () => ({ status: 200, body: { data: { task: {} } } });
      await openTasks();

      const dialog = await tickAndGetDialog();
      expect(dialog.title).toBe('Complete the subtasks too?');
      expect(dialog.message).toBe('2 subtasks aren’t done yet.');
      expect(calls.filter((c) => c.route === 'POST /tasks/t1/complete')).toHaveLength(0);

      await act(async () => dialog.buttons.find((b) => b.text === choice)?.onPress?.());
      await waitFor(() =>
        expect(calls.filter((c) => c.route === 'POST /tasks/t1/complete')).toHaveLength(1),
      );
      expect(calls.find((c) => c.route === 'POST /tasks/t1/complete')?.body).toEqual(body);
    });

    it('Cancel leaves the task as it was', async () => {
      routes['GET /tasks'] = () => page([parent()]);
      await openTasks();
      const dialog = await tickAndGetDialog();
      await act(async () => dialog.buttons.find((b) => b.text === 'Cancel')?.onPress?.());
      expect(calls.filter((c) => c.route.startsWith('POST'))).toHaveLength(0);
      expect(screen.getByRole('checkbox', { name: 'Ship MVP' })).not.toBeChecked();
    });

    it('with every subtask done, ticking just completes the task', async () => {
      routes['GET /tasks'] = () =>
        page([task({ title: 'Ship MVP', subtaskCount: 2, subtasksDone: 2 })]);
      routes['POST /tasks/t1/complete'] = () => ({ status: 200, body: { data: { task: {} } } });
      const alert = jest.spyOn(Alert, 'alert');
      await openTasks();
      await fireEvent.press(await screen.findByRole('checkbox', { name: 'Ship MVP' }));
      expect(alert).not.toHaveBeenCalled();
      alert.mockRestore();
      await waitFor(() =>
        expect(calls.filter((c) => c.route === 'POST /tasks/t1/complete')).toHaveLength(1),
      );
    });
  });

  describe('highlighted card (the design’s top card)', () => {
    it('shows the most important task due today, once, with its time and subtasks', async () => {
      const items = [
        dueToday({ priority: 'HIGH', subtaskCount: 3, subtasksDone: 1, categoryId: WORK.id }),
        task({ title: 'Later' }),
      ];
      routes['GET /tasks'] = () => page(items);
      const router = await openTasks();
      const card = await screen.findByTestId('focus-card');
      expect(within(card).getByText('Ship MVP')).toBeOnTheScreen();
      expect(within(card).getByText('Work · Today')).toBeOnTheScreen();
      expect(within(card).getByText('10:00')).toBeOnTheScreen();
      // Not repeated in the list below.
      expect(screen.getAllByText('Ship MVP')).toHaveLength(1);
      expect(screen.getByText('Later')).toBeOnTheScreen();

      await fireEvent.press(within(card).getByRole('button', { name: 'Subtasks, 1 of 3' }));
      await waitFor(() => expect(router.getPathname()).toBe('/task-form'));
    });

    it('"Swipe to complete" (or its screen-reader action) completes the task', async () => {
      const items = [dueToday()];
      routes['GET /tasks'] = () => page(items);
      routes['POST /tasks/t1/complete'] = () => ({ status: 200, body: { data: { task: {} } } });
      await openTasks();
      const bar = await screen.findByLabelText('Complete Ship MVP');
      await fireEvent(bar, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
      await waitFor(() =>
        expect(calls.filter((c) => c.route === 'POST /tasks/t1/complete')).toHaveLength(1),
      );
    });

    it('the swipe itself: most of the way completes, a short drag springs back', async () => {
      const items = [dueToday()];
      routes['GET /tasks'] = () => page(items);
      routes['POST /tasks/t1/complete'] = () => ({ status: 200, body: { data: { task: {} } } });
      await openTasks();
      await layout(await screen.findByTestId('swipe-to-complete'), 300); // 240 pt of travel
      const track = screen.getByTestId('swipe-track'); // fresh handlers that know the width

      await swipe(track, 120); // half way: not enough
      await wait(300);
      expect(calls.filter((c) => c.route === 'POST /tasks/t1/complete')).toHaveLength(0);

      await swipe(screen.getByTestId('swipe-track'), 200); // over 70%
      await wait(300);
      await waitFor(() =>
        expect(calls.filter((c) => c.route === 'POST /tasks/t1/complete')).toHaveLength(1),
      );
    });

    it('with open subtasks, completing from the card asks first too', async () => {
      const items = [dueToday({ subtaskCount: 2, subtasksDone: 0 })];
      routes['GET /tasks'] = () => page(items);
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      await openTasks();
      const bar = await screen.findByLabelText('Complete Ship MVP');
      await fireEvent(bar, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
      expect(alert.mock.calls.at(-1)?.[0]).toBe('Complete the subtasks too?');
      alert.mockRestore();
    });

    it('is not shown while searching: the found task is a normal row', async () => {
      const items = [dueToday()];
      routes['GET /tasks'] = () => page(items);
      await openTasks();
      await screen.findByTestId('focus-card');

      await fireEvent.press(screen.getByRole('button', { name: 'Search tasks' }));
      await fireEvent.changeText(screen.getByLabelText('Search tasks'), 'ship');
      await wait(300);
      // Wait for the search results (a row has a tick), then check there's no card.
      expect(await screen.findByRole('checkbox', { name: 'Ship MVP' })).toBeOnTheScreen();
      expect(screen.queryByTestId('focus-card')).toBeNull();
    });

    it('finds the most important due task even if it isn\u2019t on the loaded page', async () => {
      const today = localToday(ZONE);
      const recent = task({ title: 'Water plants', dueDate: today, priority: 'LOW' });
      const old = task({
        title: 'Renew passport',
        dueDate: addDays(today, -20),
        priority: 'URGENT',
      });
      // The list's first page has only the recent task; the card asks for due tasks separately.
      routes['GET /tasks'] = (_b, path) =>
        page(
          path.includes('dueTo=') ? [recent, old] : [recent],
          path.includes('dueTo=') ? null : 'more',
        );
      await openTasks();
      const card = await screen.findByTestId('focus-card');
      expect(within(card).getByText('Renew passport')).toBeOnTheScreen();
      expect(gets('/tasks')).toContain(`GET /tasks?status=TODO&dueTo=${today}&limit=100`);
    });

    it('nothing due today or overdue: no card', async () => {
      const items = [task({ title: 'Someday' })];
      routes['GET /tasks'] = () => page(items);
      await openTasks();
      await screen.findByText('Someday');
      expect(screen.queryByTestId('focus-card')).toBeNull();
    });
  });

  describe('repeating tasks', () => {
    it('rows say how a task repeats; the card shows it like the design', async () => {
      const items = [
        dueToday({ title: 'Standup', recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' }),
        task({
          title: 'Rent',
          dueDate: addDays(localToday(ZONE), 5),
          recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=1',
        }),
      ];
      routes['GET /tasks'] = () => page(items);
      await openTasks();
      const card = await screen.findByTestId('focus-card');
      expect(within(card).getByText('Weekdays')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: /^Rent, .*, repeats monthly$/ })).toBeOnTheScreen();
      // Seen as well as heard: the row's details line says it.
      expect(screen.getByText(/· repeats monthly$/)).toBeOnTheScreen();
    });

    it('completing one says when the next is due', async () => {
      const today = localToday(ZONE);
      const items = [
        task({ title: 'Rent', dueDate: addDays(today, 5), recurrenceRule: 'FREQ=DAILY' }),
      ];
      routes['GET /tasks'] = () => page(items);
      routes['POST /tasks/t1/complete'] = () => ({
        status: 200,
        body: {
          data: {
            task: {},
            nextOccurrence: { id: 't2', title: 'Rent', dueDate: '2026-11-16' },
          },
        },
      });
      await openTasks();
      await fireEvent.press(await screen.findByRole('checkbox', { name: 'Rent' }));
      expect(await screen.findByText('Done. The next one is due Mon 16 Nov.')).toBeOnTheScreen();
    });
  });

  describe('swiping a row (week 13)', () => {
    it('swiping right completes the task', async () => {
      const items = [task({ title: 'Pay rent' })];
      routes['GET /tasks'] = () => page(items);
      routes['POST /tasks/t1/complete'] = () => ({ status: 200, body: { data: { task: {} } } });
      await openTasks();
      await swipe(await rowFor('Pay rent'), 200);
      await wait(300); // the slide back finishes, then the action runs
      await waitFor(() =>
        expect(calls.filter((c) => c.route === 'POST /tasks/t1/complete')).toHaveLength(1),
      );
    });

    it('swiping left deletes it, with Undo', async () => {
      const items = [task({ title: 'Pay rent' })];
      routes['GET /tasks'] = () => page(items);
      routes['DELETE /tasks/t1'] = () => ({ status: 204 });
      await openTasks();
      await swipe(await rowFor('Pay rent'), -200);
      await wait(300);
      await waitFor(() => expect(calls.some((c) => c.route === 'DELETE /tasks/t1')).toBe(true));
      expect(
        within(await screen.findByTestId('toast')).getByRole('button', { name: 'Undo' }),
      ).toBeOnTheScreen();
    });

    it('a short swipe, or a mostly vertical drag (scrolling), does nothing', async () => {
      const items = [task({ title: 'Pay rent' })];
      routes['GET /tasks'] = () => page(items);
      await openTasks();
      const row = await rowFor('Pay rent');
      await swipe(row, 60); // 20% of the row: below the 35% needed
      await swipe(row, 150, 400); // far enough sideways, but mostly down: a scroll
      await wait(300);
      expect(
        calls.filter((c) => c.route.startsWith('POST') || c.route.startsWith('DELETE')),
      ).toHaveLength(0);
    });

    it('swiping right on a task with open subtasks asks first, like ticking it', async () => {
      const items = [task({ title: 'Ship MVP', subtaskCount: 2, subtasksDone: 0 })];
      routes['GET /tasks'] = () => page(items);
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      await openTasks();
      await swipe(await rowFor('Ship MVP'), 200);
      await wait(300);
      expect(alert.mock.calls.at(-1)?.[0]).toBe('Complete the subtasks too?');
      alert.mockRestore();
    });
  });
});
