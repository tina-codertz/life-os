import { hashOpaqueToken, newOpaqueToken } from './opaque-token.js';

describe('opaque tokens', () => {
  it('are 43 URL-safe characters and never repeat', () => {
    const tokens = Array.from({ length: 100 }, newOpaqueToken);
    expect(tokens.every((t) => /^[\w-]{43}$/.test(t))).toBe(true);
    expect(new Set(tokens).size).toBe(100);
  });

  it('hash to a stable 64-character hex string that differs from the token', () => {
    const token = newOpaqueToken();
    expect(hashOpaqueToken(token)).toBe(hashOpaqueToken(token));
    expect(hashOpaqueToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOpaqueToken(token)).not.toContain(token);
  });
});
