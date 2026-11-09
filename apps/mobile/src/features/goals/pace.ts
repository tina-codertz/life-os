import type { PublicGoal } from '@life-os/shared';
import { daysBetween } from '@/features/tasks/dates';

// How far behind progress may be before a goal is "Behind" (your choice: progress vs time).
export const PACE_SLACK = 10;

export type Pace =
  | { kind: 'completed' }
  | { kind: 'abandoned' }
  | { kind: 'no-target' }
  | { kind: 'overdue'; days: number }
  | { kind: 'active'; daysLeft: number; onTrack: boolean };

// The Goal detail's "42 days left · On track". A goal is on track when its progress keeps up
// with the share of time gone from the day it was made to its target day (within PACE_SLACK
// points); past the target it's overdue. `startDay` is the day it was made, in the user's zone.
export function goalPace(
  goal: Pick<PublicGoal, 'status' | 'targetDate' | 'progress'>,
  today: string,
  startDay: string,
): Pace {
  if (goal.status === 'COMPLETED') return { kind: 'completed' };
  if (goal.status === 'ABANDONED') return { kind: 'abandoned' };
  if (!goal.targetDate) return { kind: 'no-target' };
  const daysLeft = daysBetween(today, goal.targetDate);
  if (daysLeft < 0) return { kind: 'overdue', days: -daysLeft };
  const span = daysBetween(startDay, goal.targetDate);
  const timeGone = span <= 0 ? 100 : Math.min(100, (daysBetween(startDay, today) / span) * 100);
  return { kind: 'active', daysLeft, onTrack: goal.progress.percent >= timeGone - PACE_SLACK };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function daysLeftLabel(daysLeft: number): string {
  return daysLeft === 0 ? 'Due today' : `${plural(daysLeft, 'day')} left`;
}

export function overdueLabel(days: number): string {
  return `${plural(days, 'day')} overdue`;
}

// "20 Dec", or "31 Jan 2028" when it isn't this year (the design's "Due 31 Jan", "Done 2 Nov").
export function dayMonth(day: string, today: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    ...(day.slice(0, 4) === today.slice(0, 4) ? {} : { year: 'numeric' }),
  }).format(new Date(`${day}T00:00:00.000Z`));
}

// What the progress counts, in words: "4 of 6 milestones", "1 of 4 tasks", "Set by you".
export function progressCaption(goal: Pick<PublicGoal, 'progressMode' | 'progress'>): string {
  const { done, total } = goal.progress;
  if (goal.progressMode === 'MANUAL') return 'Set by you';
  const unit = goal.progressMode === 'TASKS' ? 'task' : 'milestone';
  if (total === 0) return `No ${unit}s yet`;
  return `${done} of ${plural(total, unit)}`;
}
