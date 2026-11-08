import { z } from 'zod';

// Named palette colours, not hex: each name gets a dark- and a light-theme value in the app
// that passes the contrast test (docs/07), which a fixed hex couldn't.
export const CATEGORY_COLORS = [
  'violet',
  'blue',
  'teal',
  'green',
  'amber',
  'orange',
  'red',
  'pink',
  'gray',
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const CATEGORY_NAME_MAX_LENGTH = 50;
export const MAX_CATEGORIES_PER_USER = 50;

const categoryName = z
  .string()
  .trim()
  .min(1, { error: 'Enter a name.' })
  .max(CATEGORY_NAME_MAX_LENGTH, { error: `Use at most ${CATEGORY_NAME_MAX_LENGTH} characters.` });

// An icon name from the app's set (lowercase words joined by dashes, e.g. "dumbbell").
const iconName = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: 'Unknown icon.' })
  .max(40);

export const createCategorySchema = z.strictObject({
  name: categoryName,
  color: z.enum(CATEGORY_COLORS, { error: 'Choose a colour from the list.' }),
  icon: iconName.nullable().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.strictObject({
  name: categoryName.optional(),
  color: z.enum(CATEGORY_COLORS, { error: 'Choose a colour from the list.' }).optional(),
  icon: iconName.nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export interface PublicCategory {
  id: string;
  name: string;
  color: CategoryColor;
  icon: string | null;
  sortOrder: number;
}

export const CATEGORY_ERROR_CODES = [
  'CATEGORY_NOT_FOUND',
  'CATEGORY_NAME_TAKEN',
  'CATEGORY_LIMIT_REACHED',
] as const;
