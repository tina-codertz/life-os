import { HABIT_BACKFILL_DAYS, type PublicHabit } from '@life-os/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWash, TAB_BAR_SPACE } from '@/components/screen';
import {
  Card,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  Skeleton,
  SkeletonGroup,
  Text,
} from '@/components/ui';
import { buildPath, habitIcon, scheduleLabel } from '@/features/habits/quest';
import { QuestPath } from '@/features/habits/quest-path';
import { useHabitDays, useHabits, useProgress } from '@/features/habits/queries';
import { useDayPress } from '@/features/habits/use-day-press';
import { addDays, localToday } from '@/features/tasks/dates';
import { useTimezone } from '@/features/users/use-timezone';
import { MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';

function openHabit(habit?: PublicHabit) {
  router.push(habit ? { pathname: '/habit-form', params: { id: habit.id } } : '/habit-form');
}

// The design's Habits screen: 🔥 streak and ⚡ XP, your habits as chips, the chosen habit's
// purple card ("READ 20 MIN · DAY 12 OF 21"), and its quest path.
export default function Habits() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const habits = useHabits();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = habits.data ?? [];
  const selected = list.find((h) => h.id === selectedId) ?? list[0];

  let body: React.ReactNode;
  if (habits.data === undefined) {
    body = habits.error ? (
      <Card>
        <ErrorState
          error={habits.error}
          onRetry={() => void habits.refetch()}
          retrying={habits.isFetching}
        />
      </Card>
    ) : (
      <SkeletonGroup label="Loading habits">
        <Skeleton shape="block" height={44} />
        <Skeleton shape="block" height={110} />
        <Skeleton shape="block" height={300} />
      </SkeletonGroup>
    );
  } else if (!selected) {
    body = (
      <Card>
        <EmptyState
          mascot="sleepy"
          title="No habits yet"
          description="Pick one small thing to do often. Lio will cheer you on."
          action={{ label: 'New habit', icon: 'add', onPress: () => openHabit() }}
        />
      </Card>
    );
  } else {
    body = (
      <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="radiogroup"
          accessibilityLabel="Your habits"
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {list.map((h) => (
            <HabitChip
              key={h.id}
              habit={h}
              selected={h.id === selected.id}
              onPress={() => setSelectedId(h.id)}
            />
          ))}
        </ScrollView>
        <HabitQuest key={selected.id} habit={selected} />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
      <ScreenWash />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + TAB_BAR_SPACE,
          paddingHorizontal: spacing.gutter,
          gap: spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text
            variant="display"
            accessibilityRole="header"
            style={{ position: 'absolute', opacity: 0 }}
          >
            Habits
          </Text>
          <ProgressChips />
          <View style={{ flex: 1 }} />
          <IconButton
            icon="calendar"
            accessibilityLabel="Calendar"
            onPress={() => router.push('/calendar')}
          />
          <IconButton icon="add" accessibilityLabel="New habit" onPress={() => openHabit()} />
        </View>
        {body}
      </ScrollView>
    </View>
  );
}

// 🔥 the overall streak and ⚡ the XP total (GET /progress).
function ProgressChips() {
  const { colors } = useTheme();
  const progress = useProgress();
  if (!progress.data) return null;
  const { xp, streak } = progress.data;
  return (
    <>
      <StatChip
        icon="flame"
        color={colors.flame}
        value={String(streak.current)}
        label={`${streak.current}-day streak`}
      />
      <StatChip
        icon="zap"
        color={colors.accent.default}
        value={xp.toLocaleString('en-GB')}
        label={`${xp.toLocaleString('en-GB')} XP`}
      />
    </>
  );
}

function StatChip({
  icon,
  color,
  value,
  label,
}: {
  icon: 'flame' | 'zap';
  color: string;
  value: string;
  label: string;
}) {
  const { colors, shadows } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        height: MIN_TOUCH_TARGET,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.full,
        backgroundColor: colors.bg.surface,
        boxShadow: shadows.sm,
      }}
    >
      <Icon name={icon} size={18} color={color} />
      <Text variant="calloutStrong">{value}</Text>
    </View>
  );
}

// The selected habit is an ink chip with just its icon, as in the design; the others show
// their name too. All are named for screen readers.
function HabitChip({
  habit,
  selected,
  onPress,
}: {
  habit: PublicHabit;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={habit.name}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH_TARGET,
        paddingHorizontal: spacing.lg + 2,
        borderRadius: radius.full,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: selected ? colors.ink.fill : colors.bg.surface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon
        name={habitIcon(habit.icon)}
        size={18}
        color={selected ? colors.ink.text : colors.text.primary}
      />
      {!selected && <Text variant="calloutStrong">{habit.name}</Text>}
    </Pressable>
  );
}

function HabitQuest({ habit }: { habit: PublicHabit }) {
  const { colors } = useTheme();
  const today = localToday(useTimezone());
  const days = useHabitDays(habit.id, addDays(today, -21), today);
  const onPressDay = useDayPress(habit, today);
  const nodes = buildPath(habit, days.data ?? [], today);
  const earliest = addDays(today, -HABIT_BACKFILL_DAYS);
  const daily = habit.streak.unit === 'days';
  const counter = daily ? 'DAY' : 'WEEK';

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          borderRadius: radius.xl + 2,
          padding: spacing.lg + 2,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          backgroundImage: `linear-gradient(135deg, ${colors.accent.fill}, ${colors.accent.fillEnd})`,
          boxShadow: '0 14px 28px rgba(90,87,238,0.3)',
        }}
      >
        {/* The card opens the habit's detail (its streak, stats and month). */}
        <Pressable
          style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.8 : 1 })}
          accessibilityRole="button"
          accessibilityHint="Opens the habit’s details"
          onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
          testID="habit-card"
        >
          <Text variant="label" tone="onAccent" style={{ letterSpacing: 1, fontSize: 13 }}>
            {habit.name.toUpperCase()} · {counter} {habit.streak.current}
            {daily ? ` OF ${habit.goalDays}` : ''}
          </Text>
          <Text variant="title2" tone="onAccent" style={{ marginTop: spacing.xs + 2 }}>
            {scheduleLabel(habit.schedule)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${habit.name}`}
          onPress={() => openHabit(habit)}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: radius.md + 2,
            backgroundColor: 'rgba(255,255,255,0.22)',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name="sliders" size={22} color={colors.text.onAccent} />
        </Pressable>
      </View>
      {days.data === undefined && !days.error ? (
        <SkeletonGroup label="Loading the path">
          <Skeleton shape="block" height={300} />
        </SkeletonGroup>
      ) : (
        <QuestPath
          habit={habit}
          nodes={nodes}
          canChange={(date) => date >= earliest && date >= habit.startDate}
          onPressDay={onPressDay}
        />
      )}
    </View>
  );
}
