import { describe, expect, it } from 'vitest';
import {
  changeEmailSchema,
  changePasswordSchema,
  timezoneSchema,
  updateProfileSchema,
  updateSettingsSchema,
} from './users.ts';

describe('timezoneSchema', () => {
  it.each([
    ['Africa/Dar_es_Salaam', 'Africa/Dar_es_Salaam'],
    ['africa/dar_es_salaam', 'Africa/Dar_es_Salaam'],
    [' Europe/London ', 'Europe/London'],
    ['UTC', 'UTC'],
  ])('accepts %j as %j', (input, output) => {
    expect(timezoneSchema.parse(input)).toBe(output);
  });

  it.each(['Mars/Base', '+03:00', '', 'Not a zone'])('rejects %j', (input) => {
    expect(timezoneSchema.safeParse(input).error?.issues[0]?.message).toBe(
      'Choose a time zone from the list.',
    );
  });
});

describe('updateProfileSchema', () => {
  it('trims the name and allows marking onboarding done', () => {
    expect(updateProfileSchema.parse({ displayName: ' Tina ', onboardingCompleted: true })).toEqual(
      {
        displayName: 'Tina',
        onboardingCompleted: true,
      },
    );
  });

  it.each([{ dispayName: 'Tina' }, { userId: 'someone' }, { email: 'x@y.com' }])(
    'rejects the unknown key in %j',
    (body) => {
      expect(updateProfileSchema.safeParse(body).error?.issues[0]?.code).toBe('unrecognized_keys');
    },
  );

  it('does not let the client choose when onboarding finished', () => {
    expect(updateProfileSchema.safeParse({ onboardingCompleted: false }).success).toBe(false);
  });
});

describe('updateSettingsSchema', () => {
  it('accepts a partial update', () => {
    expect(updateSettingsSchema.parse({ theme: 'DARK', weekStartsOn: 0 })).toEqual({
      theme: 'DARK',
      weekStartsOn: 0,
    });
  });

  it.each([
    { weekStartsOn: 7 },
    { theme: 'BLUE' },
    { eventReminderDefault: -5 },
    { currency: 'USD' }, // v1.1, not settable yet
  ])('rejects %j', (body) => {
    expect(updateSettingsSchema.safeParse(body).success).toBe(false);
  });

  it('allows turning the event reminder off with null', () => {
    expect(updateSettingsSchema.parse({ eventReminderDefault: null })).toEqual({
      eventReminderDefault: null,
    });
  });
});

describe('changePasswordSchema', () => {
  it('requires the new password to differ and follow the rules', () => {
    const same = changePasswordSchema.safeParse({
      currentPassword: 'correct horse battery',
      newPassword: 'correct horse battery',
    });
    expect(same.error?.issues[0]?.path).toEqual(['newPassword']);
    expect(
      changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: '1234567890' }).success,
    ).toBe(false);
  });
});

describe('changeEmailSchema', () => {
  it('normalises the new email like register does', () => {
    expect(changeEmailSchema.parse({ newEmail: ' New@Example.COM ', password: 'x' })).toEqual({
      newEmail: 'new@example.com',
      password: 'x',
    });
  });

  it('requires a password and rejects unknown keys', () => {
    expect(changeEmailSchema.safeParse({ newEmail: 'a@b.co' }).success).toBe(false);
    expect(
      changeEmailSchema.safeParse({ newEmail: 'a@b.co', password: 'x', userId: 'u' }).success,
    ).toBe(false);
  });
});
