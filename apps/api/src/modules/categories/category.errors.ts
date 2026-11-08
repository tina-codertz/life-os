import { HttpStatus } from '@nestjs/common';
import { MAX_CATEGORIES_PER_USER } from '@life-os/shared';
import { AppException } from '../../common/errors/app.exception.js';

// Also for another user's category: it doesn't exist *for you* (docs/06: 404, never 403).
export class CategoryNotFoundError extends AppException {
  constructor() {
    super(HttpStatus.NOT_FOUND, 'CATEGORY_NOT_FOUND', 'Category not found.');
  }
}

export class CategoryNameTakenError extends AppException {
  constructor(cause?: unknown) {
    super(
      HttpStatus.CONFLICT,
      'CATEGORY_NAME_TAKEN',
      'You already have a category with this name.',
      {
        details: [{ field: 'name', message: 'You already have a category with this name.' }],
        cause,
      },
    );
  }
}

export class CategoryLimitError extends AppException {
  constructor() {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'CATEGORY_LIMIT_REACHED',
      `You can have up to ${MAX_CATEGORIES_PER_USER} categories.`,
    );
  }
}
