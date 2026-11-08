import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { CategoriesService } from './categories.service.js';
import { CategoryNameTakenError } from './category.errors.js';

// The name check runs before the insert, so two requests at the same moment can both pass it.
// Then the database's unique index refuses the second; the service must turn that into the same
// 409 as the check. (An e2e test can't force the timing, so the database error is faked here.)
describe('CategoriesService: the unique index as a backstop', () => {
  const duplicate = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['userId', 'name'] },
  });

  function serviceWhereInsertsClash() {
    const prisma = {
      category: {
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn().mockResolvedValue(null), // the name check sees no clash...
        create: vi.fn().mockRejectedValue(duplicate), // ...but the insert hits one
        update: vi.fn().mockRejectedValue(duplicate),
      },
    };
    return new CategoriesService(prisma as unknown as PrismaService);
  }

  it('create: a duplicate caught by the database is a CATEGORY_NAME_TAKEN', async () => {
    await expect(
      serviceWhereInsertsClash().create('u1', { name: 'Gym', color: 'green' }),
    ).rejects.toBeInstanceOf(CategoryNameTakenError);
  });

  it('other database errors are not disguised as a name clash', async () => {
    const service = serviceWhereInsertsClash();
    const prisma = (
      service as unknown as { prisma: { category: { create: ReturnType<typeof vi.fn> } } }
    ).prisma;
    prisma.category.create.mockRejectedValue(new Error('connection lost'));
    await expect(service.create('u1', { name: 'Gym', color: 'green' })).rejects.toThrow(
      'connection lost',
    );
  });
});
