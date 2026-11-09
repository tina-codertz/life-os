import type { GoalDetail, PublicMilestone } from '@life-os/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenWash } from '@/components/screen';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  ProgressRing,
  Skeleton,
  SkeletonGroup,
  Text,
} from '@/components/ui';
import { localToday } from '@/features/tasks/dates';
import { useCategories } from '@/features/tasks/queries';
import { useTimezone } from '@/features/users/use-timezone';
import { isApiError } from '@/services/api-error';
import { radius, spacing, useTheme } from '@/theme';
import { LinkedTaskCard, MilestoneTimeline } from './goal-parts';
import { dayMonth, daysLeftLabel, goalPace, overdueLabel, progressCaption } from './pace';
import { useGoal, useToggleMilestone } from './queries';

const editGoal = (id: string) => router.push({ pathname: '/goal-form', params: { id } });
const milestoneForm = (goalId: string, milestone?: PublicMilestone) =>
  router.push({
    pathname: '/milestone-form',
    params: milestone ? { goalId, id: milestone.id } : { goalId },
  });

// The design's Goal detail: the purple card (ring, target, days left, On track), the
// milestones, the linked tasks, and Edit / Add milestone. Opened from a goal on Goals.
export function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const goal = useGoal(id);
  const categories = useCategories();
  const data = goal.data;
  const category = categories.data?.find((c) => c.id === data?.categoryId);

  let body: React.ReactNode;
  if (data) {
    body = <Detail goal={data} />;
  } else if (goal.error) {
    body = (
      <Card>
        {isApiError(goal.error, 'GOAL_NOT_FOUND') ? (
          <EmptyState
            mascot="sleepy"
            title="This goal isn’t here any more"
            description="It may have been deleted."
            action={{ label: 'Back to goals', onPress: () => router.back() }}
          />
        ) : (
          <ErrorState
            error={goal.error}
            onRetry={() => void goal.refetch()}
            retrying={goal.isFetching}
          />
        )}
      </Card>
    );
  } else {
    body = (
      <SkeletonGroup label="Loading the goal">
        <Skeleton shape="block" height={140} />
        <Skeleton shape="block" height={260} />
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
            <Text variant="title2" accessibilityRole="header" numberOfLines={2}>
              {data?.title ?? 'Goal'}
            </Text>
            {category && (
              <Text variant="caption" tone="secondary">
                {category.name}
              </Text>
            )}
          </View>
          {data && (
            <IconButton
              icon="pencil"
              accessibilityLabel="Edit goal"
              onPress={() => editGoal(data.id)}
            />
          )}
        </View>
        {body}
      </ScrollView>
    </View>
  );
}

function Detail({ goal }: { goal: GoalDetail }) {
  const timezone = useTimezone();
  const today = localToday(timezone);
  const toggle = useToggleMilestone(goal);
  const onToggle = (m: PublicMilestone, done: boolean) => toggle.mutate({ id: m.id, done });

  return (
    <>
      <PaceCard
        goal={goal}
        today={today}
        startDay={localToday(timezone, new Date(goal.createdAt))}
      />
      <Text variant="title3" accessibilityRole="header" style={{ marginTop: spacing.xs }}>
        Milestones
      </Text>
      {goal.milestones.length > 0 ? (
        <MilestoneTimeline
          goal={goal}
          today={today}
          onToggle={onToggle}
          onOpen={(m) => milestoneForm(goal.id, m)}
        />
      ) : (
        <Card>
          <Text tone="secondary">
            No milestones yet. Break the goal into a few steps and tick them off as you go.
          </Text>
        </Card>
      )}
      {goal.linkedTasks.map((task) => (
        <LinkedTaskCard key={task.id} task={task} today={today} />
      ))}
      <View style={{ flexDirection: 'row', gap: spacing.sm + 2, marginTop: spacing.md }}>
        <Button
          title="Edit"
          variant="secondary"
          size="lg"
          icon="pencil"
          style={{ flex: 1 }}
          onPress={() => editGoal(goal.id)}
        />
        <Button
          title="Add milestone"
          size="lg"
          icon="add"
          style={{ flex: 1 }}
          onPress={() => milestoneForm(goal.id)}
        />
      </View>
    </>
  );
}

// The purple card: "Target 20 Dec", the big "42 days left", and "On track" or "Behind" (your
// rule: progress against the time gone). Without a target it says what the progress counts.
function PaceCard({
  goal,
  today,
  startDay,
}: {
  goal: GoalDetail;
  today: string;
  startDay: string;
}) {
  const { colors } = useTheme();
  const pace = goalPace(goal, today, startDay);
  let caption: string;
  let big: string;
  let note: string | null = null;
  switch (pace.kind) {
    case 'completed':
      caption = goal.targetDate ? `Target ${dayMonth(goal.targetDate, today)}` : 'Goal';
      big = 'Completed';
      note = goal.completedAt ? `On ${dayMonth(goal.completedAt.slice(0, 10), today)}` : null;
      break;
    case 'abandoned':
      caption = 'Goal';
      big = 'Set aside';
      break;
    case 'no-target':
      caption = 'No target date';
      big = progressCaption(goal);
      break;
    case 'overdue':
      caption = `Target ${dayMonth(goal.targetDate!, today)}`;
      big = overdueLabel(pace.days);
      break;
    case 'active':
      caption = `Target ${dayMonth(goal.targetDate!, today)}`;
      big = daysLeftLabel(pace.daysLeft);
      note = pace.onTrack ? 'On track' : 'Behind';
      break;
  }
  return (
    <View
      accessible
      accessibilityLabel={`${goal.progress.percent}% done. ${caption}. ${big}${note ? `. ${note}` : ''}.`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        borderRadius: radius.xl + 2,
        padding: spacing.lg,
        backgroundImage: `linear-gradient(135deg, ${colors.accent.fill}, ${colors.accent.fillEnd})`,
        boxShadow: '0 14px 28px rgba(90,87,238,0.3)',
      }}
    >
      <ProgressRing
        percent={goal.progress.percent}
        size={96}
        stroke={11}
        color={colors.text.onAccent}
        trackColor="rgba(255,255,255,0.3)"
        label={`${goal.title} progress`}
      >
        <Text variant="title2" tone="onAccent">
          {goal.progress.percent}%
        </Text>
      </ProgressRing>
      <View style={{ flex: 1 }}>
        <Text variant="label" tone="onAccent">
          {caption}
        </Text>
        <Text variant="title1" tone="onAccent" style={{ fontSize: 30, lineHeight: 34 }}>
          {big}
        </Text>
        {note && (
          <Text variant="label" tone="onAccent">
            {note}
          </Text>
        )}
      </View>
    </View>
  );
}
