import { Injectable } from '@nestjs/common';
import {
  type CategoryColor,
  type CreateCategoryInput,
  MAX_CATEGORIES_PER_USER,
  type PublicCategory,
  type UpdateCategoryInput,
} from '@life-os/shared';
import { withoutUndefined } from '../../common/utils/without-undefined.js';
import type { Category } from '../../generated/prisma/client.js';
import { isUniqueViolation } from '../../prisma/prisma-errors.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CategoryLimitError,
  CategoryNameTakenError,
  CategoryNotFoundError,
} from './category.errors.js';

export function toPublicCategory(category: Category): PublicCategory {
  return {
    id: category.id,
    name: category.name,
    // Only palette names are ever written (createCategorySchema), so this narrows safely.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    color: category.color as CategoryColor,
    icon: category.icon,
    sortOrder: category.sortOrder,
  };
}

// Every query is scoped by userId from the token (NFR-SEC-003): another user's category is
// simply not found.
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<PublicCategory[]> {
    const categories = await this.prisma.category.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return categories.map(toPublicCategory);
  }

  async create(userId: string, input: CreateCategoryInput): Promise<PublicCategory> {
    const existing = await this.prisma.category.count({ where: { userId } });
    if (existing >= MAX_CATEGORIES_PER_USER) throw new CategoryLimitError();
    await this.assertNameFree(userId, input.name);
    try {
      const category = await this.prisma.category.create({
        data: {
          userId,
          name: input.name,
          color: input.color,
          icon: input.icon ?? null,
          sortOrder: existing, // new categories go to the end of the user's list
        },
      });
      return toPublicCategory(category);
    } catch (err) {
      if (isUniqueViolation(err, 'Category', 'name')) throw new CategoryNameTakenError(err);
      throw err;
    }
  }

  async update(userId: string, id: string, input: UpdateCategoryInput): Promise<PublicCategory> {
    await this.findOwned(userId, id);
    if (input.name !== undefined) await this.assertNameFree(userId, input.name, id);
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: withoutUndefined(input),
      });
      return toPublicCategory(category);
    } catch (err) {
      if (isUniqueViolation(err, 'Category', 'name')) throw new CategoryNameTakenError(err);
      throw err;
    }
  }

  // Its tasks stay, without a category (the foreign key is ON DELETE SET NULL).
  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.category.deleteMany({ where: { id, userId } });
    if (count === 0) throw new CategoryNotFoundError();
  }

  // For the task service: a task may only point at the user's own category.
  async findOwned(userId: string, id: string): Promise<Category> {
    const category = await this.prisma.category.findFirst({ where: { id, userId } });
    if (!category) throw new CategoryNotFoundError();
    return category;
  }

  // "Work" and "work" are the same category (FR-TASK-004). The unique index only catches exact
  // duplicates, so the case-insensitive check is here.
  private async assertNameFree(userId: string, name: string, exceptId?: string): Promise<void> {
    const clash = await this.prisma.category.findFirst({
      where: {
        userId,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (clash) throw new CategoryNameTakenError();
  }
}
