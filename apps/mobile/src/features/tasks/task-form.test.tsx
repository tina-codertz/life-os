import type { PublicCategory, PublicTask, PublicUser } from '@life-os/shared';
import { router as appRouter, type Href } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { authStore } from '@/features/auth/auth-instance';
import { apiError, calls, resetMockApi, routes } from '@/test/mock-auth-instance';
import { weekdayOf } from '@life-os/shared';
import { addDays, formatDayLong, formatDue, localToday, monthOf } from './dates';

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
const EXISTING: PublicTask = {
  id: 't1',
  title: 'Pay rent',
  description: 'Bank transfer',
  priority: 'HIGH',
  status: 'TODO',
  dueDate: null,
  dueTime: null,
  durationMinutes: null,
  completedAt: null,
  categoryId: WORK.id,
  goalId: null,
  milestoneId: null,
  parentId: null,
  recurrenceRule: null,
  subtaskCount: 0,
  subtasksDone: 0,
  sortOrder: 0,
  createdAt: '2026-11-08T09:00:00.000Z',
  updatedAt: '2026-11-08T09:00:00.000Z',
};

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const choose = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));
const bodies = (route: string) => calls.filter((c) => c.route === route).map((c) => c.body);

// Opens the Tasks tab, then the sheet (so "back" has somewhere to go).
async function openForm(url: Href, existing: PublicTask = EXISTING) {
  authStore.setState({ status: 'signedIn', user: USER, accessToken: 'a', refreshToken: 'r' });
  routes['GET /users/me'] = () => ({
    status: 200,
    body: { data: { user: USER, settings: { theme: 'SYSTEM', timezone: ZONE } } },
  });
  routes['GET /categories'] = () => ({ status: 200, body: { data: [WORK] } });
  routes['GET /tasks'] = () => ({
    status: 200,
    body: { data: [], meta: { nextCursor: null, hasMore: false } },
  });
  routes[`GET /tasks/${EXISTING.id}`] = () => ({
    status: 200,
    body: { data: { subtasks: [], ...existing } },
  });
  const router = await renderRouter('src/app', { initialUrl: '/tasks' });
  await act(async () => appRouter.push(url));
  return router;
}

const today = () => localToday(ZONE);
const createReturnsBody = () => {
  routes['POST /tasks'] = (body) => ({
    status: 201,
    body: { data: { ...EXISTING, ...body, id: 't9' } },
  });
};

const addSubtask = async (title: string) => {
  await fireEvent.changeText(screen.getByLabelText('New subtask'), title);
  await fireEvent(screen.getByLabelText('New subtask'), 'submitEditing');
};

beforeEach(() => resetMockApi());

