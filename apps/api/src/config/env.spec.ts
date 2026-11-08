import { parseEnv } from './env.js';

const VALID_URL = 'postgresql://lifeos:s3cret-password@localhost:5433/lifeos_dev';
const SECRET = 'a-test-secret-that-is-at-least-32-chars';
const REQUIRED = { DATABASE_URL: VALID_URL, JWT_ACCESS_SECRET: SECRET };

describe('parseEnv', () => {
  it('returns typed values and applies defaults', () => {
    expect(parseEnv(REQUIRED)).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: VALID_URL,
      LOG_LEVEL: 'info',
      JWT_ACCESS_SECRET: SECRET,
    });
  });

  it('converts PORT from a string to a number', () => {
    expect(parseEnv({ ...REQUIRED, PORT: '4000' }).PORT).toBe(4000);
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it.each([
    ['not a URL', 'localhost:5433/lifeos_dev'],
    ['not Postgres', 'mysql://lifeos:pw@localhost:3306/lifeos_dev'],
    ['empty', ''],
  ])('throws when DATABASE_URL is %s', (_case, value) => {
    expect(() => parseEnv({ ...REQUIRED, DATABASE_URL: value })).toThrow(/DATABASE_URL/);
  });

  it.each(['0', '70000', 'abc', '3000.5'])('throws when PORT is %s', (port) => {
    expect(() => parseEnv({ ...REQUIRED, PORT: port })).toThrow(/PORT/);
  });

  it('throws when NODE_ENV is not a known environment', () => {
    expect(() => parseEnv({ ...REQUIRED, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('throws when LOG_LEVEL is not a pino level', () => {
    expect(() => parseEnv({ ...REQUIRED, LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/);
  });

  it('throws when JWT_ACCESS_SECRET is missing or too short, without printing it', () => {
    expect(() => parseEnv({ DATABASE_URL: VALID_URL })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => parseEnv({ ...REQUIRED, JWT_ACCESS_SECRET: 'short-secret-value' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('short-secret-value') }),
    );
  });

  it('lists every problem at once', () => {
    expect(() => parseEnv({ PORT: 'abc' })).toThrow(
      /PORT[\s\S]*DATABASE_URL|DATABASE_URL[\s\S]*PORT/,
    );
  });

  it('never includes variable values in the error', () => {
    const secretUrl = 'mysql://lifeos:s3cret-password@localhost/x';
    expect(() => parseEnv({ ...REQUIRED, DATABASE_URL: secretUrl })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('s3cret-password') }),
    );
  });
});
