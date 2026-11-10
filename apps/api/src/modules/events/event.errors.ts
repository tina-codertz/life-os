import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';

// Also for another user's event: it doesn't exist *for you* (docs/06: 404, never 403).
export class EventNotFoundError extends AppException {
  constructor() {
    super(HttpStatus.NOT_FOUND, 'EVENT_NOT_FOUND', 'Event not found.');
  }
}
