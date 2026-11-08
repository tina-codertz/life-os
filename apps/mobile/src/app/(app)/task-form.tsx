import { createTaskSchema, PRIORITIES, type Priority } from '@life-os/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, IconButton, ListGroup, ListRow, Text, TextField } from '@/components/ui';
import { applyApiError, useZodForm } from '@/features/forms/zod-form';
import { addDays, formatDue, localToday } from '@/features/tasks/dates';
import { MonthCalendar } from '@/features/tasks/month-calendar';
import {
  useCategories,
  useCreateTask,
  useDeleteTask,
  useTask,
  useUpdateTask,
} from '@/features/tasks/queries';
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

      <Controller
        control={control}
        name="dueDate"
        render={({ field, fieldState }) => (
          <DueDatePicker
            value={field.value ?? null}
            onChange={field.onChange}
            today={today}
            weekStartsOn={weekStartsOn}
            error={fieldState.error?.message}
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

// A label over a wrapping row of chips, announced as one group of choices.
function ChoiceGroup({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="label">
        {label}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
      >
        {children}
      </View>
      {error && (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      )}
    </View>
  );
}

// Due date: one tap for Today or Tomorrow; any other day from the month calendar.
function DueDatePicker({
  value,
  onChange,
  today,
  weekStartsOn,
  error,
}: {
  value: string | null;
  onChange: (day: string | null) => void;
  today: string;
  weekStartsOn: number;
  error?: string | undefined;
}) {
  const { colors } = useTheme();
  const tomorrow = addDays(today, 1);
  const otherDay = value !== null && value !== today && value !== tomorrow;
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <ListGroup>
      <ListRow
        icon="calendar"
        tint={colors.tile.sky}
        title="Due date"
        value={value ? formatDue(value, today).text : 'None'}
      >
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Due date"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
        >
          <Chip
            label="Today"
            selected={value === today}
            onPress={() => {
              onChange(today);
              setCalendarOpen(false);
            }}
          />
          <Chip
            label="Tomorrow"
            selected={value === tomorrow}
            onPress={() => {
              onChange(tomorrow);
              setCalendarOpen(false);
            }}
          />
          <Chip
            label={otherDay ? formatDue(value, today).text : 'Pick a date'}
            icon="calendar"
            selected={otherDay || calendarOpen}
            onPress={() => setCalendarOpen((open) => !open)}
          />
        </View>
        {calendarOpen && (
          <MonthCalendar
            value={value}
            today={today}
            weekStartsOn={weekStartsOn}
            onChange={(day) => {
              onChange(day);
              setCalendarOpen(false);
            }}
          />
        )}
        {value && (
          <Button
            title="Remove due date"
            variant="ghost"
            size="sm"
            onPress={() => {
              onChange(null);
              setCalendarOpen(false);
            }}
            style={{ alignSelf: 'flex-start', paddingHorizontal: spacing.xs }}
          />
        )}
        {error && (
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        )}
      </ListRow>
    </ListGroup>
  );
}
