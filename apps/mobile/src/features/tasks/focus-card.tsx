import {
  parseRule,
  type PublicCategory,
  type PublicGoal,
  type PublicTask,
  shortRule,
  XP,
} from '@life-os/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Icon, type IconName, IconTile, Text } from '@/components/ui';
import { Badge } from '@/features/history/parts';
import { radius, spacing, useTheme } from '@/theme';
import { categoryIcon } from './category-icon';
import { formatDue, formatTime, repeatsLabel } from './dates';
import { SwipeToComplete } from './swipe-to-complete';

export interface FocusCardProps {
  task: PublicTask;
  category: PublicCategory | undefined;
  // The goal it counts towards, if any (the design's "Goal · Ship MVP").
  goal?: Pick<PublicGoal, 'id' | 'title'> | undefined;
  today: string;
  onOpen: () => void;
  onComplete: () => void;
}

// The design's highlighted card at the top of Tasks: category and day with "+15 XP", the title
// large, its time, the Subtasks "2 of 4" and Goal "Ship MVP" pills, and "Swipe to complete".
export function FocusCard({ task, category, goal, today, onOpen, onComplete }: FocusCardProps) {
  const { colors, shadows } = useTheme();
  const day = task.dueDate ? formatDue(task.dueDate, today, null).text : null;
  const context = [category?.name, day].filter(Boolean).join(' · ');
  const rule = task.recurrenceRule ? parseRule(task.recurrenceRule) : null;
  const time = task.dueTime !== null ? formatTime(task.dueTime) : null;

  return (
    <View
      testID="focus-card"
      style={{
        backgroundColor: colors.bg.surface,
        boxShadow: shadows.md,
        borderRadius: radius.xl + 4,
        borderCurve: 'continuous',
        padding: spacing.lg,
        gap: spacing.md + 2,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[task.title, context, time, rule ? repeatsLabel(shortRule(rule)) : null]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint="Opens the task to edit"
        onPress={onOpen}
        style={({ pressed }) => ({ gap: spacing.sm + 2, opacity: pressed ? 0.7 : 1 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 }}>
          <IconTile
            icon={categoryIcon(category?.icon)}
            tint={category ? colors.categoryTile[category.color] : colors.tile.sky}
          />
          <Text variant="callout" tone="secondary" style={{ flex: 1 }}>
            {context}
          </Text>
          <Badge text={`+${XP.TASK} XP`} />
        </View>
        <Text variant="title1" style={{ marginTop: spacing.xs }}>
          {task.title}
        </Text>
        {(time || rule) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            {time && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="clock" size={17} color={colors.text.label} />
                <Text variant="callout" tone="label">
                  {time}
                </Text>
              </View>
            )}
            {rule && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="repeat" size={17} color={colors.text.label} />
                <Text variant="callout" tone="label">
                  {shortRule(rule)}
                </Text>
              </View>
            )}
          </View>
        )}
      </Pressable>

      {(task.subtaskCount > 0 || goal) && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {task.subtaskCount > 0 && (
            <Pill
              icon="layers"
              tint={colors.tile.lavender}
              title="Subtasks"
              detail={`${task.subtasksDone} of ${task.subtaskCount}`}
              hint="Opens the task to see its subtasks"
              onPress={onOpen}
            />
          )}
          {goal && (
            <Pill
              icon="flag"
              tint={colors.tile.lime}
              title="Goal"
              detail={goal.title}
              hint="Opens the goal"
              onPress={() => router.push({ pathname: '/goal/[id]', params: { id: goal.id } })}
            />
          )}
        </View>
      )}

      <SwipeToComplete label={`Complete ${task.title}`} onComplete={onComplete} />
    </View>
  );
}

// One of the card's two pills (Subtasks, Goal): a round icon, a bold title and a detail.
function Pill({
  icon,
  tint,
  title,
  detail,
  hint,
  onPress,
}: {
  icon: IconName;
  tint: string;
  title: string;
  detail: string;
  hint: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}`}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        maxWidth: '50%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm + 2,
        padding: spacing.sm,
        paddingRight: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: colors.bg.elevated,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <IconTile icon={icon} tint={tint} size={42} round />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="label">{title}</Text>
        <Text variant="caption" tone="secondary" style={{ fontSize: 12 }} numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </Pressable>
  );
}
