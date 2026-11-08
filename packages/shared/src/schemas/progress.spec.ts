import { describe, expect, it } from 'vitest';
import { levelOf, xpForLevel } from './progress.ts';

describe('levels (FR-GAME-003)', () => {
  it('each level takes 100 XP more than the one before', () => {
    expect([1, 2, 3, 4, 5, 6].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000, 1500]);
  });

  it('works out the level and what’s left to the next', () => {
    expect(levelOf(0)).toEqual({ level: 1, start: 0, next: 100, toNext: 100 });
    expect(levelOf(99)).toMatchObject({ level: 1, toNext: 1 });
    expect(levelOf(100)).toEqual({ level: 2, start: 100, next: 300, toNext: 200 });
    // The design's numbers: 1,240 XP is 260 short of the next level.
    expect(levelOf(1240)).toEqual({ level: 5, start: 1000, next: 1500, toNext: 260 });
  });

  it('never goes below level 1', () => {
    expect(levelOf(-15)).toMatchObject({ level: 1, toNext: 100 });
  });
});
