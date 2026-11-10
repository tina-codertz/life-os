import { describe, expect, it } from 'vitest';
import {
  createTaskSchema,
  historyQuerySchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from './tasks.ts';

describe('createTaskSchema', () => {
  it('needs only a title; trims it', () => {
    expect(createTaskSchema.parse({ title: '  Pay rent ' })).toEqual({ title: 'Pay rent' });
  });

  it('accepts a full task', () => {
    const task = {
      title: 'Pay rent',
      description: 'Bank transfer',
      priority: 'HIGH',
      categoryId: '0198b7a2-5a6b-7c3d-8e9f-0a1b2c3d4e5f',
      dueDate: '2026-12-01',
      dueTime: 540,
      durationMinutes: 90,
    };
    expect(createTaskSchema.parse(task)).toEqual(task);
  });

  it.each([
    [{ title: '' }, 'title'],
    [{ title: 'x'.repeat(201) }, 'title'],
    [{ title: 'A', priority: 'EXTREME' }, 'priority'],
    [{ title: 'A', dueDate: '2026-02-30' }, 'dueDate'],
    [{ title: 'A', dueDate: '01/12/2026' }, 'dueDate'],
    [{ title: 'A', dueDate: '2026-12-01', dueTime: 1440 }, 'dueTime'],
    [{ title: 'A', dueTime: 540 }, 'dueTime'], // a time without a date
    [{ title: 'A', dueDate: '2026-12-01', durationMinutes: 30 }, 'durationMinutes'], // no time
    [{ title: 'A', dueDate: '2026-12-01', dueTime: 540, durationMinutes: 4 }, 'durationMinutes'],
    [{ title: 'A', dueDate: '2026-12-01', dueTime: 540, durationMinutes: 721 }, 'durationMinutes'],
    [{ title: 'A', categoryId: 'not-a-uuid' }, 'categoryId'],
  ])('rejects %j (field %s)', (input, field) => {
    expect(createTaskSchema.safeParse(input).error?.issues[0]?.path).toEqual([field]);
  });
});

describe('updateTaskSchema', () => {
  it('is strict and lets null clear a field', () => {
    expect(updateTaskSchema.parse({ dueDate: null, categoryId: null })).toEqual({
      dueDate: null,
      categoryId: null,
    });
    expect(updateTaskSchema.safeParse({ status: 'DONE' }).success).toBe(false); // use /complete
  });
});

describe('listTasksQuerySchema', () => {
  it('parses query-string values and defaults the limit', () => {
    expect(
      listTasksQuerySchema.parse({ status: 'TODO', dueFrom: '2026-12-01', q: ' rent ' }),
    ).toEqual({
      limit: 30,
      status: 'TODO',
      dueFrom: '2026-12-01',
      q: 'rent',
    });
  });
});

describe('historyQuerySchema', () => {
  it('takes a range of local days, optionally with the tasks', () => {
    expect(
      historyQuerySchema.parse({ from: '2026-11-02', to: '2026-11-08', include: 'tasks' }),
    ).toEqual({ from: '2026-11-02', to: '2026-11-08', include: 'tasks' });
  });

  it.each([
    [{ from: '2026-11-08', to: '2026-11-01' }, 'to'],
    [{ from: '2026-01-01', to: '2027-01-02' }, 'to'], // 367 days
    [{ from: '2026-01-01', to: '2026-02-12', include: 'tasks' }, 'include'], // 43 days
    [{ from: '2026-02-30', to: '2026-03-01' }, 'from'],
  ])('refuses %j on %s', (query, field) => {
    const result = historyQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });

  it('a whole leap year is allowed', () => {
    expect(historyQuerySchema.safeParse({ from: '2028-01-01', to: '2028-12-31' }).success).toBe(
      true,
    );
  });
});
