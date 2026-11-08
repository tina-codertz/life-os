import { AttemptLimiter } from './attempt-limiter.js';

const HOUR = 60 * 60 * 1000;

describe('AttemptLimiter', () => {
  it('blocks after the limit, until the window ends', () => {
    const limiter = new AttemptLimiter(3, HOUR);
    const t0 = 1_000_000;
    expect([1, 2, 3].map(() => limiter.hit('a', t0))).toEqual([true, true, true]);
    expect(limiter.blockedForSeconds('a', t0)).toBe(3600);
    expect(limiter.hit('a', t0 + 1000)).toBe(false);
    expect(limiter.blockedForSeconds('a', t0 + HOUR - 1000)).toBe(1);
    expect(limiter.blockedForSeconds('a', t0 + HOUR)).toBe(0);
    expect(limiter.hit('a', t0 + HOUR)).toBe(true); // fresh window
  });

  it('keeps keys separate and can reset one', () => {
    const limiter = new AttemptLimiter(1, HOUR);
    limiter.hit('a', 0);
    limiter.hit('b', 0);
    limiter.reset('a');
    expect(limiter.blockedForSeconds('a', 0)).toBe(0);
    expect(limiter.blockedForSeconds('b', 0)).toBeGreaterThan(0);
  });

  it('never holds more than maxKeys entries', () => {
    const limiter = new AttemptLimiter(5, HOUR, 100);
    for (let i = 0; i < 1000; i += 1) limiter.hit(`spray-${i}@example.com`, 0);
    expect(limiter.size).toBeLessThanOrEqual(100);
  });

  it('when full, evicts the oldest entry (the first to expire)', () => {
    // Limit 1, so an entry that still exists shows up as "blocked".
    const limiter = new AttemptLimiter(1, HOUR, 2);
    limiter.hit('old', 0);
    limiter.hit('live', HOUR / 2);
    limiter.hit('new', HOUR + 1); // full: 'old' goes, 'live' survives
    expect(limiter.blockedForSeconds('live', HOUR + 1)).toBeGreaterThan(0);
    expect(limiter.size).toBe(2);
  });
});
