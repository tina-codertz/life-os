import { HttpStatus } from '@nestjs/common';
import { HABIT_BACKFILL_DAYS, MAX_HABITS } from '@life-os/shared';
import { AppException } from '../../common/errors/app.exception.js';

// Also for another user's habit (docs/06: 404, never 403).
export class HabitNotFoundError extends AppException {
  constructor() {
    super(HttpStatus.NOT_FOUND, 'HABIT_NOT_FOUND', 'Habit not found.');
  }
}

export class HabitLimitError extends AppException {
  constructor() {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'HABIT_LIMIT_REACHED',
      `You can have up to ${MAX_HABITS} habits.`,
    );
  }
}

// FR-HAB-002: today, or up to 7 days back, never the future or before the habit started.
export type CheckInProblem = 'future' | 'too-old' | 'before-start' | 'archived';
const MESSAGES: Record<CheckInProblem, string> = {
  future: "You can't check in for a day that hasn't come yet.",
  'too-old': `You can only change check-ins from the last ${HABIT_BACKFILL_DAYS} days.`,
  'before-start': "That's before this habit started.",
  archived: 'Unarchive this habit to check in.',
};

export class CheckInOutOfRangeError extends AppException {
  constructor(problem: CheckInProblem) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, 'CHECK_IN_OUT_OF_RANGE', MESSAGES[problem]);
  }
}
