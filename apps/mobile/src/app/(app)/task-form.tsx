import { createTaskSchema, PRIORITIES, type Priority } from '@life-os/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Controller, useWatch } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, IconButton, ListGroup, Text, TextField, useToast } from '@/components/ui';
import { applyApiError, useZodForm } from '@/features/forms/zod-form';
import { GoalRow } from '@/features/goals/goal-row';
import { ChoiceGroup } from '@/components/choice-group';
import { localToday } from '@/features/tasks/dates';
import { DateRow } from '@/features/tasks/date-row';
import { DueTimeRow } from '@/features/tasks/due-time-row';
import { DurationRow } from '@/features/tasks/duration-row';
import { RepeatRow } from '@/features/tasks/repeat-row';
import {
  createSubtasks,
  taskKeys,
  useCategories,
  useCreateTask,
  useDeleteTask,
  useTask,
  useUpdateTask,
} from '@/features/tasks/queries';
import { SubtasksRow } from '@/features/tasks/subtasks-row';
import { useMe } from '@/features/users/queries';
import { useTimezone } from '@/features/users/use-timezone';
import { spacing, type ThemeColors, useTheme } from '@/theme';

const PRIORITY_LABEL: Record<Priority, string> = {
  NONE: 'None',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

// Each priority chip's pastel when not selected (the design's Low / Medium / High chips).
const PRIORITY_TINT: Record<Priority, (c: ThemeColors) => string> = {
  NONE: (c) => c.bg.subtle,
  LOW: (c) => c.tile.neutral,
  MEDIUM: (c) => c.tile.lavender,
  HIGH: (c) => c.tile.rose,
  URGENT: (c) => c.tile.peach,
};

// New task (no id) or edit (?id=…), as a native form sheet (sheetOptions in the (app) layout),
// laid out like the design's New task sheet.
export default function TaskForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const today = localToday(useTimezone());
  const weekStartsOn = useMe().data?.settings.weekStartsOn ?? 1;
  const existing = useTask(id);
  const categories = useCategories();
  const create = useCreateTask();
  const queryClient = useQueryClient();
  const toast = useToast();
  // A new task's subtasks, typed before the task exists (created right after it).
  const [draftSubtasks, setDraftSubtasks] = useState<string[]>([]);
  const update = useUpdateTask(id ?? '');
  const remove = useDeleteTask();

  const { control, handleSubmit, setError, setValue, reset, formState } = useZodForm(
    createTaskSchema,
    {
      title: '',
      description: '',
      priority: 'NONE',
      categoryId: null,
      dueDate: null,
      dueTime: null,
      durationMinutes: null,
      recurrenceRule: null,
    },
  );

  const dueDate = useWatch({ control, name: 'dueDate' });
  const dueTime = useWatch({ control, name: 'dueTime' });
  // A new task leaves these out unless one is picked; editing fills them from the task.
  const goalId = useWatch({ control, name: 'goalId' });
  const milestoneId = useWatch({ control, name: 'milestoneId' });

  // Editing: fill the form once the task has loaded.
  // Once per task: the cached task is replaced whenever a subtask is ticked or the list
  // refreshes, and resetting then would throw away what the user has typed but not saved.
  const task = existing.data;
  const filledFor = useRef<string | null>(null);
  useEffect(() => {
    if (task && filledFor.current !== task.id) {
      filledFor.current = task.id;
      reset({
        title: task.title,
        description: task.description ?? '',
        priority: task.priority,
        categoryId: task.categoryId,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        durationMinutes: task.durationMinutes,
        recurrenceRule: task.recurrenceRule,
        goalId: task.goalId,
        milestoneId: task.milestoneId,
      });
    }
  }, [task, reset]);

  const save = handleSubmit(async (values) => {
    try {
      if (id) {
        await update.mutateAsync(values);
      } else {
        const created = await create.mutateAsync(values);
        if (draftSubtasks.length > 0) {
          // The task exists now; a failed subtask shouldn't undo it or keep the sheet open.
          await createSubtasks(created.id, draftSubtasks).catch(() =>
            toast({
              message: "The task was added, but some subtasks weren't. Open it to add them.",
              tone: 'error',
            }),
          );
          void queryClient.invalidateQueries({ queryKey: taskKeys.all });
        }
      }
      router.back();
    } catch (err) {
      applyApiError(err, setError, [
        'title',
        'description',
        'priority',
        'categoryId',
        'dueDate',
        'dueTime',
        'durationMinutes',
        'recurrenceRule',
        'goalId',
        'milestoneId',
      ]);
    }
  });

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{
        paddingTop: spacing.xl,
        paddingBottom: insets.bottom + spacing.xl,
        paddingHorizontal: spacing.gutter,
        gap: spacing.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text variant="title1" accessibilityRole="header" style={{ flex: 1 }}>
          {id ? 'Edit task' : 'New task'}
        </Text>
        <IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />
      </View>

      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <TextField
            label="Title"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            returnKeyType="done"
          />
        )}
      />

      <Controller
        control={control}
        name="priority"
        render={({ field }) => (
          <ChoiceGroup label="Priority">
            {PRIORITIES.map((p) => (
              <Chip
                key={p}
                label={PRIORITY_LABEL[p]}
                tint={PRIORITY_TINT[p](colors)}
                selected={(field.value ?? 'NONE') === p}
                onPress={() => field.onChange(p)}
              />
            ))}
          </ChoiceGroup>
        )}
      />

      {(categories.data?.length ?? 0) > 0 && (
        <Controller
          control={control}
          name="categoryId"
          render={({ field, fieldState }) => (
            <ChoiceGroup label="Category" error={fieldState.error?.message}>
              <Chip
                label="No category"
                selected={!field.value}
                onPress={() => field.onChange(null)}
              />
              {categories.data?.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  tint={colors.categoryTile[c.color]}
                  dotColor={colors.category[c.color]}
                  selected={field.value === c.id}
                  onPress={() => field.onChange(c.id)}
                />
              ))}
            </ChoiceGroup>
          )}
        />
      )}

      <ListGroup>
        <Controller
          control={control}
          name="dueDate"
          render={({ field, fieldState }) => (
            <DateRow
              title="Due date"
              removeLabel="Remove due date"
              quickPicks
              value={field.value ?? null}
              onChange={(day) => {
                field.onChange(day);
                // No date, no time, length or repeat (the API refuses them on their own).
                if (day === null) {
                  setValue('dueTime', null);
                  setValue('durationMinutes', null);
                  setValue('recurrenceRule', null);
                }
              }}
              today={today}
              weekStartsOn={weekStartsOn}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="dueTime"
          render={({ field, fieldState }) => (
            <DueTimeRow
              value={field.value ?? null}
              onChange={(minutes) => {
                field.onChange(minutes);
                if (minutes === null) setValue('durationMinutes', null);
              }}
              hasDate={dueDate != null}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="durationMinutes"
          render={({ field, fieldState }) => (
            <DurationRow
              value={field.value ?? null}
              onChange={field.onChange}
              hasTime={dueTime != null}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="recurrenceRule"
          render={({ field, fieldState }) => (
            <RepeatRow
              value={field.value ?? null}
              onChange={field.onChange}
              dueDate={dueDate ?? null}
              error={fieldState.error?.message}
            />
          )}
        />
        {/* A subtask counts towards a goal through its task. */}
        {!task?.parentId && (
          <GoalRow
            goalId={goalId ?? null}
            milestoneId={milestoneId ?? null}
            onChange={(link) => {
              setValue('goalId', link.goalId, { shouldDirty: true });
              setValue('milestoneId', link.milestoneId, { shouldDirty: true });
            }}
            error={formState.errors.goalId?.message ?? formState.errors.milestoneId?.message}
          />
        )}
        {id ? (
          task && <SubtasksRow mode="live" task={task} />
        ) : (
          <SubtasksRow mode="draft" drafts={draftSubtasks} onChange={setDraftSubtasks} />
        )}
      </ListGroup>

      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <TextField
            label="Notes"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            multiline
          />
        )}
      />

      {formState.errors.root?.['server'] && (
        <Text tone="danger" accessibilityRole="alert">
          {formState.errors.root['server'].message}
        </Text>
      )}

      <Button
        title={id ? 'Save' : 'Add task'}
        size="lg"
        icon="check"
        loading={formState.isSubmitting}
        onPress={() => void save()}
      />
      {id && task && (
        <Button
          title="Delete task"
          variant="ghost"
          icon="trash"
          onPress={() => {
            remove.mutate(task);
            router.back();
          }}
        />
      )}
    </ScrollView>
  );
}
