import {
  emailChangeConfirmEmail,
  emailChangeNotice,
  linkTo,
  maskEmail,
  passwordResetEmail,
  verificationEmail,
} from './emails.js';

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
    ['email change', emailChangeConfirmEmail, '1 hour'],
  ])('%s email: addressed, contains the link and its expiry', (_name, build, expiry) => {
    const email = build('tina@example.com', 'Tina', 'lifeos://x?token=T0K3N');
    expect(email.to).toBe('tina@example.com');
    expect(email.subject).toMatch(/Life OS/);
    expect(email.text).toContain('Hi Tina,');
    expect(email.text).toContain('lifeos://x?token=T0K3N');
    expect(email.text).toContain(expiry);
  });
});

describe('email change notices', () => {
  it('mask the new address and contain no link', () => {
    for (const stage of ['requested', 'completed'] as const) {
      const email = emailChangeNotice('old@example.com', 'Tina', 'tina.new@example.org', stage);
      expect(email.to).toBe('old@example.com');
      expect(email.text).toContain('t***@example.org');
      expect(email.text).not.toContain('tina.new');
      expect(email.text).not.toMatch(/token=|lifeos:\/\//);
    }
  });

  it.each([
    ['tina@example.com', 't***@example.com'],
    ['a@b.co', 'a***@b.co'],
    ['broken', '***'],
  ])('maskEmail(%j) = %j', (input, output) => {
    expect(maskEmail(input)).toBe(output);
  });
});
