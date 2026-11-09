// Points, levels and the overall streak (gamification brought forward for the quest path and
// the Lio page; achievements and challenges stay v1.2). Amounts from the design.
export const XP = {
  TASK: 15, // "Create task · +15 XP"
  HABIT: 5, // a habit day done ("+5 XP")
  CHEST: 40, // the chest reward ("+40 XP")
} as const;

export type XpSource = keyof typeof XP;

// GET /progress
export interface Progress {
  xp: number;
  // Days in a row with at least one habit done or task completed (the 🔥 chip).
  streak: { current: number; best: number };
  // Lio's level (FR-GAME-003), worked out on the server from the XP total.
  level: ProgressLevel;
  // The Lio page's daily chest: ready once a task is completed today, +40 XP once a day.
  dailyChest: 'locked' | 'ready' | 'collected';
}

// POST /progress/daily-chest and POST /habits/:id/chest: what was added, and the progress after.
export interface ChestReward {
  amount: number;
  progress: Progress;
}

export interface ProgressLevel {
  level: number;
  // XP where this level starts and where the next one does.
  start: number;
  next: number;
  // XP still to earn for the next level.
  toNext: number;
}

// Level L starts at 50·L·(L−1) XP: 0, 100, 300, 600, 1000, 1500… so each level takes 100 XP
// more than the one before. With the design's 1,240 XP: level 5, 260 XP to level 6.
export const xpForLevel = (level: number): number => 50 * level * (level - 1);

export function levelOf(xp: number): ProgressLevel {
  const total = Math.max(0, xp);
  let level = 1;
  while (xpForLevel(level + 1) <= total) level += 1;
  const next = xpForLevel(level + 1);
  return { level, start: xpForLevel(level), next, toNext: next - total };
}

// A chest that isn't ready: no task completed today, or not a milestone day (422).
export const PROGRESS_ERROR_CODES = ['CHEST_NOT_READY'] as const;
