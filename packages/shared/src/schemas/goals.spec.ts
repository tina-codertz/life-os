import { describe, expect, it } from 'vitest';
import {
  createGoalSchema,
  goalProgress,
  linkGoalTasksSchema,
  updateGoalSchema,
  updateMilestoneSchema,
} from './goals.ts';

const none = { done: 0, total: 0 };

describe('goalProgress (FR-GOAL-003)', () => {
  it('milestones: done over total, rounded (4 of 6 = 67%)', () => {
    expect(
      goalProgress('MILESTONES', {
        milestones: { done: 4, total: 6 },
        tasks: { done: 9, total: 9 },
        manual: 10,
      }),
    ).toEqual({ percent: 67, done: 4, total: 6 });
  });

  it('tasks: counts linked tasks, not milestones', () => {
    expect(
      goalProgress('TASKS', {
        milestones: { done: 1, total: 1 },
        tasks: { done: 1, total: 4 },
        manual: null,
      }),
    ).toEqual({ percent: 25, done: 1, total: 4 });
  });

  it('manual: the percentage itself; unset is 0', () => {
    expect(goalProgress('MANUAL', { milestones: none, tasks: none, manual: 45 })).toEqual({
      percent: 45,
      done: 45,
      total: 100,
    });
    expect(goalProgress('MANUAL', { milestones: none, tasks: none, manual: null }).percent).toBe(0);
  });

  it('nothing to count yet is 0%, not a division by zero', () => {
    expect(goalProgress('MILESTONES', { milestones: none, tasks: none, manual: null })).toEqual({
      percent: 0,
      done: 0,
      total: 0,
    });
  });
});

describe('goal schemas', () => {
  it('a new goal needs a title and counts milestones by default', () => {
    expect(createGoalSchema.parse({ title: '  Ship Life OS MVP ' })).toEqual({
      title: 'Ship Life OS MVP',
      progressMode: 'MILESTONES',
    });
    expect(createGoalSchema.safeParse({ title: ' ' }).success).toBe(false);
  });

  it('manual progress stays within 0–100', () => {
    expect(updateGoalSchema.safeParse({ manualProgress: 101 }).success).toBe(false);
    expect(updateGoalSchema.safeParse({ manualProgress: -1 }).success).toBe(false);
    expect(updateGoalSchema.safeParse({ manualProgress: 100 }).success).toBe(true);
  });

  it('PATCH bodies are strict', () => {
    expect(updateGoalSchema.safeParse({ titel: 'x' }).success).toBe(false);
    expect(updateMilestoneSchema.safeParse({ done: true }).success).toBe(false);
  });

  it('linking drops repeated ids', () => {
    const id = '0190f1c4-6c1e-7cc0-8000-000000000001';
    expect(linkGoalTasksSchema.parse({ taskIds: [id, id] })).toEqual({ taskIds: [id] });
  });
});
