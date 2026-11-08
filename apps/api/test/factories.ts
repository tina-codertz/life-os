import type { PrismaService } from '../src/prisma/prisma.service.js';
import type { Prisma, User } from '../src/generated/prisma/client.js';

let sequence = 0;

// Creates a user with valid, unique defaults; pass only the fields a test cares about.
// Each test builds its own data: no shared fixtures that one test could break for another.
export function createUser(
  prisma: PrismaService,
  overrides: Partial<Prisma.UserCreateInput> = {},
): Promise<User> {
  sequence += 1;
  return prisma.user.create({
    data: {
      email: `user${sequence}@example.test`,
      displayName: `Test User ${sequence}`,
      // Placeholder until 4.4 adds argon2; nothing can log in with it.
      passwordHash: 'not-a-real-hash',
      settings: { create: {} }, // like register: every user has settings
      ...overrides,
    },
  });
}
