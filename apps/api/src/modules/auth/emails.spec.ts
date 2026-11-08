import { linkTo, passwordResetEmail, verificationEmail } from './emails.js';

describe('auth emails', () => {
  it('builds app links with the token as a query parameter', () => {
    expect(linkTo('lifeos://', 'verify-email', 'abc-123_x')).toBe(
      'lifeos://verify-email?token=abc-123_x',
    );
    expect(linkTo('https://lifeos.app/', 'reset-password', 'a b')).toBe(
      'https://lifeos.app/reset-password?token=a%20b',
    );
  });

  it.each([
    ['verification', verificationEmail, '48 hours'],
    ['password reset', passwordResetEmail, '1 hour'],
  ])('%s email: addressed, contains the link and its expiry', (_name, build, expiry) => {
    const email = build('tina@example.com', 'Tina', 'lifeos://x?token=T0K3N');
    expect(email.to).toBe('tina@example.com');
    expect(email.subject).toMatch(/Life OS/);
    expect(email.text).toContain('Hi Tina,');
    expect(email.text).toContain('lifeos://x?token=T0K3N');
    expect(email.text).toContain(expiry);
  });
});
