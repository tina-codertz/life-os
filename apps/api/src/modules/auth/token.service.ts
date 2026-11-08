import { Inject, Injectable } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import { type Env, ENV } from '../../config/env.js';

// ADR-004: short-lived access token, held only in the app's memory. 15 minutes limits the
// damage if one leaks; the refresh token (4.5) gets a new one without logging in again.
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const ALGORITHM = 'HS256';
const ISSUER = 'life-os-api';
const AUDIENCE = 'life-os-app';

export interface AccessTokenClaims {
  userId: string;
}

@Injectable()
export class TokenService {
  private readonly key: Uint8Array;

  constructor(@Inject(ENV) env: Env) {
    this.key = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
  }

  // Header and payload are only base64-encoded, not encrypted: anyone holding the token can
  // read them. So the payload carries an ID, never personal data.
  signAccessToken({ userId }: AccessTokenClaims): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(this.key);
  }

  // Rejects a bad signature, an expired token, the wrong issuer/audience and any algorithm
  // other than HS256 (including "none"). Throws on failure; the guard (Part 3) turns that into 401.
  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    const { payload } = await jwtVerify(token, this.key, {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
      requiredClaims: ['sub', 'exp'],
    });
    if (typeof payload.sub !== 'string') throw new Error('Access token has no subject');
    return { userId: payload.sub };
  }
}
