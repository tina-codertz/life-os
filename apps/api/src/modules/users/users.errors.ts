import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';

// 403, deliberately not 401: the app answers any 401 by refreshing the token and, failing
// that, logging out. A typo in "current password" mustn't log anyone out.
export class WrongPasswordError extends AppException {
  constructor() {
    super(HttpStatus.FORBIDDEN, 'WRONG_PASSWORD', 'Your current password is incorrect.');
  }
}

// A valid token whose account has been deleted (within the token's last 15 minutes).
export class AccountGoneError extends AppException {
  constructor() {
    super(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'Log in to continue.');
  }
}
