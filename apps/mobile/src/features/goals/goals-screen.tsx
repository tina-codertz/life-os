import type { PublicCategory, PublicGoal } from '@life-os/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Screen } from '@/components/screen';
import {
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  Skeleton,
  SkeletonGroup,
  Text,
} from '@/components/ui';
import { localToday } from '@/features/tasks/dates';
import { useCategories } from '@/features/tasks/queries';
import { useTimezone } from '@/features/users/use-timezone';
import { radius, spacing, useTheme } from '@/theme';
import { GoalHero, GoalTile } from './goal-parts';
import { dayMonth } from './pace';
import { useGoals, useToggleMilestone } from './queries';

const newGoal = () => router.push('/goal-form');

// The design's Goals screen: "3 active", the goal with the closest deadline as the big card,
// the other active goals two to a row, then (your choice) the completed ones. Abandoned goals
// aren't shown. Opened from the target button on the Tasks header.
export function GoalsScreen() {
  const goals = useGoals();
  const categories = useCategories();
  const today = localToday(useTimezone());
  const list = goals.data ?? [];
  const active = list.filter((g) => g.status === 'ACTIVE');
  const completed = list.filter((g) => g.status === 'COMPLETED');
  const categoryOf = (goal: PublicGoal) => categories.data?.find((c) => c.id === goal.categoryId);

  let body: React.ReactNode;
  if (goals.data === undefined) {
    body = goals.error ? (
      <Card>
        <ErrorState
          error={goals.error}
          onRetry={() => void goals.refetch()}
          retrying={goals.isFetching}
        />
      </Card>
    ) : (
      <SkeletonGroup label="Loading goals">
        <Skeleton shape="block" height={260} />
        <Skeleton shape="block" height={130} />
      </SkeletonGroup>
    );
  } else if (active.length === 0 && completed.length === 0) {
    body = (
      <Card>
        <EmptyState
          mascot="sleepy"
          title="No goals yet"
          description="Pick something to aim for, then break it into milestones and tick them off."
          action={{ label: 'New goal', icon: 'add', onPress: newGoal }}
        />
      </Card>
    );
  } else {
    const [first, ...rest] = active;
    body = (
      <>
        {first ? (
          <Featured goal={first} category={categoryOf(first)} today={today} />
        ) : (
          <Card>
            <Text tone="secondary">No active goals. Start a new one with +.</Text>
          </Card>
        )}
        <Tiles goals={rest} categoryOf={categoryOf} today={today} />
        {completed.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Text variant="title3" accessibilityRole="header">
              Completed
            </Text>
            <Tiles goals={completed} categoryOf={categoryOf} today={today} />
          </View>
        )}
      </>
    );
  }

  return (
    <Screen
      title="Goals"
      subtitle={goals.data ? `${active.length} active` : undefined}
      tabBar={false}
      actions={<IconButton icon="add" accessibilityLabel="New goal" onPress={newGoal} />}
    >
      {body}
    </Screen>
  );
}

// The big card, with "Closest deadline · 20 Dec" peeking out above it when it has one.
function Featured({
  goal,
  category,
  today,
}: {
  goal: PublicGoal;
  category: PublicCategory | undefined;
  today: string;
}) {
  const { colors } = useTheme();
  const toggle = useToggleMilestone(goal);
  return (
    <View>
      {goal.targetDate && (
        <View
          style={{
            marginHorizontal: spacing.lg,
            marginBottom: -spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: spacing.md + spacing.sm,
            paddingHorizontal: spacing.md,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            backgroundColor: colors.tile.sky,
          }}
        >
          <Text variant="caption" tone="label">
            Closest deadline ·{' '}
            <Text variant="caption" style={{ fontWeight: '700' }}>
              {dayMonth(goal.targetDate, today)}
            </Text>
          </Text>
        </View>
      )}
      <GoalHero
        goal={goal}
        category={category}
        onToggle={(m, done) => toggle.mutate({ id: m.id, done })}
      />
    </View>
  );
}

// Two to a row; an odd last one keeps half the width.
function Tiles({
  goals,
  categoryOf,
  today,
}: {
  goals: PublicGoal[];
  categoryOf: (goal: PublicGoal) => PublicCategory | undefined;
  today: string;
}) {
  const rows: PublicGoal[][] = [];
  for (let i = 0; i < goals.length; i += 2) rows.push(goals.slice(i, i + 2));
  return (
    <View style={{ gap: spacing.sm + 2 }}>
      {rows.map((row) => (
        <View key={row[0]!.id} style={{ flexDirection: 'row', gap: spacing.sm + 2 }}>
          {row.map((g) => (
            <GoalTile key={g.id} goal={g} category={categoryOf(g)} today={today} />
          ))}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}
