import { z } from 'zod';
import { COMMON_PASSWORDS } from './common-passwords.ts';

export const PASSWORD_MIN_LENGTH = 10;
// Long enough for any passphrase; the cap stops someone making the server hash megabytes.
export const PASSWORD_MAX_LENGTH = 128;
export const DISPLAY_NAME_MAX_LENGTH = 80;

// Emails are stored lowercased and trimmed, so "Tina@Example.com " and "tina@example.com"
// are the same account (FR-AUTH-001: unique, case-insensitive).
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Enter a valid email address.' }).max(254));

// Rules for choosing a new password (register, reset, change). Never trimmed: spaces count.
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: `Use at least ${PASSWORD_MIN_LENGTH} characters.` })
  .max(PASSWORD_MAX_LENGTH, { error: `Use at most ${PASSWORD_MAX_LENGTH} characters.` })
  .refine((password) => !COMMON_PASSWORDS.has(password.toLowerCase()), {
    error: 'This password is too common. Choose something less predictable.',
  });

export const registerSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  displayName: z
    .string()
    .trim()
    .min(1, { error: 'Enter your name.' })
    .max(DISPLAY_NAME_MAX_LENGTH, { error: `Use at most ${DISPLAY_NAME_MAX_LENGTH} characters.` }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// Login only checks that a password was sent: an account created before a rule changed
// must still be able to log in.
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Enter your password.' }).max(PASSWORD_MAX_LENGTH),
  deviceName: z.string().trim().max(100).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

// A user as the API returns it. Never includes the password hash. Dates are ISO strings,
// because that's what JSON carries.
export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  emailVerifiedAt: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
}

// What register and login return. `refreshToken` joins in 4.5.
export interface AuthResult {
  user: PublicUser;
  accessToken: string;
}

export const AUTH_ERROR_CODES = ['EMAIL_TAKEN', 'INVALID_CREDENTIALS'] as const;
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];
