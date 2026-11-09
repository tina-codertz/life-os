import {
  type PublicCategory,
  type PublicGoal,
  type PublicMilestone,
  type PublicTask,
  XP,
} from '@life-os/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Card, Icon, IconTile, ProgressRing, Text } from '@/components/ui';
import { Badge } from '@/features/history/parts';
import { categoryIcon } from '@/features/tasks/category-icon';
import { formatDue } from '@/features/tasks/dates';
import { MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import { dayMonth, progressCaption } from './pace';

const openGoal = (goal: PublicGoal) =>
  router.push({ pathname: '/goal/[id]', params: { id: goal.id } });

// The design's goal card at the top of Goals: the ring, the category chip, the title, "4 of 6
// milestones", and the first few milestones to tick.
export function GoalHero({
  goal,
  category,
  onToggle,
}: {
  goal: PublicGoal;
  category: PublicCategory | undefined;
  onToggle: (milestone: PublicMilestone, done: boolean) => void;
}) {
  const shown = goal.milestones.slice(0, 4);
  return (
    <Card variant="elevated" style={{ gap: spacing.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${goal.title}, ${goal.progress.percent}%, ${progressCaption(goal)}`}
        accessibilityHint="Opens the goal"
        onPress={() => openGoal(goal)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md + 2,
          opacity: pressed ? 0.8 : 1,
        })}
        testID="goal-hero"
      >
        <ProgressRing
          percent={goal.progress.percent}
          size={84}
          stroke={10}
          label={`${goal.title} progress`}
        >
          <Text variant="title2">{goal.progress.percent}%</Text>
        </ProgressRing>
        <View style={{ flex: 1, gap: spacing.xs }}>
          {category && <CategoryChip category={category} />}
          <Text variant="title2" numberOfLines={2}>
            {goal.title}
          </Text>
          <Text variant="caption" tone="secondary">
            {progressCaption(goal)}
          </Text>
        </View>
      </Pressable>
      {shown.length > 0 && (
        <View style={{ gap: spacing.xs }}>
          {shown.map((m, i) => {
            const done = m.completedAt !== null;
            // The next one to do stands out, as in the design ("Core screens").
            const next = !done && shown.slice(0, i).every((p) => p.completedAt !== null);
            return (
              <Pressable
                key={m.id}
                accessibilityRole="checkbox"
                accessibilityLabel={m.title}
                accessibilityState={{ checked: done }}
                onPress={() => onToggle(m, !done)}
                style={({ pressed }) => ({
                  minHeight: MIN_TOUCH_TARGET - 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <CheckCircle done={done} />
                <Text
                  variant={next ? 'bodyStrong' : 'body'}
                  tone={done ? 'secondary' : 'primary'}
                  style={{ flex: 1 }}
                  numberOfLines={1}
                >
                  {m.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {goal.milestones.length > shown.length && (
        <Text variant="caption" tone="secondary">
          +{goal.milestones.length - shown.length} more
        </Text>
      )}
    </Card>
  );
}

// The design's smaller goal cards, two to a row: the category's pastel, its icon, a small
// ring, the title and the target day ("Due 31 Jan").
export function GoalTile({
  goal,
  category,
  today,
}: {
  goal: PublicGoal;
  category: PublicCategory | undefined;
  today: string;
}) {
  const { colors } = useTheme();
  const tint = category ? colors.categoryTile[category.color] : colors.tile.neutral;
  const arc = category ? colors.category[category.color] : colors.accent.fill;
  const when =
    goal.status === 'COMPLETED' && goal.completedAt
      ? `Done ${dayMonth(goal.completedAt.slice(0, 10), today)}`
      : goal.targetDate
        ? `Due ${dayMonth(goal.targetDate, today)}`
        : 'No target date';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goal.title}, ${goal.progress.percent}%, ${when}`}
      accessibilityHint="Opens the goal"
      onPress={() => openGoal(goal)}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        backgroundColor: tint,
        borderRadius: radius.xl,
        borderCurve: 'continuous',
        padding: spacing.md,
        gap: spacing.md,
        opacity: pressed ? 0.8 : 1,
      })}
      testID="goal-tile"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconTile
          icon={category ? categoryIcon(category.icon) : 'target'}
          tint="rgba(255,255,255,0.75)"
          size={40}
          round
        />
        <ProgressRing
          percent={goal.progress.percent}
          size={46}
          stroke={6}
          color={arc}
          label={`${goal.title} progress`}
        >
          <Text variant="caption" style={{ fontWeight: '700' }}>
            {goal.progress.percent}%
          </Text>
        </ProgressRing>
      </View>
      <View>
        <Text variant="bodyStrong" numberOfLines={2}>
          {goal.title}
        </Text>
        <Text variant="caption" tone="label">
          {when}
        </Text>
      </View>
    </Pressable>
  );
}

