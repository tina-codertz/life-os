import type { PublicCategory, PublicTask } from '@life-os/shared';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui';
import { MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import { formatDue } from './dates';

const PRIORITY_LABEL: Record<PublicTask['priority'], string | null> = {
  NONE: null,
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export interface TaskRowProps {
  task: PublicTask;
  category: PublicCategory | undefined;
  today: string;
  onToggle: (done: boolean) => void;
  onOpen: () => void;
  onDelete: () => void;
}

// One task: a check circle (its own button), then title and details (tap to edit). Screen
// readers also get "Complete" / "Delete" as actions on the row.
export function TaskRow({ task, category, today, onToggle, onOpen, onDelete }: TaskRowProps) {
  const { colors } = useTheme();
  const done = task.status === 'DONE';
  const due = task.dueDate ? formatDue(task.dueDate, today, task.dueTime, done) : null;
  const priority = PRIORITY_LABEL[task.priority];
  const details = [due?.text, priority && `${priority} priority`, category?.name].filter(Boolean);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.xs,
      }}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={task.title}
        accessibilityState={{ checked: done }}
        accessibilityHint={done ? 'Marks the task as not done' : 'Marks the task as done'}
        onPress={() => onToggle(!done)}
        style={{
          width: MIN_TOUCH_TARGET,
          height: MIN_TOUCH_TARGET,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radius.full,
            borderWidth: 2,
            borderColor: done ? colors.success.default : colors.text.secondary,
            backgroundColor: done ? colors.success.default : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {done && (
            <Text variant="caption" tone="onAccent" importantForAccessibility="no">
              ✓
            </Text>
          )}
        </View>
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
          gap: 2,
          paddingVertical: spacing.xs,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          tone={done ? 'secondary' : 'primary'}
          style={done ? { textDecorationLine: 'line-through' } : undefined}
        >
          {task.title}
        </Text>
        {details.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            {due && (
              <Text variant="caption" tone={due.overdue ? 'danger' : 'secondary'}>
                {due.text}
              </Text>
            )}
            {priority && (
              <Text
                variant="caption"
                tone={
                  task.priority === 'URGENT' || task.priority === 'HIGH' ? 'accent' : 'secondary'
                }
              >
                {due ? '· ' : ''}
                {priority} priority
              </Text>
            )}
            {category && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text variant="caption" tone="secondary">
                  {due || priority ? '· ' : ''}
                </Text>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: radius.full,
                    backgroundColor: colors.category[category.color],
                  }}
                />
                <Text variant="caption" tone="secondary">
                  {category.name}
                </Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
    </View>
  );
}
