import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception.js';

// A 400 VALIDATION_FAILED pointing at one field, for rules a schema can't check alone
// (e.g. "a time needs a date" when the date is already stored).
export function fieldError(field: string, message: string): AppException {
  return new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', 'Some fields are invalid.', {
    details: [{ field, message }],
  });
}
