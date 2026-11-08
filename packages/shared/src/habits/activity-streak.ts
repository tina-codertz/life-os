import { addDays } from '../dates.ts';

// The overall streak: days in a row with something done. Today with nothing yet doesn't break
// it (it runs until yesterday); a gap before yesterday does.
export function activityStreak(
  days: Iterable<string>,
  today: string,
): {
  current: number;
  best: number;
} {
  const set = new Set(days);
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of [...set].sort()) {
    if (day > today) continue;
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  let current = 0;
  let day = set.has(today) ? today : addDays(today, -1);
  while (set.has(day)) {
    current += 1;
    day = addDays(day, -1);
  }
  return { current, best };
}
