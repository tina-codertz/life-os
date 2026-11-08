import { describe, expect, it } from 'vitest';
import { createTaskSchema, listTasksQuerySchema, updateTaskSchema } from './tasks.ts';

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
