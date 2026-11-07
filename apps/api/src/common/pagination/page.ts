import type { PageMeta } from '@life-os/shared';

// Return `new Page(items, meta)` from a list endpoint; the response interceptor turns it
// into `{ data: items, meta }`. A class (not a plain object) so the interceptor can tell it
// apart from a resource that happens to have `items` and `meta` fields.
export class Page<T> {
  constructor(
    readonly items: T[],
    readonly meta: PageMeta,
  ) {}
}
