// Points and the overall streak (gamification brought forward for the quest path; the rest of
// it, levels, achievements and challenges, stays v1.2). Amounts from the design.
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
}
