import { createHash, randomBytes } from 'node:crypto';

// Random tokens that mean nothing by themselves (refresh tokens, email links): the server
// looks them up. 256 bits → 43 base64url characters, safe in URLs and JSON.
export function newOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

// SHA-256, not argon2: the token is 256 random bits, so there's nothing to guess and a slow
// hash would only slow down every lookup. (Passwords are slow-hashed because people pick
// guessable ones.) The database only ever stores this hash, so a leaked table can't be replayed.
export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
