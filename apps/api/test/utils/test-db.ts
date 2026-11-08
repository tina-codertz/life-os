import type { PrismaService } from '../../src/prisma/prisma.service.js';

// Every helper here deletes data, so each one first proves it's pointed at a test database.
// A typo in .env must never be able to wipe lifeos_dev (or production).
export function assertTestDatabaseName(name: string): void {
  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to touch database "${name}": test helpers only run against a database whose name ends in "_test".`,
    );
  }
}

// Database name from a connection URL, without exposing the rest (user, password, host).
export function databaseNameFromUrl(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

// Empties every table (keeping the migration history), so each test starts from nothing.
// TRUNCATE is much faster than DELETE and resets sequences; CASCADE handles foreign keys.
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const [db] = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  assertTestDatabaseName(db?.name ?? '');

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;

  // Table names come from Postgres' own catalog, not from user input, and are quoted,
  // so building this statement as a string is safe.
  const list = tables.map((t) => `"${t.tablename.replaceAll('"', '""')}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
