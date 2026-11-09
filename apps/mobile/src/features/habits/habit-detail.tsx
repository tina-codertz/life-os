import { type HabitDay, type PublicHabit, XP } from '@life-os/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWash } from '@/components/screen';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  type IconName,
  IconButton,
  IconTile,
  Skeleton,
  SkeletonGroup,
  Text,
} from '@/components/ui';
import { monthName, monthWeeks, weekdayLetter } from '@/features/history/history-dates';
import { Badge } from '@/features/history/parts';
import { formatDayLong, formatTime, localToday } from '@/features/tasks/dates';
import { useMe } from '@/features/users/queries';
import { useTimezone } from '@/features/users/use-timezone';
import { radius, spacing, useTheme } from '@/theme';
import { scheduleLabel } from './quest';
import { useHabitDays, useHabitStats, useHabits } from './queries';
import { useDayPress } from './use-day-press';

// The design's Habit detail: the streak card (+5 XP a day), Consistency / Total days / Best
// streak, this month's days, and "Mark done today". Opened from the habit's card on Habits.
export function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const habits = useHabits();
  const habit = habits.data?.find((h) => h.id === id);

  let body: React.ReactNode;
  if (habit) {
    body = <HabitDetail habit={habit} />;
  } else if (habits.data) {
    // Deleted or archived since the list was opened.
    body = (
      <Card>
        <EmptyState
          mascot="sleepy"
          title="This habit isn’t here any more"
          description="It may have been archived or deleted."
          action={{ label: 'Back to habits', onPress: () => router.back() }}
        />
      </Card>
    );
  } else if (habits.error) {
    body = (
      <Card>
        <ErrorState
          error={habits.error}
          onRetry={() => void habits.refetch()}
          retrying={habits.isFetching}
        />
      </Card>
    );
  } else {
    body = (
      <SkeletonGroup label="Loading the habit">
        <Skeleton shape="block" height={96} />
        <Skeleton shape="block" height={110} />
        <Skeleton shape="block" height={300} />
      </SkeletonGroup>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
      <ScreenWash />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.gutter,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconButton icon="chevronLeft" accessibilityLabel="Back" onPress={() => router.back()} />
          <View style={{ flex: 1 }}>
            <Text variant="title2" accessibilityRole="header" numberOfLines={1}>
              {habit?.name ?? 'Habit'}
            </Text>
            {habit && (
              <Text variant="caption" tone="secondary">
                {scheduleLabel(habit.schedule)}
                {reminderLabel(habit.reminderTimes)}
              </Text>
            )}
          </View>
          {habit && (
            <IconButton
              icon="pencil"
              accessibilityLabel="Edit habit"
              onPress={() => router.push({ pathname: '/habit-form', params: { id: habit.id } })}
            />
          )}
        </View>
        {body}
      </ScrollView>
    </View>
  );
}

function HabitDetail({ habit }: { habit: PublicHabit }) {
  const timezone = useTimezone();
  const today = localToday(timezone);
  const weekStartsOn = useMe().data?.settings.weekStartsOn ?? 1;
  const month = today.slice(0, 7);
  const weeks = monthWeeks(month, weekStartsOn);
  const days = useHabitDays(habit.id, `${month}-01`, weeks.at(-1)?.[6] ?? today);
  const stats = useHabitStats(habit.id);
  const press = useDayPress(habit, today);

  const count = habit.today?.count ?? 0;
  const doneToday = count >= habit.targetCount;
  const chestToOpen = doneToday && Boolean(habit.chest && !habit.chest.collected);
  const unit = habit.streak.unit === 'days' ? 'day' : 'week';
  const consistency = stats.data?.consistency;

  return (
    <>
      <StreakCard habit={habit} unit={unit} />
      <View style={{ flexDirection: 'row', gap: spacing.sm + 2 }}>
        <StatTile
          icon="check"
          tint="lime"
          value={stats.data ? (consistency === null ? '–' : `${consistency}%`) : '…'}
          label="Consistency"
          spoken={
            consistency === null || consistency === undefined
              ? 'Consistency: not yet'
              : `Consistency: ${consistency}%`
          }
        />
        <StatTile
          icon="calendar"
          tint="sky"
          value={stats.data ? String(stats.data.totalDays) : '…'}
          label="Total days"
        />
        <StatTile
          icon="trophy"
          tint="lavender"
          value={String(habit.streak.best)}
          label="Best streak"
        />
      </View>
      <MonthCard
        month={month}
        weeks={weeks}
        days={days.data}
        loading={days.data === undefined && !days.error}
      />
      {habit.dueToday || doneToday ? (
        <Button
          title={todayButtonTitle(habit, count, doneToday)}
          variant={doneToday && !chestToOpen ? 'secondary' : 'primary'}
          size="lg"
          icon={chestToOpen ? 'gift' : 'check'}
          onPress={() => press({ kind: 'today', date: today, done: doneToday, count })}
        />
      ) : null}
    </>
  );
}

