import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from './auth.ts';

const valid = { email: 'tina@example.com', password: 'correct horse battery', displayName: 'Tina' };

function errorFields(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.error?.issues.map((i) => i.path.join('.')) ?? [];
}

describe('registerSchema', () => {
  it('accepts a valid registration', () => {
    expect(registerSchema.parse(valid)).toEqual(valid);
  });

  it('lowercases and trims the email, trims the name', () => {
    const parsed = registerSchema.parse({
      ...valid,
      email: '  Tina@Example.COM ',
      displayName: ' Tina ',
    });
    expect(parsed.email).toBe('tina@example.com');
    expect(parsed.displayName).toBe('Tina');
  });

  it.each(['not-an-email', '', 'tina@', '@example.com'])('rejects email %j', (email) => {
    expect(errorFields(registerSchema.safeParse({ ...valid, email }))).toEqual(['email']);
  });

  it('rejects a password shorter than 10 characters', () => {
    expect(errorFields(registerSchema.safeParse({ ...valid, password: 'short1234' }))).toEqual([
      'password',
    ]);
  });

  it.each(['1234567890', 'QwertyUiop', 'password123'])('rejects the common password %j', (pw) => {
    const result = registerSchema.safeParse({ ...valid, password: pw });
    expect(result.error?.issues[0]?.message).toMatch(/too common/);
  });

  it('does not trim the password', () => {
    expect(registerSchema.parse({ ...valid, password: ' spaced out pass ' }).password).toBe(
      ' spaced out pass ',
    );
  });

  it('rejects a blank or too-long display name', () => {
    expect(errorFields(registerSchema.safeParse({ ...valid, displayName: '   ' }))).toEqual([
      'displayName',
    ]);
    expect(
      errorFields(registerSchema.safeParse({ ...valid, displayName: 'x'.repeat(81) })),
    ).toEqual(['displayName']);
  });
});

describe('loginSchema', () => {
  it('does not apply the new-password rules', () => {
    expect(loginSchema.safeParse({ email: 'TINA@example.com', password: 'short' }).data).toEqual({
      email: 'tina@example.com',
      password: 'short',
    });
  });

  it('requires a password', () => {
    expect(errorFields(loginSchema.safeParse({ email: 'tina@example.com', password: '' }))).toEqual(
      ['password'],
    );
  });
});
