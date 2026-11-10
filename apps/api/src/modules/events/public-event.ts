import type { PublicEvent } from '@life-os/shared';
import { fromDbDate } from '../../common/dates.js';
import type { Event } from '../../generated/prisma/client.js';
import { paletteColor } from '../habits/public-habit.js';

// Allow-listed fields only: userId and deletedAt never leave the API.
export function toPublicEvent(event: Event): PublicEvent {
  return {
    id: event.id,
    title: event.title,
    notes: event.notes,
    location: event.location,
    color: paletteColor(event.color),
    startDate: fromDbDate(event.startDate),
    endDate: fromDbDate(event.endDate),
    startTime: event.startTime,
    endTime: event.endTime,
    recurrenceRule: event.recurrenceRule,
    recurrenceUntil: event.recurrenceUntil ? fromDbDate(event.recurrenceUntil) : null,
    reminderMinutes: event.reminderMinutes,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}
