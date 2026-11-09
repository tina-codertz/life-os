import { type HabitDay, type HabitSchedule, isMilestone, type PublicHabit } from '@life-os/shared';
import type { IconName } from '@/components/ui';
import { addDays } from '@/features/tasks/dates';

// Icons a habit can have: the design's line icons (Lucide names, stored on the habit).
export const HABIT_ICONS = [
  { name: 'book-open', glyph: 'book', label: 'Book' },
  { name: 'dumbbell', glyph: 'dumbbell', label: 'Workout' },
  { name: 'droplet', glyph: 'droplet', label: 'Water' },
  { name: 'footprints', glyph: 'footprints', label: 'Walk' },
  { name: 'brain', glyph: 'brain', label: 'Mind' },
  { name: 'moon', glyph: 'moon', label: 'Sleep' },
  { name: 'heart-pulse', glyph: 'health', label: 'Health' },
  { name: 'music', glyph: 'music', label: 'Music' },
] as const satisfies readonly { name: string; glyph: IconName; label: string }[];

const GLYPH = new Map<string, IconName>(HABIT_ICONS.map((i) => [i.name, i.glyph]));
export const habitIcon = (name: string | null): IconName => (name && GLYPH.get(name)) || 'flame';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "Every day", "Mon, Wed and Fri", "3 times a week".
export function scheduleLabel(schedule: HabitSchedule): string {
  if (schedule.frequency === 'DAILY') return 'Every day';
  if (schedule.frequency === 'TIMES_PER_WEEK') {
    return schedule.timesPerWeek === 1 ? 'Once a week' : `${schedule.timesPerWeek} times a week`;
  }
  const names = schedule.weekdays.map((d) => DAY_NAMES[d] ?? '');
  if (names.length === 7) return 'Every day';
  return names.length === 1
    ? `Every ${names[0]}`
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

const weekday = (day: string) => new Date(`${day}T00:00:00.000Z`).getUTCDay();
export const isDue = (schedule: HabitSchedule, day: string) =>
  schedule.frequency !== 'WEEKLY_DAYS' || schedule.weekdays.includes(weekday(day));

// The milestone rule (every 7th day, and the challenge's last day) is shared with the server.
export { isMilestone } from '@life-os/shared';

export type PathNode =
  | { kind: 'done' | 'missed'; date: string }
  | { kind: 'today'; date: string; done: boolean; count: number }
  | { kind: 'rest'; date: string }
  | { kind: 'gift' | 'locked'; date: string; streakDay: number };

// The quest path, top to bottom: the last few past days (done or missed), today, then the next
// due days. Future days show what the streak would reach there: a 🎁 at a milestone, 🔒
// otherwise. Days a habit isn't due (or N-times-a-week days left unused) aren't shown.
export function buildPath(
  habit: PublicHabit,
  days: HabitDay[],
  today: string,
  { past = 3, ahead = 2 } = {},
): PathNode[] {
  const nodes: PathNode[] = [];
  const earlier: { kind: 'done' | 'missed'; date: string }[] = [];
  for (const d of days) {
    if (d.date < today && (d.state === 'done' || d.state === 'missed')) {
      earlier.push({ kind: d.state, date: d.date });
    }
  }
  nodes.push(...earlier.slice(-past));

  const todayDay = days.find((d) => d.date === today);
  const doneToday = todayDay?.state === 'done';
  if (habit.dueToday || doneToday) {
    nodes.push({ kind: 'today', date: today, done: doneToday, count: todayDay?.count ?? 0 });
  } else {
    nodes.push({ kind: 'rest', date: today });
  }

  // What the streak would be on each next due day, if every one is done: after today it's the
  // current streak (+1 if today is due and not done yet), then one more per due day. (A streak counted
  // in weeks, for N-times-a-week habits, has no daily milestones.)
  let projected = habit.streak.current + (habit.dueToday && !doneToday ? 1 : 0);
  const daily = habit.streak.unit === 'days';
  let added = 0;
  for (
    let day = addDays(today, 1);
    added < ahead && day <= addDays(today, 60);
    day = addDays(day, 1)
  ) {
    if (!isDue(habit.schedule, day)) continue;
    projected += 1;
    added += 1;
    nodes.push({
      kind: daily && isMilestone(projected, habit.goalDays) ? 'gift' : 'locked',
      date: day,
      streakDay: projected,
    });
  }
  return nodes;
}
