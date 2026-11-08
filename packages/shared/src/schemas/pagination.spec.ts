import { describe, expect, it } from 'vitest';
import { PAGE_LIMIT_DEFAULT, paginationQuerySchema } from './pagination.ts';

describe('paginationQuerySchema', () => {
  it('applies the default limit', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ limit: PAGE_LIMIT_DEFAULT });
  });

  it('converts limit from a query-string value', () => {
    expect(paginationQuerySchema.parse({ limit: '10', cursor: 'abc' })).toEqual({
      limit: 10,
      cursor: 'abc',
    });
  });

  it.each(['0', '101', '2.5', 'abc', ''])('rejects limit=%s', (limit) => {
    expect(paginationQuerySchema.safeParse({ limit }).success).toBe(false);
  });

  it('rejects an empty cursor', () => {
    expect(paginationQuerySchema.safeParse({ cursor: '' }).success).toBe(false);
  });
});
