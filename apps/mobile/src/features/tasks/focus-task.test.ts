import type { PublicTask } from '@life-os/shared';
import { pickFocusTask } from './focus-task';
import { swipeCompletes } from './swipe-to-complete';

const TODAY = '2026-11-08';
let n = 0;
const task = (o: Partial<PublicTask>): PublicTask => ({
  id: `t${(n += 1)}`,
  title: `Task ${n}`,
  description: null,
  priority: 'NONE',
  status: 'TODO',
  dueDate: TODAY,
  dueTime: null,
  completedAt: null,
  categoryId: null,
  parentId: null,
  recurrenceRule: null,
  subtaskCount: 0,
  subtasksDone: 0,
  sortOrder: 0,
  createdAt: '2026-11-08T09:00:00.000Z',
  updatedAt: '2026-11-08T09:00:00.000Z',
  ...o,
});

describe('pickFocusTask', () => {
  it('prefers higher priority, then the earlier time, then the older date', () => {
    const low = task({ title: 'low', priority: 'LOW', dueTime: 480 });
    const highLate = task({ title: 'high late', priority: 'HIGH', dueTime: 900 });
    const highEarly = task({ title: 'high early', priority: 'HIGH', dueTime: 600 });
    expect(pickFocusTask([low, highLate, highEarly], TODAY)?.title).toBe('high early');

    const noTime = task({ title: 'no time', priority: 'MEDIUM' });
    const withTime = task({ title: 'with time', priority: 'MEDIUM', dueTime: 1200 });
    expect(pickFocusTask([noTime, withTime], TODAY)?.title).toBe('with time');

    const older = task({ title: 'overdue', dueDate: '2026-11-05' });
    const today = task({ title: 'today' });
    expect(pickFocusTask([today, older], TODAY)?.title).toBe('overdue');
  });

  it('ignores done tasks, future tasks and tasks without a date', () => {
    expect(
      pickFocusTask(
        [task({ status: 'DONE' }), task({ dueDate: '2026-11-09' }), task({ dueDate: null })],
        TODAY,
      ),
    ).toBeNull();
  });
});

describe('swipeCompletes', () => {
  it('needs 70% of the track', () => {
    expect(swipeCompletes(69, 100)).toBe(false);
    expect(swipeCompletes(70, 100)).toBe(true);
    expect(swipeCompletes(10, 0)).toBe(false); // not measured yet
  });
});
