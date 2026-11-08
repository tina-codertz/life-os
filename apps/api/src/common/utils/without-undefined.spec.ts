import { withoutUndefined } from './without-undefined.js';

describe('withoutUndefined', () => {
  it('drops undefined keys and keeps null, false and 0', () => {
    const result = withoutUndefined({ a: undefined, b: null, c: false, d: 0, e: 'x' });
    expect(result).toEqual({ b: null, c: false, d: 0, e: 'x' });
    expect('a' in result).toBe(false);
  });
});
