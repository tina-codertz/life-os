import { Prisma } from '../generated/prisma/client.js';

// True when `err` is a unique-constraint violation (P2002) on `model.field`.
// The error's shape depends on how Prisma talks to the database: the classic engine sets
// `meta.target: ['email']`, the pg driver adapter (what we use) only names the index,
// `User_email_key`, Prisma's default name for `@unique` on User.email. Check both.
export function isUniqueViolation(err: unknown, model: string, field: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') {
    return false;
  }
  const meta = err.meta ?? {};
  if (Array.isArray(meta['target']) && meta['target'].includes(field)) return true;

  const adapterError = meta['driverAdapterError'];
  const cause = isRecord(adapterError) ? adapterError['cause'] : undefined;
  const constraint = isRecord(cause) ? cause['constraint'] : undefined;
  if (isRecord(constraint)) {
    if (Array.isArray(constraint['fields'])) return constraint['fields'].includes(field);
    if ('index' in constraint) return constraint['index'] === `${model}_${field}_key`;
  }
  return false;
}

// `meta` is untyped JSON, so each level is checked before it's read instead of cast.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
