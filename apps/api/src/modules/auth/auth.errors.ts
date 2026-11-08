import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';

export class EmailTakenError extends AppException {
  constructor(cause?: unknown) {
    super(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'An account with this email already exists.', {
      cause,
    });
  }
}
