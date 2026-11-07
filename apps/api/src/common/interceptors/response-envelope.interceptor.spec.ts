import { type CallHandler, type ExecutionContext, StreamableFile } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { Page } from '../pagination/page.js';
import { ResponseEnvelopeInterceptor, toEnvelope } from './response-envelope.interceptor.js';

describe('toEnvelope', () => {
  it('wraps a single resource in { data }', () => {
    expect(toEnvelope({ id: '1', title: 'Read' })).toEqual({ data: { id: '1', title: 'Read' } });
  });

  it('wraps a plain array in { data } with no meta', () => {
    expect(toEnvelope([1, 2])).toEqual({ data: [1, 2] });
  });

  it('turns a Page into { data, meta }', () => {
    const page = new Page([{ id: '1' }], { nextCursor: 'abc', hasMore: true });
    expect(toEnvelope(page)).toEqual({
      data: [{ id: '1' }],
      meta: { nextCursor: 'abc', hasMore: true },
    });
  });

  it('does not treat a plain object with items/meta as a Page', () => {
    const value = { items: [], meta: {} };
    expect(toEnvelope(value)).toEqual({ data: value });
  });

  it('keeps null as data (a resource that is legitimately empty)', () => {
    expect(toEnvelope(null)).toEqual({ data: null });
  });

  it('leaves undefined alone so 204 responses stay empty', () => {
    expect(toEnvelope(undefined)).toBeUndefined();
  });

  it('passes file downloads through untouched', () => {
    const file = new StreamableFile(Buffer.from('x'));
    expect(toEnvelope(file)).toBe(file);
  });
});

describe('ResponseEnvelopeInterceptor', () => {
  it('applies the envelope to the controller result', async () => {
    const next: CallHandler = { handle: () => of({ ok: true }) };
    const result$ = new ResponseEnvelopeInterceptor().intercept({} as ExecutionContext, next);
    await expect(firstValueFrom(result$)).resolves.toEqual({ data: { ok: true } });
  });
});
