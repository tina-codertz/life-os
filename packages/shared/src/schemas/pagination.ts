import { z } from 'zod';

export const PAGE_LIMIT_DEFAULT = 30;
export const PAGE_LIMIT_MAX = 100;

// Query string of every list endpoint (docs/06 §1): `?limit=30&cursor=<opaque>`.
// Query values always arrive as strings, so `limit` is coerced to a number first.
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(PAGE_LIMIT_MAX).default(PAGE_LIMIT_DEFAULT),
  cursor: z.string().min(1).max(200).optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
