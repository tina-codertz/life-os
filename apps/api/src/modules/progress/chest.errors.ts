import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';

const MESSAGES = {
  daily: 'Finish a task today to open the daily chest.',
  habit: 'This chest opens on a milestone day, every 7th day of the streak.',
} as const;

export class ChestNotReadyError extends AppException {
  constructor(kind: keyof typeof MESSAGES) {
    super(HttpStatus.UNPROCESSABLE_ENTITY, 'CHEST_NOT_READY', MESSAGES[kind]);
  }
}

// The XP ledger keys of the two chests: each pays once (per day, and per habit and day).
export const dailyChestKey = (day: string) => `daily:${day}`;
export const habitChestKey = (habitId: string, day: string) => `habit:${habitId}:${day}`;
