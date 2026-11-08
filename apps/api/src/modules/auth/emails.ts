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

export function emailChangeConfirmEmail(to: string, name: string, link: string): Email {
  return {
    to,
    subject: 'Confirm your new email for Life OS',
    text: [
      `Hi ${name},`,
      '',
      'You asked to use this address for your Life OS account. Open this link on your phone to confirm it:',
      link,
      '',
      'The link works once and expires in 1 hour. Until then, your account keeps its current email.',
      "If you didn't ask for this, ignore this email.",
    ].join('\n'),
  };
}

// To the *old* address, when a change starts and when it completes. No link: if it wasn't
// them, the useful action is in the app (change password), not in this email.
export function emailChangeNotice(
  to: string,
  name: string,
  newEmail: string,
  stage: 'requested' | 'completed',
): Email {
  const what =
    stage === 'requested'
      ? `Someone asked to change the email of your Life OS account to ${maskEmail(newEmail)}. It changes only once that address confirms.`
      : `The email of your Life OS account was changed to ${maskEmail(newEmail)}. This address no longer signs in.`;
  return {
    to,
    subject:
      stage === 'requested'
        ? 'Your Life OS email is being changed'
        : 'Your Life OS email was changed',
    text: [
      `Hi ${name},`,
      '',
      what,
      '',
      "If this was you, there's nothing to do. If it wasn't, someone knows your password: change it in the app now, and reply to this email.",
    ].join('\n'),
  };
}

// t***@example.com: enough for the owner to recognise, not a full address handed out.
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '***';
  return `${email[0]}***${email.slice(at)}`;
}
