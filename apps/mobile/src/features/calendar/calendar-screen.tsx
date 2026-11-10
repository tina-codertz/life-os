import type { CalendarRange, PublicCategory } from '@life-os/shared';
import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader, ScreenWash } from '@/components/screen';
import {
  Button,
  Card,
  ErrorState,
  IconButton,
  SegmentedControl,
  Skeleton,
  SkeletonGroup,
  Text,
} from '@/components/ui';
import { monthName, monthWeeks, startOfWeek, weekDays } from '@/features/history/history-dates';
import { addMonths, localToday, monthOf } from '@/features/tasks/dates';
import { useCategories } from '@/features/tasks/queries';
import { useMe } from '@/features/users/queries';
import { useTimezone } from '@/features/users/use-timezone';
import { spacing, useTheme } from '@/theme';
import { type CalendarItem, itemsOn } from './calendar-items';
import { DayView } from './day-view';
import { MonthView } from './month-view';
import { useCalendar } from './queries';
import { WeekView } from './week-view';

type View3 = 'day' | 'week' | 'month';
const VIEWS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const;

const utc = (day: string) => new Date(`${day}T00:00:00.000Z`);
// "Sunday 8".
const dayTitle = (day: string) =>
  `${new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long' }).format(utc(day))} ${Number(day.slice(8))}`;
const dayAndMonth = (d: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(
    utc(d),
  );
// "2 – 8", or "30 Nov – 6 Dec" across months.
function weekTitle(week: string[]): string {
  const [first = '', last = ''] = [week[0], week[6]];
  return monthOf(first) === monthOf(last)
    ? `${Number(first.slice(8))} – ${Number(last.slice(8))}`
    : `${dayAndMonth(first)} – ${dayAndMonth(last)}`;
}

function byDay(
  range: CalendarRange | undefined,
  days: string[],
  categories: ReadonlyMap<string, PublicCategory>,
): Map<string, CalendarItem[]> {
  return new Map(days.map((d) => [d, range ? itemsOn(range, d, categories) : []]));
}

// The design's Calendar (FR-CAL-001): Day, Week and Month, showing events, tasks with a date
// and habits on their days. One chosen day is shared by the three views: pick a day in Month
// and Day shows it. Opened from the Habits header.
export function CalendarScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const timeZone = useTimezone();
  const today = localToday(timeZone);
  const weekStartsOn = useMe().data?.settings.weekStartsOn ?? 1;
  const categories = useCategories();
  const categoryById = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c])),
    [categories.data],
  );

  const [view, setView] = useState<View3>('day');
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(() => monthOf(today));

  // Day and Week ask for the chosen day's week; Month for the whole weeks of its grid.
  const week = useMemo(() => weekDays(startOfWeek(day, weekStartsOn)), [day, weekStartsOn]);
  const days = useMemo(
    () => (view === 'month' ? monthWeeks(month, weekStartsOn).flat() : week),
    [view, month, weekStartsOn, week],
  );
  const calendar = useCalendar(days[0] ?? day, days[days.length - 1] ?? day);
  const itemsByDay = useMemo(
    () => byDay(calendar.data, days, categoryById),
    [calendar.data, days, categoryById],
  );

  const select = (d: string) => {
    setDay(d);
    setMonth(monthOf(d));
  };

  const title = monthName(view === 'month' ? month : monthOf(day));
  const subtitle =
    view === 'day' ? dayTitle(day) : view === 'week' ? weekTitle(week) : month.slice(0, 4);

  let body: React.ReactNode;
  if (calendar.data === undefined) {
    if (calendar.error) {
      body = (
        <Card>
          <ErrorState
            error={calendar.error}
            onRetry={() => void calendar.refetch()}
            retrying={calendar.isFetching}
          />
        </Card>
      );
    } else if (calendar.fetchStatus === 'paused') {
      body = (
        <Card>
          <Text tone="secondary">Waiting for a connection…</Text>
        </Card>
      );
    } else {
      body = (
        <SkeletonGroup label="Loading your calendar">
          <Skeleton shape="block" height={72} />
          <Skeleton shape="block" height={360} />
        </SkeletonGroup>
      );
    }
  } else if (view === 'day') {
    body = (
      <DayView
        week={week}
        day={day}
        today={today}
        items={itemsByDay.get(day) ?? []}
        timeZone={timeZone}
        onSelect={select}
      />
    );
  } else if (view === 'week') {
    body = (
      <WeekView
        week={week}
        day={day}
        today={today}
        itemsByDay={itemsByDay}
        onOpenDay={(d) => {
          select(d);
          setView('day');
        }}
      />
    );
  } else {
    body = (
      <MonthView
        month={month}
        day={day}
        today={today}
        weekStartsOn={weekStartsOn}
        itemsByDay={itemsByDay}
        onSelect={select}
      />
    );
  }

  const newEvent = (
    <IconButton
      icon="add"
      accessibilityLabel="New event"
      onPress={() => router.push({ pathname: '/event-form', params: { date: day } })}
    />
  );
  const monthArrows = (
    <>
      <IconButton
        icon="chevronLeft"
        accessibilityLabel="Previous month"
        onPress={() => setMonth((m) => addMonths(m, -1))}
      />
      <IconButton
        icon="chevronRight"
        accessibilityLabel="Next month"
        onPress={() => setMonth((m) => addMonths(m, 1))}
      />
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
      <ScreenWash />
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.gutter,
          gap: spacing.md,
        }}
        refreshControl={
          <RefreshControl
            refreshing={calendar.isRefetching}
            onRefresh={() => void calendar.refetch()}
            tintColor={colors.text.secondary}
          />
        }
      >
        <ScreenHeader
          title={title}
          subtitle={subtitle}
          actions={view === 'month' ? monthArrows : newEvent}
        />
        <SegmentedControl
          accessibilityLabel="Show calendar by"
          options={VIEWS}
          value={view}
          onChange={(next) => {
            setView(next);
            // Month opens on the chosen day's month; Day and Week on the chosen day.
            if (next === 'month') setMonth(monthOf(day));
          }}
        />
        {body}
        {view !== 'month' && !week.includes(today) && (
          <Button variant="ghost" size="sm" title="Back to today" onPress={() => select(today)} />
        )}
      </ScrollView>
    </View>
  );
}
