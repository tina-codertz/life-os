import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import { AppException } from '../errors/app.exception.js';

// Cursors are opaque to clients (docs/06): base64url of a small JSON object. Clients pass back
// `meta.nextCursor` unchanged; the format can change without breaking them.
const cursorSchema = z.object({ id: z.uuid() });

export function encodeCursor(id: string): string {
  return Buffer.from(JSON.stringify({ id })).toString('base64url');
}

export function decodeCursor(cursor: string): string {
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(cursor, 'base64url').toString()));
    if (parsed.success) return parsed.data.id;
  } catch {
    // fall through
  }
  throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', 'Some fields are invalid.', {
    details: [{ field: 'cursor', message: 'This cursor is not valid. Start from the first page.' }],
  });
}

// Fetch one row more than asked: if it exists, there's a next page, and the last row shown
// becomes the cursor.
export function pageOf<T extends { id: string }>(rows: T[], limit: number) {
  const items = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const last = items.at(-1);
  return { items, meta: { hasMore, nextCursor: hasMore && last ? encodeCursor(last.id) : null } };
}
