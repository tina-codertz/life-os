import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import {
  type CreateCategoryInput,
  createCategorySchema,
  type PublicCategory,
  type UpdateCategoryInput,
  updateCategorySchema,
} from '@life-os/shared';
import { ApiTags } from '@nestjs/swagger';
import { IdParam } from '../../common/validation/zod-param.decorator.js';
import { ZodBody } from '../../common/validation/zod-body.decorator.js';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CategoriesService } from './categories.service.js';

const categoryId = () => IdParam('CATEGORY_NOT_FOUND', 'Category not found.');

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<PublicCategory[]> {
    return this.categories.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @ZodBody(createCategorySchema) body: CreateCategoryInput,
  ): Promise<PublicCategory> {
    return this.categories.create(user.id, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @categoryId() id: string,
    @ZodBody(updateCategorySchema) body: UpdateCategoryInput,
  ): Promise<PublicCategory> {
    return this.categories.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @categoryId() id: string): Promise<void> {
    return this.categories.remove(user.id, id);
  }
}
