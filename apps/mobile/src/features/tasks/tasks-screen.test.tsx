import type { PublicCategory, PublicTask, PublicUser } from '@life-os/shared';
import { act, fireEvent, renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
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
    completedAt: null,
    categoryId: null,
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

beforeEach(() => {
  resetMockApi();
  n = 0;
});

describe('Tasks screen', () => {
  it('lists tasks with due label, priority and category in words', async () => {
    const today = localToday(ZONE);
    routes['GET /tasks'] = () =>
      page([
        task({ title: 'Pay rent', dueDate: today, priority: 'HIGH', categoryId: WORK.id }),
        task({ title: 'Old thing', dueDate: addDays(today, -3) }),
      ]);
    await openTasks();

    // What a screen reader says for each row: everything in words, nothing only in colour.
    expect(
      await screen.findByRole('button', { name: 'Pay rent, Today, High priority, Work' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Old thing, Overdue · / })).toBeOnTheScreen();
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
});
