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

// Unknown, expired, revoked or reused refresh token. The app's only move is to log in again,
// so one code covers them all.
export class InvalidRefreshTokenError extends AppException {
  constructor() {
    super(
      HttpStatus.UNAUTHORIZED,
      'INVALID_REFRESH_TOKEN',
      'Your session has ended. Please log in again.',
    );
  }
}

// An emailed link that's unknown, expired, already used or replaced by a newer one.
export class InvalidLinkError extends AppException {
  constructor() {
    super(
      HttpStatus.BAD_REQUEST,
      'INVALID_LINK',
      'This link is invalid or has expired. Request a new one.',
    );
  }
}
