import { HttpStatus, type PipeTransform } from '@nestjs/common';
import type { ApiErrorDetail } from '@life-os/shared';
import type { z } from 'zod';
import { AppException } from '../errors/app.exception.js';

// One detail per problem. `field` is the dotted path ("title", "items.0.name"); a problem with
// the whole value (e.g. no body at all) has no field. Zod messages describe the rule, never the
// value, so a rejected password doesn't end up in the response.
export function toErrorDetails(error: z.ZodError): ApiErrorDetail[] {
  return error.issues.map((issue) =>
    issue.path.length > 0
      ? { field: issue.path.map(String).join('.'), message: issue.message }
      : { message: issue.message },
  );
}

// Validates and converts one controller argument with a Zod schema:
//   create(@Body(new ZodValidationPipe(createTaskSchema)) body: CreateTaskInput)
// The controller receives the *parsed* value: coerced, defaults applied, unknown keys dropped.
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_FAILED',
        'Some fields are invalid.',
        {
          details: toErrorDetails(result.error),
        },
      );
    }
    return result.data;
  }
}
