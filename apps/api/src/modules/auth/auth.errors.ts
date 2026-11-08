import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';

export class EmailTakenError extends AppException {
  constructor(cause?: unknown) {
    super(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'An account with this email already exists.', {
      cause,
    });
  }
}

// One error for "no such email" and "wrong password", so a login attempt can't be used to
// find out who has an account.
export class InvalidCredentialsError extends AppException {
  constructor() {
    super(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
}
