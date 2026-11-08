import { Query } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe.js';

// `list(@ZodQuery(listTasksQuerySchema) query: ListTasksQuery)`: validates the whole query string
// with the shared schema and documents each parameter in Swagger, like @ZodBody (ADR-012).
export function ZodQuery(schema: z.ZodObject): ParameterDecorator {
  const json = z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io: 'input',
    unrepresentable: 'any',
  });
  const properties = 'properties' in json && json.properties ? Object.entries(json.properties) : [];
  return (target, propertyKey, parameterIndex) => {
    Query(new ZodValidationPipe(schema))(target, propertyKey, parameterIndex);
    if (propertyKey === undefined) return;
    const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
    if (!descriptor) return;
    for (const [name, property] of properties) {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      ApiQuery({ name, required: false, schema: property as object })(
        target,
        propertyKey,
        descriptor,
      );
    }
  };
}
