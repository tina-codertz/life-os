import { z } from 'zod';
import { DISPLAY_NAME_MAX_LENGTH, newPasswordSchema, PASSWORD_MAX_LENGTH } from './auth.ts';

export const THEMES = ['SYSTEM', 'DARK', 'LIGHT'] as const;
export type Theme = (typeof THEMES)[number];

// An IANA zone name ("Africa/Dar_es_Salaam"), stored in its canonical spelling. Checked with
// the platform's own Intl data, so the API and the app agree on what exists. Fixed offsets
// ("+03:00") are refused: they aren't a place and don't follow daylight-saving changes.
export const timezoneSchema = z
  .string()
  .trim()
  .max(64)
  .transform((value, ctx) => {
    try {
      const zone = new Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions().timeZone;
      if (/^[A-Za-z]/.test(zone)) return zone;
    } catch {
      // RangeError: unknown zone; reported below.
    }
    ctx.addIssue({ code: 'custom', message: 'Choose a time zone from the list.' });
    return z.NEVER;
  });

// PATCH bodies are strict: an unknown key is an error, not silently dropped. A typo like
// `dispayName` would otherwise "save" nothing while the app shows success, and fields the
// client must never set (userId, email, role) are refused outright.
export const updateProfileSchema = z.strictObject({
  displayName: z
    .string()
    .trim()
    .min(1, { error: 'Enter your name.' })
    .max(DISPLAY_NAME_MAX_LENGTH, { error: `Use at most ${DISPLAY_NAME_MAX_LENGTH} characters.` })
    .optional(),
  // The server sets the time; a client can say "done", not when.
  onboardingCompleted: z.literal(true).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateSettingsSchema = z.strictObject({
  timezone: timezoneSchema.optional(),
  followDeviceTimezone: z.boolean().optional(),
  weekStartsOn: z.number().int().min(0).max(6).optional(), // 0 = Sunday … 6 = Saturday
  theme: z.enum(THEMES).optional(),
  habitRemindersOn: z.boolean().optional(),
  // Minutes before an event; null = no reminder. Up to a week.
  eventReminderDefault: z
    .number()
    .int()
    .min(0)
    .max(7 * 24 * 60)
    .nullable()
    .optional(),
  crashReportsOn: z.boolean().optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const changePasswordSchema = z
  .strictObject({
    currentPassword: z
      .string()
      .min(1, { error: 'Enter your current password.' })
      .max(PASSWORD_MAX_LENGTH),
    newPassword: newPasswordSchema,
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    error: 'Choose a password different from your current one.',
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Settings as the API returns them (FR-SET-002/003/004/007). Currency (v1.1) and AI (v2)
// stay hidden until those features exist.
export interface PublicSettings {
  timezone: string;
  followDeviceTimezone: boolean;
  weekStartsOn: number;
  theme: Theme;
  habitRemindersOn: boolean;
  eventReminderDefault: number | null;
  crashReportsOn: boolean;
}

export const USER_ERROR_CODES = ['WRONG_PASSWORD'] as const;
