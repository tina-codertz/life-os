import { Body } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe.js';

// `create(@ZodBody(createTaskSchema) body: CreateTaskInput)` does two things from one schema:
// validates the body (ZodValidationPipe) and documents it in Swagger (Zod's own JSON Schema
// export). The docs can't drift from what the API actually accepts. (ADR-012)
export function ZodBody(schema: z.ZodType): ParameterDecorator {
  const jsonSchema = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'input', // describe what the client sends, before transforms
    unrepresentable: 'any', // custom checks (e.g. time zones) show as a plain string
  });
  return (target, propertyKey, parameterIndex) => {
    Body(new ZodValidationPipe(schema))(target, propertyKey, parameterIndex);
    if (propertyKey === undefined) return;
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    if (descriptor) {
      // ApiBody is a method decorator; applying it here keeps the schema in one place.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      ApiBody({ schema: jsonSchema as object })(target, propertyKey, descriptor);
    }
  };
}
