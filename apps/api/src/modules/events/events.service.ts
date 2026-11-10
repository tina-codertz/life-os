import { Injectable } from '@nestjs/common';
import {
  type CalendarEvent,
  type CreateEventInput,
  DEFAULT_EVENT_COLOR,
  eventOccurrences,
  eventTimesProblem,
  MAX_EVENT_DAYS,
  type PublicEvent,
  type UpdateEventInput,
  addDays,
} from '@life-os/shared';
import { fromDbDate, toDbDate } from '../../common/dates.js';
import { fieldError } from '../../common/errors/field-error.js';
import type { Event, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventNotFoundError } from './event.errors.js';
import { toPublicEvent } from './public-event.js';

const day = (value: Date | null) => (value ? fromDbDate(value) : null);

// Calendar I (FR-CAL-002/003). Every query is scoped by the token's userId and skips deleted
// events (NFR-SEC-003): another user's event is simply not found.
@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, id: string): Promise<PublicEvent> {
    return toPublicEvent(await this.findActive(userId, id));
  }

  async create(userId: string, input: CreateEventInput): Promise<PublicEvent> {
    const event = await this.prisma.event.create({
      data: {
        userId,
        title: input.title,
        notes: input.notes || null,
        location: input.location || null,
        color: input.color ?? DEFAULT_EVENT_COLOR,
        startDate: toDbDate(input.startDate),
        endDate: toDbDate(input.endDate ?? input.startDate),
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        recurrenceRule: input.recurrenceRule ?? null,
        recurrenceUntil: input.recurrenceUntil ? toDbDate(input.recurrenceUntil) : null,
        reminderMinutes: input.reminderMinutes ?? null,
      },
    });
    return toPublicEvent(event);
  }

  // A change applies to every occurrence (MVP). The when-fields are checked together, as they'd
  // be after the change, with the same rules as a new event.
  async update(userId: string, id: string, input: UpdateEventInput): Promise<PublicEvent> {
    const event = await this.findActive(userId, id);
    const after = {
      startDate: input.startDate ?? fromDbDate(event.startDate),
      endDate: input.endDate ?? fromDbDate(event.endDate),
      startTime: input.startTime !== undefined ? input.startTime : event.startTime,
      endTime: input.endTime !== undefined ? input.endTime : event.endTime,
      recurrenceRule:
        input.recurrenceRule !== undefined ? input.recurrenceRule : event.recurrenceRule,
      recurrenceUntil:
        input.recurrenceUntil !== undefined ? input.recurrenceUntil : day(event.recurrenceUntil),
    };
    // Repeat switched off: its end date goes too.
    if (input.recurrenceRule === null) after.recurrenceUntil = null;
    const problem = eventTimesProblem(after);
    if (problem) throw fieldError(problem.field, problem.message);

    const data: Prisma.EventUpdateInput = {
      startDate: toDbDate(after.startDate),
      endDate: toDbDate(after.endDate),
      startTime: after.startTime,
      endTime: after.endTime,
      recurrenceRule: after.recurrenceRule,
      recurrenceUntil: after.recurrenceUntil ? toDbDate(after.recurrenceUntil) : null,
    };
    if (input.title !== undefined) data.title = input.title;
    if (input.notes !== undefined) data.notes = input.notes || null;
    if (input.location !== undefined) data.location = input.location || null;
    if (input.color !== undefined) data.color = input.color;
    if (input.reminderMinutes !== undefined) data.reminderMinutes = input.reminderMinutes;
    return toPublicEvent(await this.prisma.event.update({ where: { id: event.id }, data }));
  }

  // Deletes the whole series (MVP: no "only this one").
  async remove(userId: string, id: string): Promise<void> {
    const event = await this.findActive(userId, id);
    await this.prisma.event.update({ where: { id: event.id }, data: { deletedAt: new Date() } });
  }

  // Every occurrence that touches from…to, by start day and time (all-day first).
  async between(userId: string, from: string, to: string): Promise<CalendarEvent[]> {
    const events = await this.prisma.event.findMany({
      where: {
        userId,
        deletedAt: null,
        startDate: { lte: toDbDate(to) },
        OR: [
          // A one-off event that ends in the range or later (it lasts at most 14 days).
          { recurrenceRule: null, endDate: { gte: toDbDate(from) } },
          // A series that hasn't stopped repeating before the range.
          {
            recurrenceRule: { not: null },
            OR: [
              { recurrenceUntil: null },
              { recurrenceUntil: { gte: toDbDate(addDays(from, -MAX_EVENT_DAYS)) } },
            ],
          },
        ],
      },
    });
    return events
      .flatMap((e: Event) => eventOccurrences(toPublicEvent(e), from, to))
      .toSorted(
        (a, b) =>
          a.startDate.localeCompare(b.startDate) ||
          (a.startTime ?? -1) - (b.startTime ?? -1) ||
          a.createdAt.localeCompare(b.createdAt),
      );
  }

  private async findActive(userId: string, id: string): Promise<Event> {
    const event = await this.prisma.event.findFirst({ where: { id, userId, deletedAt: null } });
    if (!event) throw new EventNotFoundError();
    return event;
  }
}
