import { addDays, localToday, type PublicHabit, zonedInstant } from '@life-os/shared';
import { isDue } from '@/features/habits/quest';
import { sorted } from '@/lib/arrays';

// How far ahead reminders are scheduled, and how many at most: iOS keeps only 64 pending
// local notifications per app, so a few stay free. The app tops them up each time it opens.
export const REMINDER_DAYS = 14;
export const MAX_PENDING_REMINDERS = 60;
export const REMINDER_PREFIX = 'habit-reminder:';

export interface PlannedReminder {
  // habit-reminder:<habitId>:<day>:<minutes>, so the sync can tell ours apart.
  id: string;
  habitId: string;
  at: Date;
  title: string;
  body: string;
}

// FR-HAB-006 / ADR-014: the reminders to have scheduled right now. One-off notifications for
// each due day ahead (not repeating ones), so a reminder can skip days the habit isn't due and
// today once it's done. Nearest first, at most MAX_PENDING_REMINDERS.
export function planReminders(
  habits: PublicHabit[],
  { now, timeZone, enabled }: { now: Date; timeZone: string; enabled: boolean },
): PlannedReminder[] {
  if (!enabled) return [];
  const today = localToday(timeZone, now);
  const out: PlannedReminder[] = [];
  for (const habit of habits) {
    if (habit.archivedAt || habit.reminderTimes.length === 0) continue;
    const doneToday = (habit.today?.count ?? 0) >= habit.targetCount;
    for (let i = 0; i < REMINDER_DAYS; i += 1) {
      const day = addDays(today, i);
      if (day < habit.startDate || !isDue(habit.schedule, day)) continue;
      if (i === 0 && doneToday) continue;
      for (const minutes of habit.reminderTimes) {
        const at = zonedInstant(day, minutes, timeZone);
        if (at.getTime() <= now.getTime()) continue;
        out.push({
          id: `${REMINDER_PREFIX}${habit.id}:${day}:${minutes}`,
          habitId: habit.id,
          at,
          title: habit.name,
          body: reminderBody(habit),
        });
      }
    }
  }
  return sorted(out, (a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_PENDING_REMINDERS);
}

function reminderBody(habit: PublicHabit): string {
  const { current, unit } = habit.streak;
  if (current > 0) return `Keep your ${current}-${unit === 'days' ? 'day' : 'week'} streak going.`;
  return 'A small step today counts.';
}
