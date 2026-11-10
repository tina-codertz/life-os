import { z } from 'zod';
import { addDays, daysBetween } from '../dates.ts';
import { CATEGORY_COLORS, type CategoryColor } from './categories.ts';
import type { HabitDay } from './habits.ts';
import { occursOn, parseRule, recurrenceRuleSchema } from './recurrence.ts';
import { localDateSchema, type PublicTask } from './tasks.ts';

// Calendar I (FR-CAL-001…005). An event is stored like a task's date and time: local days and
// minutes after local midnight in the user's own zone (ADR-022), so "Lunch at 12:30" stays
// 12:30 wherever they are, and a repeat never drifts across daylight saving.

export const EVENT_TITLE_MAX_LENGTH = 120;
export const EVENT_NOTES_MAX_LENGTH = 5000;
export const EVENT_LOCATION_MAX_LENGTH = 200;
// One event (one occurrence of a repeating one) covers at most this many days.
export const MAX_EVENT_DAYS = 14;
// GET /calendar answers for at most this many days (a month view with its edges is 42).
export const CALENDAR_MAX_DAYS = 62;
// Reminder: up to a week before (FR-CAL-006).
export const MAX_EVENT_REMINDER_MINUTES = 10_080;
export const DEFAULT_EVENT_COLOR: CategoryColor = 'orange';

const title = z
  .string()
  .trim()
  .min(1, { error: 'Give the event a title.' })
  .max(EVENT_TITLE_MAX_LENGTH, { error: `Use at most ${EVENT_TITLE_MAX_LENGTH} characters.` });
const notes = z
  .string()
  .trim()
  .max(EVENT_NOTES_MAX_LENGTH, { error: `Use at most ${EVENT_NOTES_MAX_LENGTH} characters.` });
const location = z
  .string()
  .trim()
  .max(EVENT_LOCATION_MAX_LENGTH, {
    error: `Use at most ${EVENT_LOCATION_MAX_LENGTH} characters.`,
  });
const color = z.enum(CATEGORY_COLORS, { error: 'Choose a colour from the list.' });
const minutes = z.number().int().min(0).max(1439);
const reminderMinutes = z.number().int().min(0).max(MAX_EVENT_REMINDER_MINUTES);

// The when-fields of an event, after a create or a change: what has to hold between them.
export interface EventTimes {
  startDate: string;
  endDate: string;
  startTime: number | null; // null on both = all day
  endTime: number | null;
  recurrenceRule: string | null;
  recurrenceUntil: string | null;
}

// The first broken rule, or null. One copy for the schema (create) and the API (a change is
// checked against the stored event).
export function eventTimesProblem(e: EventTimes): { field: string; message: string } | null {
  if ((e.startTime === null) !== (e.endTime === null)) {
    return { field: 'endTime', message: 'Give both a start and an end time, or neither.' };
  }
  if (e.endDate < e.startDate) {
    return { field: 'endDate', message: 'End on or after the start.' };
  }
  if (e.endDate === e.startDate && e.startTime !== null && (e.endTime ?? 0) <= e.startTime) {
    return { field: 'endTime', message: 'End after the start.' };
  }
  if (daysBetween(e.startDate, e.endDate) + 1 > MAX_EVENT_DAYS) {
    return { field: 'endDate', message: `An event can last up to ${MAX_EVENT_DAYS} days.` };
  }
  if (e.recurrenceUntil !== null && e.recurrenceRule === null) {
    return { field: 'recurrenceUntil', message: 'Only a repeating event can have an end date.' };
  }
  if (e.recurrenceUntil !== null && e.recurrenceUntil < e.startDate) {
    return { field: 'recurrenceUntil', message: 'Stop repeating on or after the first day.' };
  }
  return null;
}

