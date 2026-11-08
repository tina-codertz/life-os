import { fromDbDate, toDbDate } from './dates.js';

describe('calendar dates', () => {
  it.each(['2026-12-01', '2028-02-29', '2026-03-29'])('%s survives the round trip', (day) => {
    expect(fromDbDate(toDbDate(day))).toBe(day);
  });
});
