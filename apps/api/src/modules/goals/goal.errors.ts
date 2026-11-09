import { HttpStatus } from '@nestjs/common';
import { MAX_GOALS, MAX_MILESTONES } from '@life-os/shared';
import { AppException } from '../../common/errors/app.exception.js';

// Also for another user's goal: it doesn't exist *for you* (docs/06: 404, never 403).
export class GoalNotFoundError extends AppException {
  constructor() {
    super(HttpStatus.NOT_FOUND, 'GOAL_NOT_FOUND', 'Goal not found.');
  }
}

export class MilestoneNotFoundError extends AppException {
  constructor() {
    super(HttpStatus.NOT_FOUND, 'MILESTONE_NOT_FOUND', 'Milestone not found.');
  }
}

export class GoalLimitError extends AppException {
  constructor() {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'GOAL_LIMIT_REACHED',
      `You can have up to ${MAX_GOALS} goals.`,
    );
  }
}

export class MilestoneLimitError extends AppException {
  constructor() {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'MILESTONE_LIMIT_REACHED',
      `A goal can have up to ${MAX_MILESTONES} milestones.`,
    );
  }
}