// POST /events. A one-day event can leave out endDate; no times means all day.
export const createEventSchema = z
  .object({
    title,
    notes: notes.nullable().optional(),
    location: location.nullable().optional(),
    color: color.optional(),
    startDate: localDateSchema,
    endDate: localDateSchema.optional(),
    startTime: minutes.nullable().optional(),
    endTime: minutes.nullable().optional(),
    recurrenceRule: recurrenceRuleSchema.nullable().optional(),
    // The last day it can repeat on (inclusive), or null for no end.
    recurrenceUntil: localDateSchema.nullable().optional(),
    reminderMinutes: reminderMinutes.nullable().optional(),
  })
  .superRefine((e, ctx) => {
    const problem = eventTimesProblem({
      startDate: e.startDate,
      endDate: e.endDate ?? e.startDate,
      startTime: e.startTime ?? null,
      endTime: e.endTime ?? null,
      recurrenceRule: e.recurrenceRule ?? null,
      recurrenceUntil: e.recurrenceUntil ?? null,
    });
    if (problem) ctx.addIssue({ code: 'custom', path: [problem.field], message: problem.message });
  });
export type CreateEventInput = z.infer<typeof createEventSchema>;

// PATCH /events/:id: strict, partial; `null` clears. A change applies to every occurrence of a
// repeating event (MVP: no "only this one"). The cross-field rules run in the service.
export const updateEventSchema = z.strictObject({
  title: title.optional(),
  notes: notes.nullable().optional(),
  location: location.nullable().optional(),
  color: color.optional(),
  startDate: localDateSchema.optional(),
  endDate: localDateSchema.optional(),
  startTime: minutes.nullable().optional(),
  endTime: minutes.nullable().optional(),
  recurrenceRule: recurrenceRuleSchema.nullable().optional(),
  recurrenceUntil: localDateSchema.nullable().optional(),
  reminderMinutes: reminderMinutes.nullable().optional(),
});
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// GET /calendar?from&to: local days, both included.
export const calendarQuerySchema = z
  .object({ from: localDateSchema, to: localDateSchema })
  .refine((q) => q.from <= q.to, { path: ['to'], error: 'End on or after the start.' })
  .refine((q) => daysBetween(q.from, q.to) + 1 <= CALENDAR_MAX_DAYS, {
    path: ['to'],
    error: `Ask for at most ${CALENDAR_MAX_DAYS} days.`,
  });
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;

export interface PublicEvent {
  id: string;
  title: string;
  notes: string | null;
  location: string | null;
  color: CategoryColor;
  startDate: string;
  endDate: string;
  startTime: number | null; // minutes after local midnight; null on both = all day
  endTime: number | null;
  recurrenceRule: string | null;
  recurrenceUntil: string | null;
  reminderMinutes: number | null;
  createdAt: string;
  updatedAt: string;
}

// One occurrence on the calendar: the event with this occurrence's days. Every occurrence of a
// repeating event has the event's id; editing one edits them all.
export type CalendarEvent = PublicEvent;

// A habit on the days in the range it's due (or was done). With a reminder, the day view shows
// it as a block at that time (your choice); otherwise in the "All day" row.
export interface CalendarHabit {
  id: string;
  name: string;
  icon: string | null;
  color: CategoryColor;
  reminderTimes: number[];
  days: HabitDay[];
}

export interface CalendarRange {
  from: string;
  to: string;
  events: CalendarEvent[]; // by start day, then start time
  tasks: PublicTask[]; // top-level tasks due in the range, by day and time
  habits: CalendarHabit[];
}

export const EVENT_ERROR_CODES = ['EVENT_NOT_FOUND'] as const;

// The occurrences of an event that touch the days from…to: the event itself if it doesn't
// repeat, else one per day the rule names (up to recurrenceUntil), each as long as the first.
export function eventOccurrences<
  T extends Pick<PublicEvent, 'startDate' | 'endDate' | 'recurrenceRule' | 'recurrenceUntil'>,
>(event: T, from: string, to: string): T[] {
  const span = daysBetween(event.startDate, event.endDate);
  const rule = event.recurrenceRule ? parseRule(event.recurrenceRule) : null;
  if (!rule) return event.startDate <= to && event.endDate >= from ? [event] : [];

  const out: T[] = [];
  // An occurrence that started up to `span` days before `from` still reaches into the range.
  let day = addDays(from, -span) > event.startDate ? addDays(from, -span) : event.startDate;
  const last =
    event.recurrenceUntil !== null && event.recurrenceUntil < to ? event.recurrenceUntil : to;
  for (; day <= last; day = addDays(day, 1)) {
    if (occursOn(rule, event.startDate, day)) {
      out.push({ ...event, startDate: day, endDate: addDays(day, span) });
    }
  }
  return out;
}