export function CategoryChip({ category }: { category: PublicCategory }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: colors.categoryTile[category.color],
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 3,
      }}
    >
      <Text variant="caption" style={{ fontWeight: '700' }}>
        {category.name}
      </Text>
    </View>
  );
}

function CheckCircle({ done }: { done: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: done ? colors.quest.done : 'transparent',
        borderWidth: done ? 0 : 2,
        borderColor: colors.border.subtle,
      }}
    >
      {done && <Icon name="check" size={16} color={colors.quest.doneIcon} />}
    </View>
  );
}

// The Goal detail's milestones: a timeline of ✓ done ("Done 2 Nov"), ★ the next one ("Due 28
// Nov · 3 tasks") and 🔒 the ones after. The circle ticks or unticks; the row opens it to edit.
export function MilestoneTimeline({
  goal,
  today,
  onToggle,
  onOpen,
}: {
  goal: PublicGoal;
  today: string;
  onToggle: (milestone: PublicMilestone, done: boolean) => void;
  onOpen: (milestone: PublicMilestone) => void;
}) {
  const { colors } = useTheme();
  const firstOpen = goal.milestones.findIndex((m) => m.completedAt === null);
  return (
    <Card style={{ gap: 0 }}>
      {goal.milestones.map((m, i) => {
        const done = m.completedAt !== null;
        const state = done ? 'done' : i === firstOpen ? 'next' : 'later';
        const when = done
          ? `Done ${dayMonth(m.completedAt!.slice(0, 10), today)}`
          : m.dueDate
            ? `Due ${dayMonth(m.dueDate, today)}`
            : 'No due date';
        const tasks =
          m.tasks.total > 0 ? ` · ${m.tasks.total} task${m.tasks.total === 1 ? '' : 's'}` : '';
        const last = i === goal.milestones.length - 1;
        return (
          <View key={m.id} style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ alignItems: 'center' }}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={`${m.title} done`}
                accessibilityState={{ checked: done }}
                hitSlop={9}
                onPress={() => onToggle(m, !done)}
                testID={`milestone-check-${i}`}
                style={({ pressed }) => ({
                  width: 28,
                  height: 28,
                  borderRadius: radius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    state === 'done'
                      ? colors.quest.done
                      : state === 'next'
                        ? colors.accent.fill
                        : colors.tile.neutral,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Icon
                  name={state === 'done' ? 'check' : state === 'next' ? 'star' : 'lock'}
                  size={15}
                  color={
                    state === 'done'
                      ? colors.quest.doneIcon
                      : state === 'next'
                        ? colors.text.onAccent
                        : colors.text.secondary
                  }
                />
              </Pressable>
              {!last && (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 18,
                    backgroundColor: colors.border.subtle,
                  }}
                />
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${m.title}, ${when}${tasks}`}
              accessibilityHint="Edit the milestone"
              onPress={() => onOpen(m)}
              style={({ pressed }) => ({
                flex: 1,
                paddingBottom: last ? 0 : spacing.md,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text variant="bodyStrong" tone={done ? 'secondary' : 'primary'}>
                {m.title}
              </Text>
              <Text variant="caption" tone="secondary">
                {when}
                {tasks}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </Card>
  );
}

// A task linked to the goal (the design's "Finish API auth module · Linked task · Today 10:00",
// with its +15 XP while it's still to do). Opens the task.
export function LinkedTaskCard({ task, today }: { task: PublicTask; today: string }) {
  const { colors } = useTheme();
  const done = task.status === 'DONE';
  const due = task.dueDate ? ` · ${formatDue(task.dueDate, today, task.dueTime, done).text}` : '';
  return (
    <Card style={{ padding: spacing.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${task.title}, linked task${due}${done ? ', done' : `, plus ${XP.TASK} XP`}`}
        accessibilityHint="Opens the task"
        onPress={() => router.push({ pathname: '/task-form', params: { id: task.id } })}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <IconTile
          icon={done ? 'check' : 'tasks'}
          tint={done ? colors.success.soft : colors.tile.lavender}
          size={44}
        />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" tone={done ? 'secondary' : 'primary'} numberOfLines={2}>
            {task.title}
          </Text>
          <Text variant="caption" tone="secondary">
            Linked task{due}
          </Text>
        </View>
        {done ? (
          <Text variant="caption" style={{ color: colors.success.default, fontWeight: '700' }}>
            Done
          </Text>
        ) : (
          <Badge text={`+${XP.TASK} XP`} />
        )}
      </Pressable>
    </Card>
  );
}
