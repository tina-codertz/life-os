import { AppException } from '../errors/app.exception.js';
import { decodeCursor, encodeCursor, pageOf } from './cursor.js';

const ID = '0198b7a2-5a6b-7c3d-8e9f-0a1b2c3d4e5f';

describe('cursors', () => {
  it('round-trip an ID and look opaque', () => {
    const cursor = encodeCursor(ID);
    expect(cursor).not.toContain(ID);
    expect(decodeCursor(cursor)).toBe(ID);
  });

  it.each(['', 'garbage', Buffer.from('{"id":"nope"}').toString('base64url')])(
    'rejects %j with a field error',
    (cursor) => {
      expect(() => decodeCursor(cursor)).toThrow(AppException);
    },
  );

  it('pageOf: one extra row means there is a next page', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(pageOf(rows, 2)).toEqual({
      items: [{ id: 'a' }, { id: 'b' }],
      meta: { hasMore: true, nextCursor: encodeCursor('b') },
    });
    expect(pageOf(rows, 3).meta).toEqual({ hasMore: false, nextCursor: null });
  });
});
