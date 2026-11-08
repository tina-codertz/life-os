import { parseEnv } from './env.js';

const VALID_URL = 'postgresql://lifeos:s3cret-password@localhost:5433/lifeos_dev';
const SECRET = 'a-test-secret-that-is-at-least-32-chars';
const SMTP_URL = 'smtp://localhost:1025';
const REQUIRED = { DATABASE_URL: VALID_URL, JWT_ACCESS_SECRET: SECRET, SMTP_URL };

describe('parseEnv', () => {
  it('returns typed values and applies defaults', () => {
    expect(parseEnv(REQUIRED)).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: VALID_URL,
      LOG_LEVEL: 'info',
      JWT_ACCESS_SECRET: SECRET,
      SMTP_URL,
      MAIL_FROM: 'Life OS <no-reply@lifeos.local>',
      EMAIL_LINK_BASE_URL: 'lifeos://',
      RATE_LIMIT_ENABLED: true,
      CORS_ORIGINS: [],
      TRUST_PROXY_HOPS: 0,
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

  it('requires an smtp:// or smtps:// SMTP_URL', () => {
    expect(() => parseEnv({ ...REQUIRED, SMTP_URL: 'http://localhost:1025' })).toThrow(/SMTP_URL/);
    expect(parseEnv({ ...REQUIRED, SMTP_URL: 'smtps://mail.example.com:465' }).SMTP_URL).toBe(
      'smtps://mail.example.com:465',
    );
  });

  it('parses the security settings', () => {
    const env = parseEnv({
      ...REQUIRED,
      RATE_LIMIT_ENABLED: 'false',
      CORS_ORIGINS: 'https://lifeos.app, http://localhost:8081',
      TRUST_PROXY_HOPS: '1',
    });
    expect(env).toMatchObject({
      RATE_LIMIT_ENABLED: false,
      CORS_ORIGINS: ['https://lifeos.app', 'http://localhost:8081'],
      TRUST_PROXY_HOPS: 1,
    });
    expect(() => parseEnv({ ...REQUIRED, RATE_LIMIT_ENABLED: 'maybe' })).toThrow(
      /RATE_LIMIT_ENABLED/,
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
