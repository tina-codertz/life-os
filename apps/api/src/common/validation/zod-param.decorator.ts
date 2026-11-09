import { HttpStatus, Param, type PipeTransform } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import { z } from 'zod';
import { AppException } from '../errors/app.exception.js';

// `get(@IdParam() id: string)` for routes like /categories/:id. A malformed ID can't match any
// row, so it gets the same 404 as a missing one (codeForMissing), not a 400 that would make
// "wrong format" and "not yours / doesn't exist" look different. `name` is the route parameter,
// for a second ID such as /goals/:id/milestones/:milestoneId.
export function IdParam(
  codeForMissing = 'NOT_FOUND',
  message = 'Not found.',
  name = 'id',
): ParameterDecorator {
  const uuid = z.uuid();
  const pipe: PipeTransform<unknown, string> = {
    transform(value: unknown): string {
      const parsed = uuid.safeParse(value);
      if (!parsed.success) throw new AppException(HttpStatus.NOT_FOUND, codeForMissing, message);
      return parsed.data;
    },
  };
  return (target, propertyKey, parameterIndex) => {
    Param(name, pipe)(target, propertyKey, parameterIndex);
    if (propertyKey === undefined) return;
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    if (descriptor) {
      ApiParam({ name, format: 'uuid' })(target, propertyKey, descriptor);
    }
  };
}
