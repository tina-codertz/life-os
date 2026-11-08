import { createSubtaskSchema, MAX_SUBTASKS, type TaskDetail } from '@life-os/shared';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Icon, ListRow, Text, TextField } from '@/components/ui';
import { MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import { useAddSubtask, useRemoveSubtask, useToggleSubtask } from './queries';

// The design's Subtasks row ("Add ›", or "2 of 4"). A new task's subtasks are only typed here
// and created with the task; an existing task's are changed straight away.
export type SubtasksRowProps =
  | { mode: 'draft'; drafts: string[]; onChange: (drafts: string[]) => void }
  | { mode: 'live'; task: TaskDetail };

export function SubtasksRow(props: SubtasksRowProps) {
  return props.mode === 'draft' ? <DraftSubtasks {...props} /> : <LiveSubtasks task={props.task} />;
}

function DraftSubtasks({
  drafts,
  onChange,
}: {
  drafts: string[];
  onChange: (d: string[]) => void;
}) {
  return (
    <Frame value={drafts.length === 0 ? 'Add' : `${drafts.length}`}>
      {drafts.map((title, i) => (
        <SubtaskItem
          key={`${i}-${title}`}
          title={title}
          onRemove={() => onChange(drafts.filter((_, j) => j !== i))}
        />
      ))}
      <AddField count={drafts.length} onAdd={(title) => onChange([...drafts, title])} />
    </Frame>
  );
}

function LiveSubtasks({ task }: { task: TaskDetail }) {
  const add = useAddSubtask(task.id);
  const toggle = useToggleSubtask(task.id);
  const remove = useRemoveSubtask(task.id);
  const value = task.subtaskCount === 0 ? 'Add' : `${task.subtasksDone} of ${task.subtaskCount}`;
  return (
    <Frame value={value}>
      {task.subtasks.map((sub) => (
        <SubtaskItem
          key={sub.id}
          title={sub.title}
          done={sub.status === 'DONE'}
          onToggle={(done) => toggle.mutate({ id: sub.id, done })}
          onRemove={() => remove.mutate(sub.id)}
        />
      ))}
      <AddField
        count={task.subtasks.length}
        busy={add.isPending}
        onAdd={(title) => add.mutate(title)}
      />
    </Frame>
  );
}

function Frame({ value, children }: { value: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <ListRow icon="layers" tint={colors.tile.lavender} title="Subtasks" value={value}>
      <View style={{ gap: spacing.xs }}>{children}</View>
    </ListRow>
  );
}

// One step: a tick (when it can be ticked), its title, and a remove button.
function SubtaskItem({
  title,
  done,
  onToggle,
  onRemove,
}: {
  title: string;
  done?: boolean;
  onToggle?: (done: boolean) => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      {onToggle ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={title}
          accessibilityState={{ checked: done === true }}
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
              width: 22,
              height: 22,
              borderRadius: radius.full,
              borderWidth: 2,
              borderColor: done ? colors.ink.fill : colors.text.label,
              backgroundColor: done ? colors.ink.fill : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {done && <Icon name="check" size={14} color={colors.ink.text} />}
          </View>
        </Pressable>
      ) : (
        <View style={{ width: MIN_TOUCH_TARGET, alignItems: 'center' }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: radius.full,
              backgroundColor: colors.text.label,
            }}
          />
        </View>
      )}
      <Text
        variant="callout"
        style={{ flex: 1 }}
        {...(onToggle ? { importantForAccessibility: 'no' } : {})}
      >
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${title}`}
        onPress={onRemove}
        hitSlop={(MIN_TOUCH_TARGET - 28) / 2}
        style={({ pressed }) => ({
          width: 28,
          height: 28,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <Icon name="close" size={16} color={colors.text.secondary} />
      </Pressable>
    </View>
  );
}

// Type a step and press return (or Add). Checked with the shared schema, like the server.
function AddField({
  count,
  busy = false,
  onAdd,
}: {
  count: number;
  busy?: boolean;
  onAdd: (title: string) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | undefined>();
  const full = count >= MAX_SUBTASKS;

  function submit() {
    const parsed = createSubtaskSchema.safeParse({ title: text });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    onAdd(parsed.data.title);
    setText('');
    setError(undefined);
  }

  if (full) {
    return (
      <Text variant="caption" tone="secondary">
        A task can have up to {MAX_SUBTASKS} subtasks.
      </Text>
    );
  }
  return (
    <View style={{ gap: spacing.xs }}>
      <TextField
        label="New subtask"
        labelHidden
        placeholder="Add a subtask"
        value={text}
        onChangeText={(value) => {
          setText(value);
          setError(undefined);
        }}
        error={error}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={submit}
      />
      {text.trim().length > 0 && (
        <Button
          title="Add subtask"
          variant="ghost"
          size="sm"
          icon="add"
          loading={busy}
          onPress={submit}
          style={{ alignSelf: 'flex-start', paddingHorizontal: spacing.xs }}
        />
      )}
    </View>
  );
}
