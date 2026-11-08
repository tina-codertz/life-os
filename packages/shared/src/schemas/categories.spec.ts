import { describe, expect, it } from 'vitest';
import { createCategorySchema, updateCategorySchema } from './categories.ts';

describe('createCategorySchema', () => {
  it('trims the name and accepts a palette colour and an icon', () => {
    expect(
      createCategorySchema.parse({ name: '  Work ', color: 'blue', icon: 'briefcase' }),
    ).toEqual({
      name: 'Work',
      color: 'blue',
      icon: 'briefcase',
    });
  });

  it.each([
    [{ name: '', color: 'blue' }, 'name'],
    [{ name: 'x'.repeat(51), color: 'blue' }, 'name'],
    [{ name: 'Work', color: '#ff0000' }, 'color'],
    [{ name: 'Work', color: 'blue', icon: 'Brief Case!' }, 'icon'],
  ])('rejects %j (field %s)', (input, field) => {
    expect(createCategorySchema.safeParse(input).error?.issues[0]?.path).toEqual([field]);
  });

  it('rejects unknown fields (strict)', () => {
    expect(
      createCategorySchema.safeParse({ name: 'Work', color: 'blue', userId: 'x' }).success,
    ).toBe(false);
  });
});

describe('updateCategorySchema', () => {
  it('accepts a partial update and clearing the icon', () => {
    expect(updateCategorySchema.parse({ sortOrder: 2, icon: null })).toEqual({
      sortOrder: 2,
      icon: null,
    });
  });
});