describe('task form', () => {
  it('creates a task with the chosen priority and due date', async () => {
    routes['POST /tasks'] = (body) => ({
      status: 201,
      body: { data: { ...EXISTING, ...body, id: 't9' } },
    });
    const router = await openForm('/task-form');

    await fireEvent.changeText(await screen.findByLabelText('Title'), '  Water plants ');
    await choose('Tomorrow');
    await choose('Medium');
    await choose('Work');
    await press('Add task');

    await waitFor(() => expect(bodies('POST /tasks')).toHaveLength(1));
    expect(bodies('POST /tasks')[0]).toEqual({
      title: 'Water plants',
      description: '',
      priority: 'MEDIUM',
      categoryId: WORK.id,
      dueDate: addDays(localToday(ZONE), 1), // "tomorrow" in the user's zone
      dueTime: null,
      recurrenceRule: null,
    });
    await waitFor(() => expect(router.getPathname()).toBe('/tasks'));
  });

  it('needs a title and sends nothing without one', async () => {
    await openForm('/task-form');
    await screen.findByLabelText('Title');
    await press('Add task');
    expect(await screen.findByText('Give the task a title.')).toBeOnTheScreen();
    expect(bodies('POST /tasks')).toHaveLength(0);
  });

  it('edits: fills the form, then saves the changes', async () => {
    routes[`PATCH /tasks/${EXISTING.id}`] = (body) => ({
      status: 200,
      body: { data: { ...EXISTING, ...body } },
    });
    await openForm(`/task-form?id=${EXISTING.id}`);

    expect(await screen.findByDisplayValue('Pay rent')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Bank transfer')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'High' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Work' })).toBeSelected();

    await fireEvent.changeText(screen.getByLabelText('Title'), 'Pay rent today');
    await choose('No category');
    await press('Save');

    await waitFor(() => expect(bodies(`PATCH /tasks/${EXISTING.id}`)).toHaveLength(1));
    expect(bodies(`PATCH /tasks/${EXISTING.id}`)[0]).toMatchObject({
      title: 'Pay rent today',
      categoryId: null,
      priority: 'HIGH',
    });
  });

  it('delete from the sheet offers Undo', async () => {
    routes[`DELETE /tasks/${EXISTING.id}`] = () => ({ status: 204 });
    routes[`POST /tasks/${EXISTING.id}/restore`] = () => ({
      status: 200,
      body: { data: EXISTING },
    });
    const router = await openForm(`/task-form?id=${EXISTING.id}`);

    await screen.findByDisplayValue('Pay rent');
    await press('Delete task');
    await waitFor(() => expect(router.getPathname()).toBe('/tasks'));
    await press('Undo');
    await waitFor(() =>
      expect(calls.some((c) => c.route === `POST /tasks/${EXISTING.id}/restore`)).toBe(true),
    );
  });

  it("shows the server's field error (e.g. not your category) on the field", async () => {
    routes['POST /tasks'] = () => ({
      status: 400,
      body: apiError('VALIDATION_FAILED', 'Some fields are invalid.', [
        { field: 'categoryId', message: 'Choose one of your categories.' },
      ]),
    });
    await openForm('/task-form');
    await fireEvent.changeText(await screen.findByLabelText('Title'), 'Sneaky');
    await choose('Work');
    await press('Add task');
    expect(await screen.findByText('Choose one of your categories.')).toBeOnTheScreen();
  });

  describe('due date', () => {
    it('picks any later day from the calendar, which then closes', async () => {
      createReturnsBody();
      await openForm('/task-form');
      await fireEvent.changeText(await screen.findByLabelText('Title'), 'Dentist');

      const target = addDays(today(), 10);
      await choose('Pick a date');
      expect(screen.getByTestId('month-calendar')).toBeOnTheScreen();
      if (monthOf(target) !== monthOf(today())) await press('Next month');
      await press(formatDayLong(target));

      // The chip now names the day, and the calendar has closed.
      const label = formatDue(target, today()).text;
      expect(screen.getByRole('radio', { name: label })).toBeSelected();
      expect(screen.queryByTestId('month-calendar')).toBeNull();

      await press('Add task');
      await waitFor(() => expect(bodies('POST /tasks')).toHaveLength(1));
      expect(bodies('POST /tasks')[0]).toMatchObject({ dueDate: target });
    });

    it("can't go back before this month or pick a past day", async () => {
      await openForm('/task-form');
      await screen.findByLabelText('Title');
      await choose('Pick a date');

      expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
      expect(
        screen.getByRole('button', { name: `Today, ${formatDayLong(today())}` }),
      ).toBeEnabled();
      const yesterday = addDays(today(), -1);
      if (monthOf(yesterday) === monthOf(today())) {
        expect(screen.getByRole('button', { name: formatDayLong(yesterday) })).toBeDisabled();
      }
    });

    it('Today and Tomorrow are one tap; the date can be removed again', async () => {
      createReturnsBody();
      await openForm('/task-form');
      await fireEvent.changeText(await screen.findByLabelText('Title'), 'Call mum');

      await choose('Today');
      expect(screen.getByRole('radio', { name: 'Today' })).toBeSelected();
      await press('Remove due date');
      expect(screen.getByRole('radio', { name: 'Today' })).not.toBeSelected();
      expect(screen.queryByRole('button', { name: 'Remove due date' })).toBeNull();

      await press('Add task');
      await waitFor(() => expect(bodies('POST /tasks')).toHaveLength(1));
      expect(bodies('POST /tasks')[0]).toMatchObject({ dueDate: null });
    });
  });

  describe('time', () => {
    it("can't be set until there is a date", async () => {
      await openForm('/task-form');
      await screen.findByLabelText('Title');
      expect(screen.getByLabelText('Time, Pick a date first')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: /^Time/ })).toBeNull();
    });

    it('opens the picker, saves the chosen time, and shows it on the row', async () => {
      createReturnsBody();
      await openForm('/task-form');
      await fireEvent.changeText(await screen.findByLabelText('Title'), 'Standup');
      await choose('Today');

      await press('Time, None');
      // The phone's picker reports 16:30.
      await fireEvent(screen.getByTestId('time-picker'), 'onChange', {
        nativeEvent: { timestamp: new Date(2026, 0, 1, 16, 30).getTime() },
      });
      expect(screen.getByRole('button', { name: 'Time, 16:30' })).toBeOnTheScreen();

      await press('Add task');
      await waitFor(() => expect(bodies('POST /tasks')).toHaveLength(1));
      expect(bodies('POST /tasks')[0]).toMatchObject({ dueDate: today(), dueTime: 16 * 60 + 30 });
    });

    it('removing the date removes the time too', async () => {
      createReturnsBody();
      await openForm('/task-form');
      await fireEvent.changeText(await screen.findByLabelText('Title'), 'Gym');
      await choose('Tomorrow');
      await press('Time, None'); // adds the next full hour
      await press('Remove due date');
      expect(screen.getByLabelText('Time, Pick a date first')).toBeOnTheScreen();

      await press('Add task');
      await waitFor(() => expect(bodies('POST /tasks')).toHaveLength(1));
      expect(bodies('POST /tasks')[0]).toMatchObject({ dueDate: null, dueTime: null });
    });

    it('editing shows the saved time, and Remove time clears it', async () => {
      routes[`PATCH /tasks/${EXISTING.id}`] = (body) => ({
        status: 200,
        body: { data: { ...EXISTING, ...body } },
      });
      await openForm(`/task-form?id=${EXISTING.id}`, {
        ...EXISTING,
        dueDate: today(),
        dueTime: 9 * 60 + 15,
      });
      expect(await screen.findByRole('button', { name: 'Time, 09:15' })).toBeOnTheScreen();

      await press('Remove time');
      await press('Save');
      await waitFor(() => expect(bodies(`PATCH /tasks/${EXISTING.id}`)).toHaveLength(1));
      expect(bodies(`PATCH /tasks/${EXISTING.id}`)[0]).toMatchObject({ dueTime: null });
    });
  });

  describe('subtasks', () => {
    it('a new task: subtasks typed before saving are created with it, in order', async () => {
      createReturnsBody();
      routes['POST /tasks/t9/subtasks'] = (body) => ({
        status: 201,
        body: { data: { ...EXISTING, id: `s-${String(body?.['title'])}`, parentId: 't9' } },
      });
      await openForm('/task-form');
      await fireEvent.changeText(await screen.findByLabelText('Title'), 'Move house');

      await addSubtask('Book van');
      await addSubtask('Pack books');
      await addSubtask('Oops');
      await press('Remove Oops');
      expect(screen.getByLabelText('Subtasks, 2')).toBeOnTheScreen();

      await press('Add task');
      await waitFor(() => expect(bodies('POST /tasks/t9/subtasks')).toHaveLength(2));
      expect(bodies('POST /tasks/t9/subtasks')).toEqual([
        { title: 'Book van' },
        { title: 'Pack books' },
      ]);
    });

    it('an empty subtask is refused with the shared message', async () => {
      await openForm('/task-form');
      await screen.findByLabelText('Title');
      await addSubtask('   ');
      expect(await screen.findByText('Give the task a title.')).toBeOnTheScreen();
    });

    const WITH_SUBTASKS = {
      ...EXISTING,
      subtaskCount: 2,
      subtasksDone: 0,
      subtasks: [
        { ...EXISTING, id: 's1', title: 'Transfer', parentId: EXISTING.id, priority: 'NONE' },
        { ...EXISTING, id: 's2', title: 'Get receipt', parentId: EXISTING.id, priority: 'NONE' },
      ],
    } as PublicTask;

    it('editing: tick, add and remove subtasks straight away', async () => {
      // A fake server that remembers each change, so re-reading the task sees it.
      const server = structuredClone(WITH_SUBTASKS) as PublicTask & { subtasks: PublicTask[] };
      const recount = () => {
        server.subtaskCount = server.subtasks.length;
        server.subtasksDone = server.subtasks.filter((t) => t.status === 'DONE').length;
      };
      routes['POST /tasks/s1/complete'] = () => {
        server.subtasks[0]!.status = 'DONE';
        recount();
        return { status: 200, body: { data: { task: server.subtasks[0] } } };
      };
      routes[`POST /tasks/${EXISTING.id}/subtasks`] = (body) => {
        const sub = {
          ...EXISTING,
          id: 's3',
          title: String(body?.['title']),
          parentId: EXISTING.id,
        };
        server.subtasks.push(sub);
        recount();
        return { status: 201, body: { data: sub } };
      };
      routes['DELETE /tasks/s2'] = () => {
        server.subtasks = server.subtasks.filter((t) => t.id !== 's2');
        recount();
        return { status: 204 };
      };
      await openForm(`/task-form?id=${EXISTING.id}`, server);

      expect(await screen.findByLabelText('Subtasks, 0 of 2')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('checkbox', { name: 'Transfer' }));
      await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Transfer' })).toBeChecked());
      expect(screen.getByLabelText('Subtasks, 1 of 2')).toBeOnTheScreen();
      await waitFor(() =>
        expect(calls.some((c) => c.route === 'POST /tasks/s1/complete')).toBe(true),
      );

      await addSubtask('Email landlord');
      expect(await screen.findByRole('checkbox', { name: 'Email landlord' })).toBeOnTheScreen();
      expect(bodies(`POST /tasks/${EXISTING.id}/subtasks`)).toEqual([{ title: 'Email landlord' }]);

      await press('Remove Get receipt');
      await waitFor(() =>
        expect(screen.queryByRole('checkbox', { name: 'Get receipt' })).toBeNull(),
      );
      await waitFor(() => expect(calls.some((c) => c.route === 'DELETE /tasks/s2')).toBe(true));
    });

    it('editing: ticking a subtask keeps what you typed but haven\u2019t saved', async () => {
      // The server remembers the tick, so the refreshed task really is a new, different one.
      const server = structuredClone(WITH_SUBTASKS) as PublicTask & { subtasks: PublicTask[] };
      routes['POST /tasks/s1/complete'] = () => {
        server.subtasks[0]!.status = 'DONE';
        server.subtasksDone = 1;
        return { status: 200, body: { data: { task: server.subtasks[0] } } };
      };
      await openForm(`/task-form?id=${EXISTING.id}`, server);
      await screen.findByRole('checkbox', { name: 'Transfer' }); // loaded and filled in
      await fireEvent.changeText(screen.getByLabelText('Title'), 'Pay rent and bills');
      await fireEvent.press(screen.getByRole('checkbox', { name: 'Transfer' }));

      // Wait for the refreshed task from the server (it says 1 of 2), then check the title.
      await waitFor(() =>
        expect(calls.filter((c) => c.route === `GET /tasks/${EXISTING.id}`).length).toBeGreaterThan(
          1,
        ),
      );
      expect(await screen.findByLabelText('Subtasks, 1 of 2')).toBeOnTheScreen();
      expect(screen.getByLabelText('Title').props.value).toBe('Pay rent and bills');
    });

    it('editing: a tick the server refuses is undone and says so', async () => {
      // The server's answer is held until the test releases it.
      let refuse: (() => void) | undefined;
      routes['POST /tasks/s1/complete'] = () =>
        new Promise((resolve) => {
          refuse = () =>
            resolve({
              status: 503,
              body: apiError('SERVICE_UNAVAILABLE', 'The database is unavailable.'),
            });
        });
      await openForm(`/task-form?id=${EXISTING.id}`, WITH_SUBTASKS);
      await screen.findByRole('checkbox', { name: 'Transfer' });
      // Re-reading the task never finishes, so only the rollback can untick it.
      routes[`GET /tasks/${EXISTING.id}`] = () => new Promise(() => {});

      await fireEvent.press(screen.getByRole('checkbox', { name: 'Transfer' }));
      await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Transfer' })).toBeChecked());

      await act(async () => refuse?.());
      expect(await screen.findByText("Couldn't update the subtask. Try again.")).toBeOnTheScreen();
      await waitFor(() =>
        expect(screen.getByRole('checkbox', { name: 'Transfer' })).not.toBeChecked(),
      );
    });
  });

  describe('repeat', () => {
    const DAY_NAME = {
      MO: 'Mon',
      TU: 'Tue',
      WE: 'Wed',
      TH: 'Thu',
      FR: 'Fri',
      SA: 'Sat',
      SU: 'Sun',
    };

    it("can't be set until there is a date", async () => {
      await openForm('/task-form');
      await screen.findByLabelText('Title');
      expect(screen.getByLabelText('Repeat, Pick a date first')).toBeOnTheScreen();
    });

    it.each([
      ['Daily', 'FREQ=DAILY'],
      ['Weekdays', 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'],
    ])('%s is one tap', async (choice, rule) => {
      createReturnsBody();
      await openForm('/task-form');
      await fireEvent.changeText(await screen.findByLabelText('Title'), 'Stretch');
      await choose('Today');
      await press('Repeat, Never');
      await choose(choice);
      await press('Add task');
      await waitFor(() => expect(bodies('POST /tasks')).toHaveLength(1));
      expect(bodies('POST /tasks')[0]).toMatchObject({ recurrenceRule: rule });
    });

    it('Weekly starts on the due date’s weekday; more days can be added, not the last removed', async () => {
      createReturnsBody();
      await openForm('/task-form');
      await fireEvent.changeText(await screen.findByLabelText('Title'), 'Bins out');
      await choose('Tomorrow');
      const tomorrow = addDays(today(), 1);
      const own = weekdayOf(tomorrow);
      const other = own === 'FR' ? 'MO' : 'FR';

      await press('Repeat, Never');
      await choose('Weekly');
      const ownChip = screen.getByRole('checkbox', { name: DAY_NAME[own] });
      expect(ownChip).toBeChecked();
      await fireEvent.press(ownChip); // the only day: stays
      expect(screen.getByRole('checkbox', { name: DAY_NAME[own] })).toBeChecked();
      await fireEvent.press(screen.getByRole('checkbox', { name: DAY_NAME[other] }));

      await press('Add task');
      await waitFor(() => expect(bodies('POST /tasks')).toHaveLength(1));
      const days = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].filter(
        (d) => d === own || d === other,
      );
      expect(bodies('POST /tasks')[0]).toMatchObject({
        recurrenceRule: `FREQ=WEEKLY;BYDAY=${days.join(',')}`,
      });
    });

    it('Monthly uses the due date’s day; Every few days takes a number', async () => {
      createReturnsBody();
      await openForm('/task-form');
      await fireEvent.changeText(await screen.findByLabelText('Title'), 'Water');
      await choose('Today');
      await press('Repeat, Never');
      await choose('Monthly');
      expect(
        screen.getByLabelText(`Repeat, Monthly on day ${Number(today().slice(8))}`),
      ).toBeOnTheScreen();

      await choose('Every few days');
      await fireEvent.changeText(screen.getByLabelText('Every how many days?'), '3');
      expect(screen.getByLabelText('Repeat, Every 3 days')).toBeOnTheScreen();
      await press('Add task');
      await waitFor(() => expect(bodies('POST /tasks')).toHaveLength(1));
      expect(bodies('POST /tasks')[0]).toMatchObject({ recurrenceRule: 'FREQ=DAILY;INTERVAL=3' });
    });

    it('Weekly stays open with Mon–Fri ticked, so Saturday can be added too', async () => {
      createReturnsBody();
      await openForm('/task-form');
      await fireEvent.changeText(await screen.findByLabelText('Title'), 'Run');
      await choose('Today');
      await press('Repeat, Never');
      await choose('Weekly');
      for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) {
        const chip = screen.getByRole('checkbox', { name: day });
        if (!chip.props.accessibilityState?.checked) await fireEvent.press(chip);
      }
      // Exactly Mon–Fri: untick the starting day if it's Sat or Sun (the probe found that
      // without this, the test only ever ran with a weekend day still ticked).
      for (const day of ['Sat', 'Sun']) {
        const chip = screen.getByRole('checkbox', { name: day });
        if (chip.props.accessibilityState?.checked) await fireEvent.press(chip);
      }
      // Still the weekday picker (not "Weekdays", which would hide it).
      expect(screen.getByRole('radio', { name: 'Weekly' })).toBeSelected();
      await fireEvent.press(screen.getByRole('checkbox', { name: 'Sat' }));
      await press('Add task');
      await waitFor(() => expect(bodies('POST /tasks')).toHaveLength(1));
      expect(bodies('POST /tasks')[0]).toMatchObject({
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA',
      });
    });

    it.each(['0', '400', ''])(
      'Every few days: %j blocks saving instead of keeping an old number',
      async (text) => {
        createReturnsBody();
        await openForm('/task-form');
        await fireEvent.changeText(await screen.findByLabelText('Title'), 'Water');
        await choose('Today');
        await press('Repeat, Never');
        await choose('Every few days');
        await fireEvent.changeText(screen.getByLabelText('Every how many days?'), '3');
        await fireEvent.changeText(screen.getByLabelText('Every how many days?'), text);
        expect(screen.getByText('Use a number from 1 to 365.')).toBeOnTheScreen();
        await press('Add task');
        expect(
          await screen.findByText('Choose daily, every few days, weekly on some days, or monthly.'),
        ).toBeOnTheScreen();
        expect(bodies('POST /tasks')).toHaveLength(0);
      },
    );

    it('removing the date removes the repeat; editing shows the saved one', async () => {
      createReturnsBody();
      await openForm('/task-form');
      await fireEvent.changeText(await screen.findByLabelText('Title'), 'Gym');
      await choose('Today');
      await press('Repeat, Never');
      await choose('Daily');
      await press('Remove due date');
      expect(screen.getByLabelText('Repeat, Pick a date first')).toBeOnTheScreen();
      await press('Add task');
      await waitFor(() => expect(bodies('POST /tasks')).toHaveLength(1));
      expect(bodies('POST /tasks')[0]).toMatchObject({ recurrenceRule: null });
    });

    it('editing shows the saved repeat', async () => {
      await openForm(`/task-form?id=${EXISTING.id}`, {
        ...EXISTING,
        dueDate: today(),
        recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=1',
      });
      expect(
        await screen.findByRole('button', { name: 'Repeat, Monthly on day 1' }),
      ).toBeOnTheScreen();
    });
  });
});
