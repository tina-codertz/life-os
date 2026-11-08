import type { Priority, PublicTask } from '@life-os/shared';

const RANK: Record<Priority, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };

// The task for the big card at the top of Tasks (the design's highlighted card): the most
// important open task that's due today or overdue. Highest priority first, then the earliest
// time (no time last), then the oldest due date. None if nothing is due yet.
export function pickFocusTask(tasks: PublicTask[], today: string): PublicTask | null {
  const due = tasks.filter((t) => t.status === 'TODO' && t.dueDate !== null && t.dueDate <= today);
  const sorted = due.toSorted(
    (a, b) =>
      RANK[b.priority] - RANK[a.priority] ||
      (a.dueTime ?? 1440) - (b.dueTime ?? 1440) ||
      (a.dueDate ?? '').localeCompare(b.dueDate ?? ''),
  );
  return sorted[0] ?? null;
}
