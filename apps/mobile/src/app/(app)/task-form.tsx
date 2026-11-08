import { createTaskSchema, PRIORITIES, type Priority } from '@life-os/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import { Button, Chip, Text, TextField } from '@/components/ui';
import { applyApiError, useZodForm } from '@/features/forms/zod-form';
import { addDays, formatDue, localToday } from '@/features/tasks/dates';
import {
  useCategories,
  useCreateTask,
  useDeleteTask,
  useTask,
  useUpdateTask,
} from '@/features/tasks/queries';
import { useTimezone } from '@/features/users/use-timezone';
import { spacing, useTheme } from '@/theme';

const PRIORITY_LABEL: Record<Priority, string> = {
  NONE: 'None',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

// New task (no id) or edit (?id=…), as a native form sheet (sheetOptions in the (app) layout).
export default function TaskForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const today = localToday(useTimezone());
  const existing = useTask(id);
  const categories = useCategories();
  const create = useCreateTask();
  const update = useUpdateTask(id ?? '');
  const remove = useDeleteTask();

  const { control, handleSubmit, setError, reset, formState } = useZodForm(createTaskSchema, {
    title: '',
    description: '',
    priority: 'NONE',
    categoryId: null,
    dueDate: null,
    dueTime: null,
  });

  // Editing: fill the form once the task has loaded.
  const task = existing.data;
  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description ?? '',
        priority: task.priority,
        categoryId: task.categoryId,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
      });
    }
  }, [task, reset]);

  const save = handleSubmit(async (values) => {
    try {
      if (id) await update.mutateAsync(values);
      else await create.mutateAsync(values);
      router.back();
    } catch (err) {
      applyApiError(err, setError, [
        'title',
        'description',
        'priority',
        'categoryId',
        'dueDate',
        'dueTime',
      ]);
    }
  });

  const DUE_CHOICES = [
    { label: 'No date', value: null },
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: 'Next week', value: addDays(today, 7) },
  ];

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
    >
      <Text variant="title2" accessibilityRole="header">
        {id ? 'Edit task' : 'New task'}
      </Text>

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

      <Controller
        control={control}
        name="dueDate"
        render={({ field, fieldState }) => (
          <View style={{ gap: spacing.sm }}>
            <Text variant="callout" tone="secondary">
              Due{field.value ? `: ${formatDue(field.value, today).text}` : ''}
            </Text>
            <View
              accessibilityRole="radiogroup"
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
            >
              {DUE_CHOICES.map((choice) => (
                <Chip
                  key={choice.label}
                  label={choice.label}
                  selected={(field.value ?? null) === choice.value}
                  onPress={() => field.onChange(choice.value)}
                />
              ))}
            </View>
            {fieldState.error && (
              <Text variant="caption" tone="danger">
                {fieldState.error.message}
              </Text>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="priority"
        render={({ field }) => (
          <View style={{ gap: spacing.sm }}>
            <Text variant="callout" tone="secondary">
              Priority
            </Text>
            <View
              accessibilityRole="radiogroup"
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
            >
              {PRIORITIES.map((p) => (
                <Chip
                  key={p}
                  label={PRIORITY_LABEL[p]}
                  selected={(field.value ?? 'NONE') === p}
                  onPress={() => field.onChange(p)}
                />
              ))}
            </View>
          </View>
        )}
      />

      {(categories.data?.length ?? 0) > 0 && (
        <Controller
          control={control}
          name="categoryId"
          render={({ field, fieldState }) => (
            <View style={{ gap: spacing.sm }}>
              <Text variant="callout" tone="secondary">
                Category
              </Text>
              <View
                accessibilityRole="radiogroup"
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
              >
                <Chip
                  label="No category"
                  selected={!field.value}
                  onPress={() => field.onChange(null)}
                />
                {categories.data?.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    dotColor={colors.category[c.color]}
                    selected={field.value === c.id}
                    onPress={() => field.onChange(c.id)}
                  />
                ))}
              </View>
              {fieldState.error && (
                <Text variant="caption" tone="danger">
                  {fieldState.error.message}
                </Text>
              )}
            </View>
          )}
        />
      )}

      {formState.errors.root?.['server'] && (
        <Text tone="danger" accessibilityRole="alert">
          {formState.errors.root['server'].message}
        </Text>
      )}

      <Button
        title={id ? 'Save' : 'Add task'}
        loading={formState.isSubmitting}
        onPress={() => void save()}
      />
      {id && task && (
        <Button
          title="Delete task"
          variant="destructive"
          onPress={() => {
            remove.mutate(task);
            router.back();
          }}
        />
      )}
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}
