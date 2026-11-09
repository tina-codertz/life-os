import type { INestApplication } from '@nestjs/common';
import {
  type AuthResult,
  type CompleteTaskResult,
  type GoalDetail,
  localToday,
  MAX_GOALS,
  MAX_MILESTONES,
  type PublicGoal,
  type PublicTask,
} from '@life-os/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './utils/create-test-app.js';
import { resetDatabase } from './utils/test-db.js';

const PASSWORD = 'correct horse battery';
const ZONE = 'Africa/Dar_es_Salaam';
const today = () => localToday(ZONE);

describe('Goals (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tina: AuthResult;
  let juma: AuthResult;

  const http = () => request(app.getHttpServer());
  const as = (who: AuthResult) => {
    const auth = { Authorization: `Bearer ${who.accessToken}` };
    return {
      list: (query = '') => http().get(`/api/v1/goals${query}`).set(auth),
      create: (body: object) => http().post('/api/v1/goals').set(auth).send(body),
      get: (id: string) => http().get(`/api/v1/goals/${id}`).set(auth),
      update: (id: string, body: object) =>
        http().patch(`/api/v1/goals/${id}`).set(auth).send(body),
      remove: (id: string) => http().delete(`/api/v1/goals/${id}`).set(auth),
      addMilestone: (id: string, body: object) =>
        http().post(`/api/v1/goals/${id}/milestones`).set(auth).send(body),
      milestone: (id: string, mid: string, body: object) =>
        http().patch(`/api/v1/goals/${id}/milestones/${mid}`).set(auth).send(body),
      removeMilestone: (id: string, mid: string) =>
        http().delete(`/api/v1/goals/${id}/milestones/${mid}`).set(auth),
      linkTasks: (id: string, taskIds: string[]) =>
        http().put(`/api/v1/goals/${id}/tasks`).set(auth).send({ taskIds }),
      linkHabits: (id: string, habitIds: string[]) =>
        http().put(`/api/v1/goals/${id}/habits`).set(auth).send({ habitIds }),
      newTask: async (body: object): Promise<PublicTask> =>
        (await http().post('/api/v1/tasks').set(auth).send(body).expect(201)).body.data,
      task: (id: string) => http().get(`/api/v1/tasks/${id}`).set(auth),
      patchTask: (id: string, body: object) =>
        http().patch(`/api/v1/tasks/${id}`).set(auth).send(body),
      complete: async (id: string): Promise<CompleteTaskResult> =>
        (await http().post(`/api/v1/tasks/${id}/complete`).set(auth).expect(200)).body.data,
      deleteTask: (id: string) => http().delete(`/api/v1/tasks/${id}`).set(auth),
    };
  };
  const register = async (email: string): Promise<AuthResult> =>
    (
      await http()
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, displayName: 'X' })
        .expect(201)
    ).body.data;
  const newGoal = async (who: AuthResult, body: object = {}): Promise<PublicGoal> =>
    (
      await as(who)
        .create({ title: 'Ship Life OS MVP', ...body })
        .expect(201)
    ).body.data;
  const withMilestones = async (who: AuthResult, titles: string[]): Promise<PublicGoal> => {
    let goal = await newGoal(who);
    for (const title of titles) {
      goal = (await as(who).addMilestone(goal.id, { title }).expect(201)).body.data;
    }
    return goal;
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    tina = await register('tina@example.com');
    juma = await register('juma@example.com');
    await prisma.userSettings.update({ where: { userId: tina.user.id }, data: { timezone: ZONE } });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create, read and list (FR-GOAL-001, 006)', () => {
    it('a new goal: trimmed title, active, counts milestones, 0% so far', async () => {
      const goal = await newGoal(tina, { title: '  Learn NestJS ', targetDate: '2027-01-31' });
      expect(goal).toMatchObject({
        title: 'Learn NestJS',
        description: null,
        status: 'ACTIVE',
        progressMode: 'MILESTONES',
        targetDate: '2027-01-31',
        completedAt: null,
        progress: { percent: 0, done: 0, total: 0 },
        milestones: [],
        tasks: { total: 0, done: 0 },
        habitIds: [],
      });
      expect((await as(tina).get(goal.id).expect(200)).body.data).toMatchObject({
        id: goal.id,
        linkedTasks: [],
      });
    });

    it('lists the soonest target first, goals without one last; filters by status', async () => {
      const later = await newGoal(tina, { title: 'Later', targetDate: '2027-04-30' });
      const none = await newGoal(tina, { title: 'Someday' });
      const soon = await newGoal(tina, { title: 'Soon', targetDate: '2026-12-20' });
      const list = (await as(tina).list().expect(200)).body.data as PublicGoal[];
      expect(list.map((g) => g.id)).toEqual([soon.id, later.id, none.id]);

      await as(tina).update(later.id, { status: 'COMPLETED' }).expect(200);
      const active = (await as(tina).list('?status=ACTIVE').expect(200)).body.data as PublicGoal[];
      expect(active.map((g) => g.id)).toEqual([soon.id, none.id]);
      await as(tina).list('?status=DONE').expect(400);
    });

    it('needs a title; the category must be your own', async () => {
      await as(tina).create({ title: '  ' }).expect(400);
      const theirs = await prisma.category.create({
        data: { userId: juma.user.id, name: 'Work', color: 'blue' },
      });
      const res = await as(tina).create({ title: 'X', categoryId: theirs.id }).expect(400);
      expect(res.body.error.details).toEqual([
        { field: 'categoryId', message: 'Choose one of your categories.' },
      ]);
    });

    it(`stops at ${MAX_GOALS} goals`, async () => {
      await prisma.goal.createMany({
        data: Array.from({ length: MAX_GOALS }, (_, i) => ({
          userId: tina.user.id,
          title: `Goal ${i}`,
        })),
      });
      const res = await as(tina).create({ title: 'One more' }).expect(422);
      expect(res.body.error.code).toBe('GOAL_LIMIT_REACHED');
    });
  });

  describe('status (FR-GOAL-005) and manual progress', () => {
    it('completing records the date once; reopening clears it', async () => {
      const goal = await newGoal(tina);
      const done = (await as(tina).update(goal.id, { status: 'COMPLETED' }).expect(200)).body
        .data as PublicGoal;
      expect(done.completedAt).not.toBeNull();
      const again = (await as(tina).update(goal.id, { status: 'COMPLETED' }).expect(200)).body
        .data as PublicGoal;
      expect(again.completedAt).toBe(done.completedAt);
      const reopened = (await as(tina).update(goal.id, { status: 'ACTIVE' }).expect(200)).body
        .data as PublicGoal;
      expect(reopened).toMatchObject({ status: 'ACTIVE', completedAt: null });
    });

    it('manual mode uses the percentage you set (0–100)', async () => {
      const goal = await newGoal(tina, { progressMode: 'MANUAL', manualProgress: 45 });
      expect(goal.progress).toEqual({ percent: 45, done: 45, total: 100 });
      await as(tina).update(goal.id, { manualProgress: 101 }).expect(400);
      await as(tina).update(goal.id, { managedProgress: 5 }).expect(400); // strict PATCH
    });

    it('the database refuses a percentage out of range even if the API let one through', async () => {
      const goal = await newGoal(tina);
      await expect(
        prisma.goal.update({ where: { id: goal.id }, data: { manualProgress: 150 } }),
      ).rejects.toThrow(/goal_manual_progress/);
    });
  });

  describe('milestones (FR-GOAL-002)', () => {
    it('ticking milestones moves the progress; ticking again keeps the first date', async () => {
      const goal = await withMilestones(tina, ['PRD', 'Database schema', 'Core screens']);
      expect(goal.milestones.map((m) => m.title)).toEqual([
        'PRD',
        'Database schema',
        'Core screens',
      ]);
      expect(goal.progress).toEqual({ percent: 0, done: 0, total: 3 });

      const [first] = goal.milestones;
      const ticked = (await as(tina).milestone(goal.id, first!.id, { completed: true }).expect(200))
        .body.data as PublicGoal;
      expect(ticked.progress).toEqual({ percent: 33, done: 1, total: 3 });
      const when = ticked.milestones[0]?.completedAt;
      expect(when).not.toBeNull();
      const again = (await as(tina).milestone(goal.id, first!.id, { completed: true }).expect(200))
        .body.data as PublicGoal;
      expect(again.milestones[0]?.completedAt).toBe(when);
      const unticked = (
        await as(tina).milestone(goal.id, first!.id, { completed: false }).expect(200)
      ).body.data as PublicGoal;
      expect(unticked.progress.done).toBe(0);
    });

    it('moving one renumbers the rest; removing one updates the progress', async () => {
      const goal = await withMilestones(tina, ['A', 'B', 'C']);
      const c = goal.milestones[2]!;
      const moved = (await as(tina).milestone(goal.id, c.id, { sortOrder: 0 }).expect(200)).body
        .data as PublicGoal;
      expect(moved.milestones.map((m) => [m.title, m.sortOrder])).toEqual([
        ['C', 0],
        ['A', 1],
        ['B', 2],
      ]);
      await as(tina).milestone(goal.id, c.id, { completed: true, title: 'C!', dueDate: today() });
      const after = (await as(tina).removeMilestone(goal.id, moved.milestones[1]!.id).expect(200))
        .body.data as PublicGoal;
      expect(after.milestones.map((m) => m.title)).toEqual(['C!', 'B']);
      expect(after.milestones[0]?.dueDate).toBe(today());
      expect(after.progress).toEqual({ percent: 50, done: 1, total: 2 });
    });

    it('an unknown milestone, or one on another goal, is 404', async () => {
      const goal = await withMilestones(tina, ['A']);
      const other = await withMilestones(tina, ['B']);
      const res = await as(tina)
        .milestone(goal.id, other.milestones[0]!.id, { completed: true })
        .expect(404);
      expect(res.body.error.code).toBe('MILESTONE_NOT_FOUND');
      await as(tina).removeMilestone(goal.id, 'not-an-id').expect(404);
    });

    it(`stops at ${MAX_MILESTONES} milestones`, async () => {
      const goal = await newGoal(tina);
      await prisma.milestone.createMany({
        data: Array.from({ length: MAX_MILESTONES }, (_, i) => ({
          goalId: goal.id,
          title: `${i}`,
        })),
      });
      const res = await as(tina).addMilestone(goal.id, { title: 'One more' }).expect(422);
      expect(res.body.error.code).toBe('MILESTONE_LIMIT_REACHED');
    });
  });

  describe('linked tasks (FR-GOAL-004, FR-GOAL-003 TASKS)', () => {
    it('PUT replaces the set; TASKS mode counts the done ones', async () => {
      const goal = await newGoal(tina, { progressMode: 'TASKS' });
      const [a, b, c] = await Promise.all(
        ['A', 'B', 'C'].map((title) => as(tina).newTask({ title })),
      );
      await as(tina).complete(a!.id);
      const linked = (await as(tina).linkTasks(goal.id, [a!.id, b!.id]).expect(200)).body
        .data as GoalDetail;
      expect(linked.progress).toEqual({ percent: 50, done: 1, total: 2 });
      expect(linked.linkedTasks.map((t) => t.title)).toEqual(['B', 'A']); // to do first
      expect(linked.linkedTasks[0]?.goalId).toBe(goal.id);

      const replaced = (await as(tina).linkTasks(goal.id, [c!.id]).expect(200)).body
        .data as GoalDetail;
      expect(replaced.linkedTasks.map((t) => t.title)).toEqual(['C']);
      expect((await as(tina).task(a!.id).expect(200)).body.data.goalId).toBeNull();
    });

    it('a task can be linked when it is created or edited; a deleted one stops counting', async () => {
      const goal = await newGoal(tina, { progressMode: 'TASKS' });
      const task = await as(tina).newTask({ title: 'Finish API auth module', goalId: goal.id });
      expect(task.goalId).toBe(goal.id);
      const other = await as(tina).newTask({ title: 'Other' });
      await as(tina).patchTask(other.id, { goalId: goal.id }).expect(200);
      expect((await as(tina).get(goal.id).expect(200)).body.data.tasks).toEqual({
        total: 2,
        done: 0,
      });
      await as(tina).deleteTask(other.id).expect(204);
      expect((await as(tina).get(goal.id).expect(200)).body.data.tasks).toEqual({
        total: 1,
        done: 0,
      });
    });

    it('a repeating task’s next occurrence counts towards the same goal', async () => {
      const goal = await newGoal(tina);
      const task = await as(tina).newTask({
        title: 'Weekly review',
        goalId: goal.id,
        dueDate: today(),
        recurrenceRule: 'FREQ=DAILY',
      });
      const { nextOccurrence } = await as(tina).complete(task.id);
      expect(nextOccurrence?.goalId).toBe(goal.id);
    });

    it('refuses subtasks and other users’ tasks or goals, linking none of the list', async () => {
      const goal = await newGoal(tina);
      const mine = await as(tina).newTask({ title: 'Mine' });
      const sub = (
        await http()
          .post(`/api/v1/tasks/${mine.id}/subtasks`)
          .set({ Authorization: `Bearer ${tina.accessToken}` })
          .send({ title: 'Step' })
          .expect(201)
      ).body.data as PublicTask;
      const theirs = await as(juma).newTask({ title: 'Theirs' });

      for (const ids of [
        [mine.id, sub.id],
        [mine.id, theirs.id],
      ]) {
        const res = await as(tina).linkTasks(goal.id, ids).expect(400);
        expect(res.body.error.details[0].field).toBe('taskIds');
      }
      expect((await as(tina).get(goal.id).expect(200)).body.data.linkedTasks).toEqual([]);

      await as(tina).patchTask(sub.id, { goalId: goal.id }).expect(400);
      const juma1 = await as(juma).patchTask(theirs.id, { goalId: goal.id }).expect(400);
      expect(juma1.body.error.details).toEqual([
        { field: 'goalId', message: 'Choose one of your goals.' },
      ]);
    });

    it('deleting a goal keeps its tasks but unlinks them', async () => {
      const goal = await newGoal(tina);
      const task = await as(tina).newTask({ title: 'Keep me', goalId: goal.id });
      await as(tina).remove(goal.id).expect(204);
      await as(tina).get(goal.id).expect(404);
      expect((await as(tina).list().expect(200)).body.data).toEqual([]);
      expect((await as(tina).task(task.id).expect(200)).body.data.goalId).toBeNull();
      // And a deleted goal can't be linked again.
      await as(tina).patchTask(task.id, { goalId: goal.id }).expect(400);
    });
  });

  describe('tasks on milestones ("Due 28 Nov · 3 tasks")', () => {
    it('a milestone sets the goal and counts its tasks', async () => {
      const goal = await withMilestones(tina, ['Core screens', 'Release']);
      const [core] = goal.milestones;
      const a = await as(tina).newTask({ title: 'Habits', milestoneId: core!.id });
      expect(a).toMatchObject({ goalId: goal.id, milestoneId: core!.id });
      await as(tina).newTask({ title: 'Goals', milestoneId: core!.id });
      await as(tina).newTask({ title: 'On the goal only', goalId: goal.id });
      await as(tina).complete(a.id);
      const read = (await as(tina).get(goal.id).expect(200)).body.data as GoalDetail;
      expect(read.milestones.map((m) => m.tasks)).toEqual([
        { total: 2, done: 1 },
        { total: 0, done: 0 },
      ]);
      expect(read.tasks).toEqual({ total: 3, done: 1 });
      expect(read.progress).toEqual({ percent: 0, done: 0, total: 2 }); // ticking stays yours
    });

    it('refuses another user’s milestone, or one of a different goal than the one sent', async () => {
      const mine = await withMilestones(tina, ['A']);
      const other = await newGoal(tina, { title: 'Other' });
      const theirs = await withMilestones(juma, ['B']);
      for (const body of [
        { title: 'X', milestoneId: theirs.milestones[0]!.id },
        { title: 'X', milestoneId: mine.milestones[0]!.id, goalId: other.id },
      ]) {
        const res = await http()
          .post('/api/v1/tasks')
          .set({ Authorization: `Bearer ${tina.accessToken}` })
          .send(body)
          .expect(400);
        expect(res.body.error.details[0].field).toBe('milestoneId');
      }
    });

    it('moving to another goal, unlinking, or removing the milestone takes the task off it', async () => {
      const goal = await withMilestones(tina, ['A']);
      const mid = goal.milestones[0]!.id;
      const other = await newGoal(tina, { title: 'Other' });
      const t1 = await as(tina).newTask({ title: '1', milestoneId: mid });
      const t2 = await as(tina).newTask({ title: '2', milestoneId: mid });
      const t3 = await as(tina).newTask({ title: '3', milestoneId: mid });
      const t4 = await as(tina).newTask({ title: '4', milestoneId: mid });

      // Same goal sent again: stays on the milestone. Milestone cleared: stays on the goal.
      const same = await as(tina).patchTask(t1.id, { goalId: goal.id }).expect(200);
      expect(same.body.data).toMatchObject({ goalId: goal.id, milestoneId: mid });
      const off = await as(tina).patchTask(t1.id, { milestoneId: null }).expect(200);
      expect(off.body.data).toMatchObject({ goalId: goal.id, milestoneId: null });
      // Another goal: off the milestone.
      const moved = await as(tina).patchTask(t2.id, { goalId: other.id }).expect(200);
      expect(moved.body.data).toMatchObject({ goalId: other.id, milestoneId: null });
      // Left out of PUT: unlinked from both.
      await as(tina).linkTasks(goal.id, [t1.id, t4.id]).expect(200);
      expect((await as(tina).task(t3.id).expect(200)).body.data).toMatchObject({
        goalId: null,
        milestoneId: null,
      });
      // Milestone removed: the task stays on the goal.
      await as(tina).removeMilestone(goal.id, mid).expect(200);
      expect((await as(tina).task(t4.id).expect(200)).body.data).toMatchObject({
        goalId: goal.id,
        milestoneId: null,
      });
    });

    it('a repeating task’s next occurrence stays on the milestone', async () => {
      const goal = await withMilestones(tina, ['A']);
      const mid = goal.milestones[0]!.id;
      const task = await as(tina).newTask({
        title: 'Daily standup notes',
        milestoneId: mid,
        dueDate: today(),
        recurrenceRule: 'FREQ=DAILY',
      });
      const { nextOccurrence } = await as(tina).complete(task.id);
      expect(nextOccurrence).toMatchObject({ goalId: goal.id, milestoneId: mid });
    });
  });

  describe('linked habits (FR-GOAL-004)', () => {
    it('PUT replaces the set; a deleted habit drops out; others’ habits are refused', async () => {
      const goal = await newGoal(tina);
      const habit = async (who: AuthResult, name: string): Promise<string> =>
        (
          await http()
            .post('/api/v1/habits')
            .set({ Authorization: `Bearer ${who.accessToken}` })
            .send({ name, color: 'violet', schedule: { frequency: 'DAILY' } })
            .expect(201)
        ).body.data.id;
      const read = await habit(tina, 'Read');
      const run = await habit(tina, 'Run');
      const theirs = await habit(juma, 'Theirs');

      const linked = (await as(tina).linkHabits(goal.id, [read, run]).expect(200)).body
        .data as GoalDetail;
      expect(linked.habitIds.toSorted()).toEqual([read, run].toSorted());
      expect(linked.progress.total).toBe(0); // habits are shown, not counted

      await as(tina).linkHabits(goal.id, [read, theirs]).expect(400);
      await http()
        .delete(`/api/v1/habits/${run}`)
        .set({ Authorization: `Bearer ${tina.accessToken}` })
        .expect(204);
      expect((await as(tina).get(goal.id).expect(200)).body.data.habitIds).toEqual([read]);
      expect(
        ((await as(tina).linkHabits(goal.id, []).expect(200)).body.data as GoalDetail).habitIds,
      ).toEqual([]);
    });
  });

  describe('one user can never touch another', () => {
    it('another user’s goal is 404 for every route, and missing from their list', async () => {
      const goal = await withMilestones(tina, ['A']);
      const mid = goal.milestones[0]!.id;
      const them = as(juma);
      for (const send of [
        () => them.get(goal.id),
        () => them.update(goal.id, { title: 'Mine now' }),
        () => them.remove(goal.id),
        () => them.addMilestone(goal.id, { title: 'X' }),
        () => them.milestone(goal.id, mid, { completed: true }),
        () => them.removeMilestone(goal.id, mid),
        () => them.linkTasks(goal.id, []),
        () => them.linkHabits(goal.id, []),
      ]) {
        const r = await send().expect(404);
        expect(r.body.error.code).toBe('GOAL_NOT_FOUND');
      }
      expect((await them.list().expect(200)).body.data).toEqual([]);
      const still = (await as(tina).get(goal.id).expect(200)).body.data as GoalDetail;
      expect(still).toMatchObject({ title: 'Ship Life OS MVP', progress: { done: 0, total: 1 } });
    });

    it('a malformed id is the same 404 as a missing one', async () => {
      const res = await as(tina).get('nope').expect(404);
      expect(res.body.error.code).toBe('GOAL_NOT_FOUND');
      await as(tina).get('0190f1c4-6c1e-7cc0-8000-000000000001').expect(404); // well-formed, unknown
    });
  });
});
