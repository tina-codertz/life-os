import { SignJWT, UnsecuredJWT } from 'jose';
import type { Env } from '../../config/env.js';
import { ACCESS_TOKEN_TTL_SECONDS, TokenService } from './token.service.js';

const SECRET = 'unit-test-secret-at-least-32-characters-long';
const tokens = new TokenService({ JWT_ACCESS_SECRET: SECRET } as Env);
const key = new TextEncoder().encode(SECRET);

function decodePayload(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString()) as Record<
    string,
    unknown
  >;
}

describe('TokenService', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('round-trips the user ID', async () => {
    const token = await tokens.signAccessToken({ userId: 'user-1', sessionId: 'session-1' });
    expect(await tokens.verifyAccessToken(token)).toEqual({
      userId: 'user-1',
      sessionId: 'session-1',
    });
  });

  it('expires after 15 minutes and carries no personal data', async () => {
    const payload = decodePayload(
      await tokens.signAccessToken({ userId: 'user-1', sessionId: 'session-1' }),
    );
    expect(Number(payload['exp']) - Number(payload['iat'])).toBe(ACCESS_TOKEN_TTL_SECONDS);
    expect(Object.keys(payload).toSorted()).toEqual(['aud', 'exp', 'iat', 'iss', 'sid', 'sub']);
  });

  it('rejects an expired token', async () => {
    const token = await tokens.signAccessToken({ userId: 'user-1', sessionId: 'session-1' });
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + (ACCESS_TOKEN_TTL_SECONDS + 1) * 1000);
    await expect(tokens.verifyAccessToken(token)).rejects.toThrow();
  });

  it('rejects a token signed with another secret', async () => {
    const other = new TokenService({ JWT_ACCESS_SECRET: 'x'.repeat(40) } as Env);
    const token = await other.signAccessToken({ userId: 'user-1', sessionId: 'session-1' });
    await expect(tokens.verifyAccessToken(token)).rejects.toThrow();
  });

  it('rejects a token whose payload was edited', async () => {
    const token = await tokens.signAccessToken({ userId: 'user-1', sessionId: 'session-1' });
    const [header, , signature] = token.split('.');
    // Same header and signature, but the subject swapped for someone else's ID.
    const forged = Buffer.from(JSON.stringify({ ...decodePayload(token), sub: 'user-2' })).toString(
      'base64url',
    );
    await expect(tokens.verifyAccessToken(`${header}.${forged}.${signature}`)).rejects.toThrow();
  });

  it('rejects an unsigned token (alg "none")', async () => {
    const token = new UnsecuredJWT({ sid: 'session-1' })
      .setSubject('user-1')
      .setIssuer('life-os-api')
      .setAudience('life-os-app')
      .setExpirationTime('5m')
      .encode();
    await expect(tokens.verifyAccessToken(token)).rejects.toThrow();
  });

  it('rejects a token without a session ID', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setIssuer('life-os-api')
      .setAudience('life-os-app')
      .setExpirationTime('5m')
      .sign(key);
    await expect(tokens.verifyAccessToken(token)).rejects.toThrow();
  });

  it('rejects a correctly signed token meant for another audience', async () => {
    const token = await new SignJWT({ sid: 'session-1' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setIssuer('life-os-api')
      .setAudience('something-else')
      .setExpirationTime('5m')
      .sign(key);
    await expect(tokens.verifyAccessToken(token)).rejects.toThrow();
  });
});
