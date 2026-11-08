import type { PublicCategory, PublicTask } from '@life-os/shared';
import { Pressable, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { radius, spacing, type ThemeColors, useTheme } from '@/theme';
import { parseRule, shortRule } from '@life-os/shared';
import { formatDue, repeatsLabel } from './dates';

const PRIORITY_LABEL: Record<PublicTask['priority'], string | null> = {
  NONE: null,
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

// The coloured badge on the right of a row. The word is always there; colour only adds to it.
const PRIORITY_BADGE: Record<
  Exclude<PublicTask['priority'], 'NONE'>,
  (c: ThemeColors) => { bg: string; color: string }
> = {
  LOW: (c) => ({ bg: c.tile.neutral, color: c.text.label }),
  MEDIUM: (c) => ({ bg: c.accent.soft, color: c.accent.onSoft }),
  HIGH: (c) => ({ bg: c.danger.soft, color: c.danger.text }),
  URGENT: (c) => ({ bg: c.danger.fill, color: c.text.onAccent }),
};

export interface TaskRowProps {
  task: PublicTask;
  category: PublicCategory | undefined;
  today: string;
  onToggle: (done: boolean) => void;
  onOpen: () => void;
  onDelete: () => void;
}

// One task as a white card (the design's task rows): a check tile in the category's pastel
// (its own button), then title and details (tap to edit), then the priority badge. Screen
// readers also get "Complete" / "Delete" as actions on the row.
export function TaskRow({ task, category, today, onToggle, onOpen, onDelete }: TaskRowProps) {
  const { colors, shadows } = useTheme();
  const done = task.status === 'DONE';
  const due = task.dueDate ? formatDue(task.dueDate, today, task.dueTime, done) : null;
  const priority = PRIORITY_LABEL[task.priority];
  const badge = task.priority === 'NONE' ? null : PRIORITY_BADGE[task.priority](colors);
  const subtasks =
    task.subtaskCount > 0 ? `${task.subtasksDone} of ${task.subtaskCount} subtasks` : null;
  const rule = task.recurrenceRule ? parseRule(task.recurrenceRule) : null;
  const repeats = rule ? repeatsLabel(shortRule(rule)) : null;
  const details = [
    due?.text,
    priority && `${priority} priority`,
    category?.name,
    repeats,
    subtasks,
  ].filter(Boolean);
  const meta = [due?.text, category?.name, repeats, subtasks].filter(Boolean).join(' · ');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.lg + 2,
        borderCurve: 'continuous',
        backgroundColor: colors.bg.surface,
        boxShadow: shadows.md,
      }}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={task.title}
        accessibilityState={{ checked: done }}
        accessibilityHint={done ? 'Marks the task as not done' : 'Marks the task as done'}
        onPress={() => onToggle(!done)}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: radius.md + 1,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: done
            ? colors.ink.fill
            : category
              ? colors.categoryTile[category.color]
              : colors.tile.neutral,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        })}
      >
        {done ? (
          <Icon name="check" size={20} color={colors.ink.text} />
        ) : (
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: radius.full,
              borderWidth: 2,
              borderColor: colors.text.label,
            }}
          />
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[task.title, ...details, done ? 'done' : null]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint="Opens the task to edit"
        accessibilityActions={[
          { name: 'toggle', label: done ? 'Mark not done' : 'Complete' },
          { name: 'delete', label: 'Delete' },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'toggle') onToggle(!done);
          if (event.nativeEvent.actionName === 'delete') onDelete();
        }}
        onPress={onOpen}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: 44,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="bodyStrong">{task.title}</Text>
          {meta.length > 0 && (
            <Text variant="caption" tone={due?.overdue ? 'danger' : 'secondary'}>
              {meta}
            </Text>
          )}
        </View>
        {/* A done task shows its status, not its priority (the design's green "Done" badge). */}
        {done ? (
          <Badge label="Done" bg={colors.success.soft} color={colors.success.default} />
        ) : (
          badge && priority && <Badge label={priority} bg={badge.bg} color={badge.color} />
        )}
      </Pressable>
    </View>
  );
}

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: spacing.xs + 1,
      }}
    >
      <Text variant="label" style={{ color, fontSize: 12, lineHeight: 16 }}>
        {label}
      </Text>
    </View>
  );
}
