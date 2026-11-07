import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import { Page } from '../pagination/page.js';

// Wraps what a controller returns in the success envelope (docs/06 §1).
export function toEnvelope(value: unknown): unknown {
  // Nothing to wrap: 204 No Content (e.g. DELETE) must have an empty body.
  if (value === undefined) return undefined;
  // File downloads (data export) are sent as-is.
  if (value instanceof StreamableFile) return value;
  if (value instanceof Page) return { data: value.items, meta: value.meta };
  return { data: value };
}

// Runs after the controller on every successful request. Errors skip it entirely:
// a thrown exception goes to AllExceptionsFilter instead.
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map(toEnvelope));
  }
}
