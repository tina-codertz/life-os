import { HttpStatus } from '@nestjs/common';
import { MAX_SUBTASKS } from '@life-os/shared';
import { AppException } from '../../common/errors/app.exception.js';

// Also for another user's task, and a deleted one past its 30 days (docs/06: 404, never 403).
export class TaskNotFoundError extends AppException {
  constructor() {
    super(HttpStatus.NOT_FOUND, 'TASK_NOT_FOUND', 'Task not found.');
  }
}

export function fieldError(field: string, message: string): AppException {
  return new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', 'Some fields are invalid.', {
    details: [{ field, message }],
  });
}

// FR-TASK-005: one level only.
export class SubtaskNotAllowedError extends AppException {
  constructor() {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'SUBTASK_NOT_ALLOWED',
      "A subtask can't have subtasks of its own.",
    );
  }
}

export class SubtaskLimitError extends AppException {
  constructor() {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'SUBTASK_LIMIT_REACHED',
      `A task can have up to ${MAX_SUBTASKS} subtasks.`,
    );
  }
}
