import { parseEnv } from './env.js';

const VALID_URL = 'postgresql://lifeos:s3cret-password@localhost:5433/lifeos_dev';

describe('parseEnv', () => {
  it('returns typed values and applies defaults', () => {
    expect(parseEnv({ DATABASE_URL: VALID_URL })).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: VALID_URL,
      LOG_LEVEL: 'info',
    });
  });

  it('converts PORT from a string to a number', () => {
    expect(parseEnv({ DATABASE_URL: VALID_URL, PORT: '4000' }).PORT).toBe(4000);
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it.each([
    ['not a URL', 'localhost:5433/lifeos_dev'],
    ['not Postgres', 'mysql://lifeos:pw@localhost:3306/lifeos_dev'],
    ['empty', ''],
  ])('throws when DATABASE_URL is %s', (_case, value) => {
    expect(() => parseEnv({ DATABASE_URL: value })).toThrow(/DATABASE_URL/);
  });

  it.each(['0', '70000', 'abc', '3000.5'])('throws when PORT is %s', (port) => {
    expect(() => parseEnv({ DATABASE_URL: VALID_URL, PORT: port })).toThrow(/PORT/);
  });

  it('throws when NODE_ENV is not a known environment', () => {
    expect(() => parseEnv({ DATABASE_URL: VALID_URL, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('throws when LOG_LEVEL is not a pino level', () => {
    expect(() => parseEnv({ DATABASE_URL: VALID_URL, LOG_LEVEL: 'loud' })).toThrow(/LOG_LEVEL/);
  });

  it('lists every problem at once', () => {
    expect(() => parseEnv({ PORT: 'abc' })).toThrow(
      /PORT[\s\S]*DATABASE_URL|DATABASE_URL[\s\S]*PORT/,
    );
  });

  it('never includes variable values in the error', () => {
    const secretUrl = 'mysql://lifeos:s3cret-password@localhost/x';
    expect(() => parseEnv({ DATABASE_URL: secretUrl })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('s3cret-password') }),
    );
  });
});
