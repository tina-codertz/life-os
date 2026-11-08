import type { PublicCategory, PublicTask, PublicUser } from '@life-os/shared';
import { router as appRouter, type Href } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
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
const EXISTING: PublicTask = {
  id: 't1',
  title: 'Pay rent',
  description: 'Bank transfer',
  priority: 'HIGH',
  status: 'TODO',
  dueDate: null,
  dueTime: null,
  completedAt: null,
  categoryId: WORK.id,
  sortOrder: 0,
  createdAt: '2026-11-08T09:00:00.000Z',
  updatedAt: '2026-11-08T09:00:00.000Z',
};

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const choose = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));
const bodies = (route: string) => calls.filter((c) => c.route === route).map((c) => c.body);

// Opens the Tasks tab, then the sheet (so "back" has somewhere to go).
async function openForm(url: Href) {
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
  routes[`GET /tasks/${EXISTING.id}`] = () => ({ status: 200, body: { data: EXISTING } });
  const router = await renderRouter('src/app', { initialUrl: '/tasks' });
  await act(async () => appRouter.push(url));
  return router;
}

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
});
