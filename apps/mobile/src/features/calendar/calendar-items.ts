import type { CalendarRange, CategoryColor, PublicCategory } from '@life-os/shared';
import type { IconName } from '@/components/ui';
import { habitIcon } from '@/features/habits/quest';
import { categoryIcon } from '@/features/tasks/category-icon';
import { formatTime } from '@/features/tasks/dates';
import { sorted } from '@/lib/arrays';

// What the Calendar's day, week and month views show for one day: tasks, events and habits as
// one kind of item, either in the "All day" row or as a block in the hours.

export type ItemKind = 'task' | 'event' | 'habit';
const DAY_END = 24 * 60;
// A timed task without a length, and a habit at its reminder, show as half an hour (your
// choice, Calendar I).
export const DEFAULT_BLOCK_MINUTES = 30;

export interface CalendarItem {
  key: string;
  kind: ItemKind;
  id: string; // the task, event or habit to open
  title: string;
  color: CategoryColor;
  icon: IconName;
  done: boolean;
  // Minutes after midnight on this day; null on both for the "All day" row.
  start: number | null;
  end: number | null;
  // "10:00 – 12:00 · Task", "All day · Event".
  detail: string;
}

const KIND_LABEL: Record<ItemKind, string> = { task: 'Task', event: 'Event', habit: 'Habit' };

function detail(kind: ItemKind, start: number | null, end: number | null): string {
  if (start === null || end === null) return `All day · ${KIND_LABEL[kind]}`;
  const until = end >= DAY_END ? '24:00' : formatTime(end);
  return `${formatTime(start)} – ${until} · ${KIND_LABEL[kind]}`;
}

function item(
  base: Omit<CalendarItem, 'detail' | 'start' | 'end'>,
  start: number | null,
  end: number | null,
): CalendarItem {
  return { ...base, start, end, detail: detail(base.kind, start, end) };
}

// Everything on `day`: all-day items first, then by start time (the API already sorts each list).
export function itemsOn(
  range: CalendarRange,
  day: string,
  categories: ReadonlyMap<string, PublicCategory>,
): CalendarItem[] {
  const out: CalendarItem[] = [];

  for (const e of range.events) {
    if (e.startDate > day || e.endDate < day) continue;
    const base = {
      key: `event:${e.id}:${e.startDate}`,
      kind: 'event' as const,
      id: e.id,
      title: e.title,
      color: e.color,
      icon: 'calendar' as const,
      done: false,
    };
    if (e.startTime === null || e.endTime === null) {
      out.push(item(base, null, null));
      continue;
    }
    // A timed event over several days: from its start on the first, to its end on the last,
    // the whole day in between.
    const first = e.startDate === day;
    const last = e.endDate === day;
    if (!first && !last) out.push(item(base, null, null));
    else out.push(item(base, first ? e.startTime : 0, last ? e.endTime : DAY_END));
  }

  for (const t of range.tasks) {
    if (t.dueDate !== day) continue;
    const category = t.categoryId ? categories.get(t.categoryId) : undefined;
    const base = {
      key: `task:${t.id}`,
      kind: 'task' as const,
      id: t.id,
      title: t.title,
      color: category?.color ?? 'violet',
      icon: category ? categoryIcon(category.icon) : ('tasks' as const),
      done: t.status === 'DONE',
    };
    if (t.dueTime === null) out.push(item(base, null, null));
    else {
      const end = t.dueTime + (t.durationMinutes ?? DEFAULT_BLOCK_MINUTES);
      out.push(item(base, t.dueTime, Math.min(end, DAY_END)));
    }
  }

  for (const h of range.habits) {
    const today = h.days.find((d) => d.date === day);
    if (!today) continue;
    const at = h.reminderTimes[0] ?? null;
    out.push(
      item(
        {
          key: `habit:${h.id}`,
          kind: 'habit',
          id: h.id,
          title: h.name,
          color: h.color,
          icon: habitIcon(h.icon),
          done: today.state === 'done',
        },
        at,
        at === null ? null : Math.min(at + DEFAULT_BLOCK_MINUTES, DAY_END),
      ),
    );
  }

  return sorted(out, (a, b) => (a.start ?? -1) - (b.start ?? -1));
}

export const isTimed = (i: CalendarItem): i is CalendarItem & { start: number; end: number } =>
  i.start !== null && i.end !== null;

export interface PlacedItem {
  item: CalendarItem & { start: number; end: number };
  column: number;
  columns: number;
}

// Side by side when they overlap: each group of overlapping blocks is split into as many
// columns as it needs, and each block takes the first column free at its start.
export function placeBlocks(items: CalendarItem[]): PlacedItem[] {
  const timed = sorted(items.filter(isTimed), (a, b) => a.start - b.start || b.end - a.end);
  const placed: PlacedItem[] = [];
  let group: PlacedItem[] = [];
  let groupEnd = -1;
  const closeGroup = () => {
    const columns = Math.max(1, ...group.map((p) => p.column + 1));
    for (const p of group) p.columns = columns;
    group = [];
  };
  for (const block of timed) {
    if (block.start >= groupEnd) closeGroup();
    // Columns whose last block has ended by this start can take it.
    const busy = new Set(group.filter((p) => p.item.end > block.start).map((p) => p.column));
    let column = 0;
    while (busy.has(column)) column += 1;
    const p = { item: block, column, columns: 1 };
    group.push(p);
    placed.push(p);
    groupEnd = Math.max(groupEnd, block.end);
  }
  closeGroup();
  return placed;
}

// The hours a view shows: 8:00 to 18:00, stretched to fit anything earlier or later.
export function hourRange(items: CalendarItem[]): { first: number; last: number } {
  const timed = items.filter(isTimed);
  const earliest = Math.min(8 * 60, ...timed.map((i) => i.start));
  const latest = Math.max(18 * 60, ...timed.map((i) => i.end));
  return { first: Math.floor(earliest / 60), last: Math.min(24, Math.ceil(latest / 60)) };
}

// The month view's dots: which kinds a day has (a habit counts once it's done that day).
export function kindsOn(items: CalendarItem[]): ItemKind[] {
  const kinds = new Set(items.filter((i) => i.kind !== 'habit' || i.done).map((i) => i.kind));
  return (['task', 'habit', 'event'] as const).filter((k) => kinds.has(k));
}

// Minutes after midnight now, on the user's clock (the day view's red line).
export function minutesNow(timeZone: string, now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get('hour') * 60 + get('minute');
}
