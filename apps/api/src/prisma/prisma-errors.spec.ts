import { Prisma } from '../generated/prisma/client.js';
import { isUniqueViolation } from './prisma-errors.js';

function prismaError(code: string, meta: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('failed', { code, clientVersion: 'test', meta });
}

// Shape captured from a real duplicate insert through @prisma/adapter-pg (Prisma 7.10).
const adapterMeta = (index: string) => ({
  modelName: 'User',
  driverAdapterError: {
    name: 'DriverAdapterError',
    cause: { originalCode: '23505', kind: 'UniqueConstraintViolation', constraint: { index } },
  },
});

describe('isUniqueViolation', () => {
  it('recognises the pg adapter shape by index name', () => {
    expect(
      isUniqueViolation(prismaError('P2002', adapterMeta('User_email_key')), 'User', 'email'),
    ).toBe(true);
  });

  it('is false for a different unique index', () => {
    expect(
      isUniqueViolation(prismaError('P2002', adapterMeta('User_phone_key')), 'User', 'email'),
    ).toBe(false);
  });

  it('recognises the classic meta.target shape', () => {
    expect(isUniqueViolation(prismaError('P2002', { target: ['email'] }), 'User', 'email')).toBe(
      true,
    );
  });

  it('recognises constraint.fields', () => {
    const meta = { driverAdapterError: { cause: { constraint: { fields: ['email'] } } } };
    expect(isUniqueViolation(prismaError('P2002', meta), 'User', 'email')).toBe(true);
  });

  it('is false for other errors', () => {
    expect(isUniqueViolation(prismaError('P2025', {}), 'User', 'email')).toBe(false);
    expect(isUniqueViolation(new Error('P2002'), 'User', 'email')).toBe(false);
  });
});
