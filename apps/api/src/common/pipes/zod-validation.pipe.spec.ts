import { paginationQuerySchema } from '@life-os/shared';
import { z } from 'zod';
import { AppException } from '../errors/app.exception.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

const signUpSchema = z.object({
  email: z.email(),
  password: z.string().min(12),
  profile: z.object({ name: z.string().min(1) }),
});

const notAllowed = (field: string) => ({ field, message: 'This field is not allowed.' });

function validationError(pipe: ZodValidationPipe<z.ZodType>, value: unknown): AppException {
  try {
    pipe.transform(value);
  } catch (err) {
    if (err instanceof AppException) return err;
    throw err;
  }
  throw new Error('expected the pipe to throw');
}

describe('ZodValidationPipe', () => {
  it('returns the parsed value: coerced, defaults applied, unknown keys dropped', () => {
    const pipe = new ZodValidationPipe(paginationQuerySchema);
    expect(pipe.transform({ limit: '10', isAdmin: 'true' })).toEqual({ limit: 10 });
    expect(pipe.transform({})).toEqual({ limit: 30 });
  });

  it('throws 400 VALIDATION_FAILED with one detail per invalid field', () => {
    const err = validationError(new ZodValidationPipe(signUpSchema), {
      email: 'not-an-email',
      password: 'short',
      profile: { name: '' },
    });

    expect(err.getStatus()).toBe(400);
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.details.map((d) => d.field)).toEqual(['email', 'password', 'profile.name']);
    expect(err.details.every((d) => d.message.length > 0)).toBe(true);
  });

  it('reports a missing body without a field', () => {
    const err = validationError(new ZodValidationPipe(signUpSchema), undefined);
    expect(err.details).toEqual([{ message: expect.any(String) }]);
  });

  it('uses the full path for array items', () => {
    const schema = z.object({ tags: z.array(z.string().max(3)) });
    const err = validationError(new ZodValidationPipe(schema), { tags: ['ok', 'too long'] });
    expect(err.details[0]?.field).toBe('tags.1');
  });

  it('gives each unknown key of a strict object its own detail', () => {
    const schema = z.strictObject({ name: z.string(), nested: z.strictObject({ a: z.number() }) });
    const err = validationError(new ZodValidationPipe(schema), {
      name: 'ok',
      nmae: 'typo',
      role: 'ADMIN',
      nested: { a: 1, b: 2 },
    });
    expect(err.details).toHaveLength(3);
    expect(err.details).toEqual(
      expect.arrayContaining([notAllowed('nmae'), notAllowed('role'), notAllowed('nested.b')]),
    );
  });

  it('never echoes the rejected value', () => {
    const err = validationError(new ZodValidationPipe(signUpSchema), {
      email: 'me@example.com',
      password: 'hunter2',
      profile: { name: 'Tina' },
    });
    expect(JSON.stringify(err.details)).not.toContain('hunter2');
  });
});
