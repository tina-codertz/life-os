import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createUser } from './factories.js';
import { createTestApp } from './utils/create-test-app.js';
import { resetDatabase } from './utils/test-db.js';

describe('Test database harness (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs against the test database', async () => {
    const [db] = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
    expect(db?.name).toMatch(/_test$/);
  });

  it('creates users with unique defaults', async () => {
    const a = await createUser(prisma);
    const b = await createUser(prisma, { displayName: 'Tina' });
    expect(a.email).not.toBe(b.email);
    expect(b.displayName).toBe('Tina');
    await prisma.userSettings.create({ data: { userId: a.id } });
  });

  // Runs after the test above: proves the reset emptied both tables (and the
  // foreign key between them didn't block it).
  it('starts every test with empty tables', async () => {
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.userSettings.count()).toBe(0);
  });
});
