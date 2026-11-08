import { parseRule, type PublicCategory, type PublicTask, shortRule } from '@life-os/shared';
import { Pressable, View } from 'react-native';
import { Icon, IconTile, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';
import { categoryIcon } from './category-icon';
import { formatDue, formatTime, repeatsLabel } from './dates';
import { SwipeToComplete } from './swipe-to-complete';

export interface FocusCardProps {
  task: PublicTask;
  category: PublicCategory | undefined;
  today: string;
  onOpen: () => void;
  onComplete: () => void;
}

// The design's highlighted card at the top of Tasks: category and day, the title large, its
// time, a Subtasks "2 of 4" pill, and "Swipe to complete". (The design's Goal pill and XP badge
// come with Goals and gamification.)
export function FocusCard({ task, category, today, onOpen, onComplete }: FocusCardProps) {
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

      {task.subtaskCount > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Subtasks, ${task.subtasksDone} of ${task.subtaskCount}`}
          accessibilityHint="Opens the task to see its subtasks"
          onPress={onOpen}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            minWidth: '48%',
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
          <IconTile icon="layers" tint={colors.tile.lavender} size={42} round />
          <View>
            <Text variant="label">Subtasks</Text>
            <Text variant="caption" tone="secondary" style={{ fontSize: 12 }}>
              {task.subtasksDone} of {task.subtaskCount}
            </Text>
          </View>
        </Pressable>
      )}

      <SwipeToComplete label={`Complete ${task.title}`} onComplete={onComplete} />
    </View>
  );
}
