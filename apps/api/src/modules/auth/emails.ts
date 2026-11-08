import type { Email } from '../../mail/mail.service.js';

// Plain text only for now: nothing to escape, renders everywhere, hard to make look phishy.
// The link carries the token; the email never contains anything else secret.

export function verificationEmail(to: string, name: string, link: string): Email {
  return {
    to,
    subject: 'Confirm your email for Life OS',
    text: [
      `Hi ${name},`,
      '',
      'Confirm that this is your email address by opening this link on your phone:',
      link,
      '',
      'The link works once and expires in 48 hours.',
      "If you didn't create a Life OS account, you can ignore this email.",
    ].join('\n'),
  };
}

export function passwordResetEmail(to: string, name: string, link: string): Email {
  return {
    to,
    subject: 'Reset your Life OS password',
    text: [
      `Hi ${name},`,
      '',
      'Someone (hopefully you) asked to reset your Life OS password. Open this link on your phone to choose a new one:',
      link,
      '',
      'The link works once and expires in 1 hour. Resetting logs you out on every device.',
      "If you didn't ask for this, ignore this email: your password stays the same.",
    ].join('\n'),
  };
}

// lifeos://verify-email?token=…; the token is URL-safe already, but encode anyway.
export function linkTo(baseUrl: string, path: string, token: string): string {
  return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
}
