import type { INestApplication } from '@nestjs/common';
import {
  type AuthResult,
  type CompleteTaskResult,
  MAX_SUBTASKS,
  nextDueDate,
  type PublicTask,
  type TaskDetail,
} from '@life-os/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './utils/create-test-app.js';
import { resetDatabase } from './utils/test-db.js';

const PASSWORD = 'correct horse battery';
const titles = (res: { body: { data: PublicTask[] } }) => res.body.data.map((t) => t.title);

describe('Tasks (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tina: AuthResult;
  let juma: AuthResult;

  const http = () => request(app.getHttpServer());
  const as = (who: AuthResult) => {
    const auth = { Authorization: `Bearer ${who.accessToken}` };
    return {
      list: (query = '') => http().get(`/api/v1/tasks${query}`).set(auth),
      create: (body: object) => http().post('/api/v1/tasks').set(auth).send(body),
      get: (id: string) => http().get(`/api/v1/tasks/${id}`).set(auth),
      update: (id: string, body: object) =>
        http().patch(`/api/v1/tasks/${id}`).set(auth).send(body),
      remove: (id: string) => http().delete(`/api/v1/tasks/${id}`).set(auth),
      action: (id: string, name: string, body?: object) =>
        http().post(`/api/v1/tasks/${id}/${name}`).set(auth).send(body),
      addSubtask: (id: string, title: string) =>
        http().post(`/api/v1/tasks/${id}/subtasks`).set(auth).send({ title }),
      category: (name: string) =>
        http().post('/api/v1/categories').set(auth).send({ name, color: 'blue' }),
    };
  };
  const register = async (email: string): Promise<AuthResult> =>
    (
      await http()
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, displayName: 'X' })
        .expect(201)
    ).body.data;
  const newTask = async (who: AuthResult, body: object = {}): Promise<PublicTask> =>
    (
      await as(who)
        .create({ title: 'Task', ...body })
        .expect(201)
    ).body.data;

  const detail = async (who: AuthResult, id: string): Promise<TaskDetail> =>
    (await as(who).get(id).expect(200)).body.data;

  const completeIt = async (who: AuthResult, id: string) =>
    (await as(who).action(id, 'complete').expect(200)).body.data as CompleteTaskResult;

  // Completes a task at a chosen instant (the API would use "now").
  const doneAt = async (who: AuthResult, title: string, at: string, body: object = {}) => {
    const t = await newTask(who, { title, ...body });
    await prisma.task.update({
      where: { id: t.id },
      data: { status: 'DONE', completedAt: new Date(at) },
    });
    return t;
  };
  const history = (who: AuthResult, query: string) =>
    http()
      .get(`/api/v1/tasks/history${query}`)
      .set({ Authorization: `Bearer ${who.accessToken}` });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    tina = await register('tina@example.com');
    juma = await register('juma@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create and read', () => {
    it('needs only a title and fills in defaults', async () => {
      const task = await newTask(tina, { title: '  Buy milk ' });
      expect(task).toEqual({
        id: expect.any(String),
        title: 'Buy milk',
        description: null,
        priority: 'NONE',
        status: 'TODO',
        dueDate: null,
        dueTime: null,
        completedAt: null,
        categoryId: null,
        parentId: null,
        recurrenceRule: null,
        subtaskCount: 0,
        subtasksDone: 0,
        sortOrder: 0,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      // GET adds the (empty) subtask list.
      expect((await as(tina).get(task.id).expect(200)).body.data).toEqual({
        ...task,
        subtasks: [],
      });
    });

    it('stores a due date as a calendar day and a time as minutes', async () => {
      const work = (await as(tina).category('Work')).body.data;
      const task = await newTask(tina, {
        title: 'Pay rent',
        priority: 'HIGH',
        categoryId: work.id,
        dueDate: '2026-12-01',
        dueTime: 540,
      });
      expect(task).toMatchObject({
        priority: 'HIGH',
        categoryId: work.id,
        dueDate: '2026-12-01',
        dueTime: 540,
      });
    });

    it('validates with the shared schema (a time needs a date)', async () => {
      const res = await as(tina).create({ title: '', dueTime: 600 }).expect(400);
      expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual([
        'title',
        'dueTime',
      ]);
    });
  });

  describe('categories must be your own', () => {
    it("attaching another user's category is refused on the field", async () => {
      const jumasCategory = (await as(juma).category('Private')).body.data;

      const res = await as(tina)
        .create({ title: 'Sneaky', categoryId: jumasCategory.id })
        .expect(400);
      expect(res.body.error.details).toEqual([
        { field: 'categoryId', message: 'Choose one of your categories.' },
      ]);

      const task = await newTask(tina);
      await as(tina).update(task.id, { categoryId: jumasCategory.id }).expect(400);
      expect(await prisma.task.count({ where: { categoryId: jumasCategory.id } })).toBe(0);
    });
  });

  describe('update', () => {
    it('changes only what is sent; null clears', async () => {
      const work = (await as(tina).category('Work')).body.data;
      const task = await newTask(tina, { categoryId: work.id, description: 'Old' });
      const updated = (
        await as(tina).update(task.id, { title: 'Renamed', categoryId: null }).expect(200)
      ).body.data;
      expect(updated).toMatchObject({ title: 'Renamed', categoryId: null, description: 'Old' });
    });

    it('removing the date removes the time; a time cannot go on a dateless task', async () => {
      const task = await newTask(tina, { dueDate: '2026-12-01', dueTime: 540 });
      const cleared = (await as(tina).update(task.id, { dueDate: null }).expect(200)).body.data;
      expect(cleared).toMatchObject({ dueDate: null, dueTime: null });

      const res = await as(tina).update(task.id, { dueTime: 600 }).expect(400);
      expect(res.body.error.details).toEqual([
        { field: 'dueTime', message: 'A time needs a date.' },
      ]);
    });

    it('is strict: status changes go through /complete', async () => {
      const task = await newTask(tina);
      await as(tina).update(task.id, { status: 'DONE' }).expect(400);
    });
  });

  describe('complete and uncomplete', () => {
    it('records the completion time, keeps it on a repeat, clears it on uncomplete', async () => {
      const task = await newTask(tina);
      const done = (await as(tina).action(task.id, 'complete').expect(200)).body.data.task;
      expect(done.status).toBe('DONE');
      expect(Date.parse(done.completedAt)).toBeGreaterThan(0);

      const again = (await as(tina).action(task.id, 'complete').expect(200)).body.data.task;
      expect(again.completedAt).toBe(done.completedAt);

      const todo = (await as(tina).action(task.id, 'uncomplete').expect(200)).body.data.task;
      expect(todo).toMatchObject({ status: 'TODO', completedAt: null });
    });
  });

  describe('delete and restore', () => {
    it('deleted tasks disappear, and restore brings them back', async () => {
      const task = await newTask(tina, { title: 'Oops' });
      await as(tina).remove(task.id).expect(204);

      await as(tina).get(task.id).expect(404);
      expect(titles(await as(tina).list())).not.toContain('Oops');

      const restored = (await as(tina).action(task.id, 'restore').expect(200)).body.data;
      expect(restored.title).toBe('Oops');
      expect(titles(await as(tina).list())).toContain('Oops');
    });

    it('cannot restore after 30 days', async () => {
      const task = await newTask(tina);
      await as(tina).remove(task.id).expect(204);
      await prisma.task.update({
        where: { id: task.id },
        data: { deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) },
      });
      const res = await as(tina).action(task.id, 'restore').expect(404);
      expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('a deleted task cannot be edited or completed', async () => {
      const task = await newTask(tina);
      await as(tina).remove(task.id).expect(204);
      await as(tina).update(task.id, { title: 'x' }).expect(404);
      await as(tina).action(task.id, 'complete').expect(404);
    });
  });

  describe('list: filters, search, pagination', () => {
    it('filters by status, priority, category and due range, and searches', async () => {
      const work = (await as(tina).category('Work')).body.data;
      await newTask(tina, {
        title: 'Report',
        categoryId: work.id,
        priority: 'HIGH',
        dueDate: '2026-12-01',
      });
      await newTask(tina, { title: 'Gym', priority: 'LOW', dueDate: '2026-12-05' });
      const done = await newTask(tina, { title: 'Pay rent', description: 'Monthly bank transfer' });
      await as(tina).action(done.id, 'complete').expect(200);

      expect(titles(await as(tina).list('?status=DONE'))).toEqual(['Pay rent']);
      expect(titles(await as(tina).list('?priority=HIGH'))).toEqual(['Report']);
      expect(titles(await as(tina).list(`?categoryId=${work.id}`))).toEqual(['Report']);
      expect(titles(await as(tina).list('?dueFrom=2026-12-02&dueTo=2026-12-31'))).toEqual(['Gym']);
      expect(titles(await as(tina).list('?q=BANK'))).toEqual(['Pay rent']); // description, any case
    });

    it('pages newest first with a cursor, without gaps or repeats', async () => {
      await prisma.task.createMany({
        data: Array.from({ length: 35 }, (_, i) => ({ userId: tina.user.id, title: `T${i}` })),
      });

      const first = await as(tina).list().expect(200);
      expect(first.body.data).toHaveLength(30);
      expect(first.body.meta.hasMore).toBe(true);

      const second = await as(tina).list(`?cursor=${first.body.meta.nextCursor}`).expect(200);
      expect(second.body.data).toHaveLength(5);
      expect(second.body.meta).toEqual({ hasMore: false, nextCursor: null });

      const all = [...titles(first), ...titles(second)];
      expect(new Set(all).size).toBe(35);

      const small = await as(tina).list('?limit=10').expect(200);
      expect(small.body.data).toHaveLength(10);
    });

    it('rejects a bad cursor or limit as a field error', async () => {
      const bad = await as(tina).list('?cursor=garbage').expect(400);
      expect(bad.body.error.details[0].field).toBe('cursor');
      await as(tina).list('?limit=500').expect(400);
    });
  });

  describe('one user can never touch another', () => {
    it("another user's task is 404 everywhere and stays untouched", async () => {
      const task = await newTask(tina, { title: 'Private' });

      expect((await as(juma).list()).body.data).toEqual([]);
      await as(juma).get(task.id).expect(404);
      await as(juma).update(task.id, { title: 'Hacked' }).expect(404);
      await as(juma).action(task.id, 'complete').expect(404);
      await as(juma).remove(task.id).expect(404);
      await as(juma).action(task.id, 'restore').expect(404);

      expect((await as(tina).get(task.id)).body.data).toMatchObject({
        title: 'Private',
        status: 'TODO',
      });
    });

    it('a malformed ID is the same 404', async () => {
      const res = await as(tina).get('not-a-uuid').expect(404);
      expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    });

    it('needs a login', async () => {
      await http().get('/api/v1/tasks').expect(401);
    });
  });

  describe('subtasks (FR-TASK-005)', () => {
    it('adds subtasks in order; the task shows them and counts them', async () => {
      const task = await newTask(tina, { title: 'Ship MVP' });
      const first = (await as(tina).addSubtask(task.id, ' Schema ').expect(201)).body.data;
      await as(tina).addSubtask(task.id, 'Screens').expect(201);
      expect(first).toMatchObject({ title: 'Schema', parentId: task.id, status: 'TODO' });

      await as(tina).action(first.id, 'complete').expect(200);
      const shown = await detail(tina, task.id);
      expect(shown.subtasks.map((t) => [t.title, t.status])).toEqual([
        ['Schema', 'DONE'],
        ['Screens', 'TODO'],
      ]);
      expect(shown).toMatchObject({ subtaskCount: 2, subtasksDone: 1 });
    });

    it('lists show top-level tasks only, each with "done of total"', async () => {
      const task = await newTask(tina, { title: 'Parent' });
      const sub = (await as(tina).addSubtask(task.id, 'Child').expect(201)).body.data;
      await as(tina).action(sub.id, 'complete').expect(200);
      await as(tina).addSubtask(task.id, 'Another').expect(201);

      const all = (await as(tina).list().expect(200)).body.data as PublicTask[];
      expect(all.map((t) => t.title)).toEqual(['Parent']);
      expect(all[0]).toMatchObject({ subtaskCount: 2, subtasksDone: 1 });
      // Search doesn't surface subtasks on their own either.
      expect(titles(await as(tina).list('?q=child').expect(200))).toEqual([]);
    });

    it('one level only: a subtask cannot have subtasks', async () => {
      const task = await newTask(tina);
      const sub = (await as(tina).addSubtask(task.id, 'Child').expect(201)).body.data;
      const res = await as(tina).addSubtask(sub.id, 'Grandchild').expect(422);
      expect(res.body.error.code).toBe('SUBTASK_NOT_ALLOWED');
    });

    it(`allows at most ${MAX_SUBTASKS} per task`, async () => {
      const task = await newTask(tina);
      await prisma.task.createMany({
        data: Array.from({ length: MAX_SUBTASKS }, (_, i) => ({
          userId: tina.user.id,
          parentId: task.id,
          title: `Step ${i}`,
        })),
      });
      const res = await as(tina).addSubtask(task.id, 'One more').expect(422);
      expect(res.body.error.code).toBe('SUBTASK_LIMIT_REACHED');
    });

    it('completing a task leaves its subtasks alone unless asked', async () => {
      const task = await newTask(tina);
      await as(tina).addSubtask(task.id, 'A').expect(201);
      await as(tina).addSubtask(task.id, 'B').expect(201);

      const plain = (await as(tina).action(task.id, 'complete').expect(200)).body.data.task;
      expect(plain).toMatchObject({ status: 'DONE', subtaskCount: 2, subtasksDone: 0 });

      // Asked: the open subtasks are completed too (even though the task already was).
      const all = await as(tina).action(task.id, 'complete', { includeSubtasks: true }).expect(200);
      expect(all.body.data.task).toMatchObject({ subtasksDone: 2 });
      expect((await detail(tina, task.id)).subtasks.every((t) => t.status === 'DONE')).toBe(true);
    });

    it('a deleted subtask disappears from its task and the counts', async () => {
      const task = await newTask(tina);
      const sub = (await as(tina).addSubtask(task.id, 'Gone').expect(201)).body.data;
      await as(tina).remove(sub.id).expect(204);
      expect(await detail(tina, task.id)).toMatchObject({ subtasks: [], subtaskCount: 0 });
    });

    it("another user can't add to, see or complete your subtasks", async () => {
      const task = await newTask(tina);
      const sub = (await as(tina).addSubtask(task.id, 'Mine').expect(201)).body.data;
      await as(juma).addSubtask(task.id, 'Sneaky').expect(404);
      await as(juma).get(sub.id).expect(404);
      await as(juma).action(sub.id, 'complete').expect(404);
      expect((await detail(tina, task.id)).subtasks.map((t) => t.title)).toEqual(['Mine']);
    });

    it('refuses unknown fields on complete', async () => {
      const task = await newTask(tina);
      await as(tina).action(task.id, 'complete', { everything: true }).expect(400);
    });
  });

  describe('repeating tasks (FR-TASK-006)', () => {
    it('stores the rule in its standard spelling; it needs a date and must be valid', async () => {
      const task = await newTask(tina, {
        dueDate: '2026-11-09',
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=WE,MO',
      });
      expect(task.recurrenceRule).toBe('FREQ=WEEKLY;BYDAY=MO,WE');

      const noDate = await as(tina)
        .create({ title: 'x', recurrenceRule: 'FREQ=DAILY' })
        .expect(400);
      expect(noDate.body.error.details).toEqual([
        { field: 'recurrenceRule', message: 'A repeating task needs a date.' },
      ]);
      const bad = await as(tina)
        .create({ title: 'x', dueDate: '2026-11-09', recurrenceRule: 'FREQ=YEARLY' })
        .expect(400);
      expect(bad.body.error.details[0].field).toBe('recurrenceRule');
    });

    it('"Pay rent, monthly on day 1": completing creates the next one on the 1st', async () => {
      const category = (await as(tina).category('Home').expect(201)).body.data;
      const rent = await newTask(tina, {
        title: 'Pay rent',
        priority: 'HIGH',
        categoryId: category.id,
        dueDate: '2099-12-01',
        dueTime: 540,
        recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=1',
      });
      const { task, nextOccurrence } = await completeIt(tina, rent.id);
      expect(task.status).toBe('DONE');
      expect(nextOccurrence).toMatchObject({
        title: 'Pay rent',
        priority: 'HIGH',
        categoryId: category.id,
        dueDate: '2100-01-01',
        dueTime: 540,
        status: 'TODO',
        recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=1',
      });
      expect(titles(await as(tina).list('?status=TODO').expect(200))).toEqual(['Pay rent']);
    });

    it('day 31 lands on the last day of a shorter month', async () => {
      const t = await newTask(tina, {
        dueDate: '2099-10-31',
        recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=31',
      });
      expect((await completeIt(tina, t.id)).nextOccurrence?.dueDate).toBe('2099-11-30');
    });

    it('completed late, the next one is today or later (no pile of overdue copies)', async () => {
      const t = await newTask(tina, {
        dueDate: '2026-01-05',
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
      });
      // Tina's settings default to UTC.
      const expected = nextDueDate(
        { freq: 'WEEKLY', days: ['MO'] },
        '2026-01-05',
        new Date().toISOString().slice(0, 10),
      );
      expect((await completeIt(tina, t.id)).nextOccurrence?.dueDate).toBe(expected);
    });

    it('complete → uncomplete → complete makes only one next task', async () => {
      const t = await newTask(tina, { dueDate: '2099-01-01', recurrenceRule: 'FREQ=DAILY' });
      expect((await completeIt(tina, t.id)).nextOccurrence).not.toBeNull();
      await as(tina).action(t.id, 'uncomplete').expect(200);
      expect((await completeIt(tina, t.id)).nextOccurrence).toBeNull();
      expect(await prisma.task.count({ where: { userId: tina.user.id } })).toBe(2);
    });

    it('the next one gets the subtasks again, as a fresh checklist', async () => {
      const t = await newTask(tina, { dueDate: '2099-01-01', recurrenceRule: 'FREQ=DAILY' });
      const step = (await as(tina).addSubtask(t.id, 'Water plants').expect(201)).body.data;
      await as(tina).action(step.id, 'complete').expect(200);

      const next = (await completeIt(tina, t.id)).nextOccurrence as PublicTask;
      expect(next).toMatchObject({ subtaskCount: 1, subtasksDone: 0 });
      const shown = (await as(tina).get(next.id).expect(200)).body.data as TaskDetail;
      expect(shown.subtasks.map((s) => [s.title, s.status])).toEqual([['Water plants', 'TODO']]);
    });

    it('a task that doesn’t repeat creates nothing', async () => {
      const t = await newTask(tina, { dueDate: '2099-01-01' });
      expect((await completeIt(tina, t.id)).nextOccurrence).toBeNull();
    });

    it('editing: the rule can be changed or cleared; removing the date clears it', async () => {
      const t = await newTask(tina, { dueDate: '2099-01-01', recurrenceRule: 'FREQ=DAILY' });
      const changed = await as(tina)
        .update(t.id, { recurrenceRule: 'FREQ=DAILY;INTERVAL=2' })
        .expect(200);
      expect(changed.body.data.recurrenceRule).toBe('FREQ=DAILY;INTERVAL=2');
      const noDate = await as(tina).update(t.id, { dueDate: null }).expect(200);
      expect(noDate.body.data.recurrenceRule).toBeNull();
      const refused = await as(tina).update(t.id, { recurrenceRule: 'FREQ=DAILY' }).expect(400);
      expect(refused.body.error.details[0].field).toBe('recurrenceRule');
    });
  });

  describe('history', () => {
    beforeEach(async () => {
      await prisma.userSettings.update({
        where: { userId: tina.user.id },
        data: { timezone: 'Africa/Dar_es_Salaam' }, // UTC+3
      });
    });

    it('counts completed tasks per local day in the user’s time zone', async () => {
      await doneAt(tina, 'Late Saturday', '2026-11-07T20:00:00Z'); // 23:00 Sat in Dar
      await doneAt(tina, 'After midnight', '2026-11-07T22:30:00Z'); // 01:30 Sun in Dar
      await doneAt(tina, 'Sunday noon', '2026-11-08T09:00:00Z');

      const res = await history(tina, '?from=2026-11-07&to=2026-11-08').expect(200);
      expect(res.body.data).toEqual({
        from: '2026-11-07',
        to: '2026-11-08',
        total: 3,
        days: [
          { date: '2026-11-07', count: 1 },
          { date: '2026-11-08', count: 2 },
        ],
      });
    });

    it('leaves out open, deleted, other people’s, out-of-range tasks and subtasks', async () => {
      const kept = await doneAt(tina, 'Kept', '2026-11-08T09:00:00Z');
      await newTask(tina, { title: 'Still open' });
      const gone = await doneAt(tina, 'Deleted', '2026-11-08T09:00:00Z');
      await as(tina).remove(gone.id).expect(204);
      await doneAt(juma, 'Juma’s', '2026-11-08T09:00:00Z');
      await doneAt(tina, 'Last month', '2026-10-08T09:00:00Z');
      const sub = (await as(tina).addSubtask(kept.id, 'Step').expect(201)).body.data;
      await prisma.task.update({
        where: { id: sub.id },
        data: { status: 'DONE', completedAt: new Date('2026-11-08T09:00:00Z') },
      });

      const res = await history(tina, '?from=2026-11-01&to=2026-11-30&include=tasks').expect(200);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.days[0].tasks.map((t: PublicTask) => t.title)).toEqual(['Kept']);
    });

    it('include=tasks lists each day’s tasks, newest first', async () => {
      await doneAt(tina, 'Morning', '2026-11-08T06:00:00Z');
      await doneAt(tina, 'Evening', '2026-11-08T15:00:00Z');
      const res = await history(tina, '?from=2026-11-08&to=2026-11-08&include=tasks').expect(200);
      expect(res.body.data.days[0].tasks.map((t: PublicTask) => t.title)).toEqual([
        'Evening',
        'Morning',
      ]);
    });

    it('checks the range (a year at most; tasks for six weeks at most)', async () => {
      const backwards = await history(tina, '?from=2026-11-08&to=2026-11-01').expect(400);
      expect(backwards.body.error.details[0].field).toBe('to');
      await history(tina, '?from=2026-01-01&to=2026-12-31').expect(200);
      const tooMany = await history(tina, '?from=2026-01-01&to=2026-03-01&include=tasks').expect(
        400,
      );
      expect(tooMany.body.error.details[0].field).toBe('include');
    });

    it('needs a login', async () => {
      await http().get('/api/v1/tasks/history?from=2026-11-01&to=2026-11-08').expect(401);
    });
  });
});