// The design's "Daily · reminder 21:00".
function reminderLabel(times: number[]): string {
  if (times.length === 0) return '';
  return ` · ${times.length === 1 ? 'reminder' : 'reminders'} ${times.map(formatTime).join(', ')}`;
}

function todayButtonTitle(habit: PublicHabit, count: number, doneToday: boolean): string {
  if (doneToday && habit.chest && !habit.chest.collected) return 'Open your chest';
  if (doneToday) return 'Done today';
  if (habit.targetCount > 1) {
    return `Add one · ${count} of ${habit.targetCount}${habit.unit ? ` ${habit.unit}` : ''}`;
  }
  return 'Mark done today';
}

function StreakCard({ habit, unit }: { habit: PublicHabit; unit: 'day' | 'week' }) {
  const { colors } = useTheme();
  const { current, best } = habit.streak;
  return (
    <Card>
      <View
        accessible
        accessibilityLabel={`${current}-${unit} streak. Best: ${best} ${unit}${best === 1 ? '' : 's'}. Plus ${XP.HABIT} XP a day.`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md + 2 }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.lg,
            backgroundColor: colors.tile.peach,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="flame" size={30} color={colors.flame} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="hero" style={{ fontSize: 44, lineHeight: 46, letterSpacing: -1.5 }}>
            {current}
            <Text variant="title3" tone="secondary" style={{ fontSize: 20 }}>
              {` ${unit} streak`}
            </Text>
          </Text>
          <Text variant="callout" tone="secondary" style={{ fontSize: 14 }}>
            Best: {best} {unit}
            {best === 1 ? '' : 's'}
          </Text>
        </View>
        <Badge text={`+${XP.HABIT} XP`} />
      </View>
    </Card>
  );
}

function StatTile({
  icon,
  tint,
  value,
  label,
  spoken,
}: {
  icon: IconName;
  tint: 'lime' | 'sky' | 'lavender';
  value: string;
  label: string;
  spoken?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={spoken ?? `${label}: ${value}`}
      style={{
        flex: 1,
        backgroundColor: colors.tile[tint],
        borderRadius: radius.xl - 2,
        padding: spacing.md,
      }}
    >
      <IconTile icon={icon} tint="rgba(255,255,255,0.75)" size={32} round />
      <Text variant="title2" style={{ marginTop: spacing.sm + 2, fontSize: 24 }}>
        {value}
      </Text>
      <Text variant="caption" tone="label">
        {label}
      </Text>
    </View>
  );
}

const STATE_WORDS: Record<HabitDay['state'], string> = {
  done: 'done',
  missed: 'missed',
  open: 'not needed',
  off: 'not one of its days',
  today: 'today, not done yet',
  upcoming: 'still to come',
  'before-start': 'before it started',
};

// This month's days: green done, purple today, grey missed, faint the rest.
function MonthCard({
  month,
  weeks,
  days,
  loading,
}: {
  month: string;
  weeks: string[][];
  days: HabitDay[] | undefined;
  loading: boolean;
}) {
  const { colors } = useTheme();
  const byDate = new Map((days ?? []).map((d) => [d.date, d]));
  const look = (state: HabitDay['state'] | undefined) => {
    const day = colors.quest.day;
    if (state === 'done') return { bg: day.doneFill, fg: day.doneText };
    if (state === 'today') return { bg: colors.accent.fill, fg: colors.text.onAccent };
    if (state === 'missed') return { bg: day.missedFill, fg: day.missedText };
    return { bg: day.laterFill, fg: day.laterText };
  };

  return (
    <Card style={{ padding: spacing.md + 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="title3" accessibilityRole="header">
          {monthName(month)}
        </Text>
        <Text variant="caption" tone="secondary">
          Missed days are okay
        </Text>
      </View>
      {loading ? (
        <SkeletonGroup label="Loading the month">
          <Skeleton shape="block" height={220} />
        </SkeletonGroup>
      ) : (
        <View style={{ gap: 5 }}>
          <View
            style={{ flexDirection: 'row', gap: 5 }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {(weeks[0] ?? []).map((d) => (
              <Text
                key={d}
                variant="label"
                tone="secondary"
                style={{ flex: 1, textAlign: 'center', fontSize: 12 }}
              >
                {weekdayLetter(d)}
              </Text>
            ))}
          </View>
          {weeks.map((week) => (
            <View key={week[0]} style={{ flexDirection: 'row', gap: 5 }}>
              {week.map((date) => {
                if (!date.startsWith(month)) return <View key={date} style={{ flex: 1 }} />;
                const state = byDate.get(date)?.state;
                const { bg, fg } = look(state);
                return (
                  <View
                    key={date}
                    accessible
                    accessibilityLabel={`${formatDayLong(date)}, ${state ? STATE_WORDS[state] : 'still to come'}`}
                    testID={`day-${date}`}
                    style={{
                      flex: 1,
                      height: 34,
                      borderRadius: radius.md - 2,
                      backgroundColor: bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="label" style={{ color: fg, fontSize: 13 }}>
                      {Number(date.slice(8))}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
