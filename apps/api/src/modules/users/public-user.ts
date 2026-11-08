import type { PublicUser } from '@life-os/shared';
import type { User } from '../../generated/prisma/client.js';

// The only way a user leaves the API. Fields are listed one by one (no `...user`), so a new
// column such as a secret token can't start appearing in responses by accident.
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
