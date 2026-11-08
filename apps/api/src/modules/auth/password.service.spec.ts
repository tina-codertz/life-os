import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const passwords = new PasswordService();

  it('produces an argon2id hash with the OWASP settings', async () => {
    const result = await passwords.hash('correct horse battery');
    expect(result).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(result).not.toContain('correct horse battery');
  });

  it('salts every hash, so equal passwords give different hashes', async () => {
    const [a, b] = await Promise.all([
      passwords.hash('same password'),
      passwords.hash('same password'),
    ]);
    expect(a).not.toBe(b);
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const stored = await passwords.hash('correct horse battery');
    expect(await passwords.verify(stored, 'correct horse battery')).toBe(true);
    expect(await passwords.verify(stored, 'Correct horse battery')).toBe(false);
  });
});
