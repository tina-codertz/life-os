import { createGoalSchema, type ProgressMode } from '@life-os/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChoiceGroup } from '@/components/choice-group';
import { Button, Chip, IconButton, ListGroup, Text, TextField, useToast } from '@/components/ui';
import { applyApiError, useZodForm } from '@/features/forms/zod-form';
import { useCreateGoal, useDeleteGoal, useGoal, useUpdateGoal } from '@/features/goals/queries';
import { localToday } from '@/features/tasks/dates';
import { DateRow } from '@/features/tasks/date-row';
import { useCategories } from '@/features/tasks/queries';
import { useMe } from '@/features/users/queries';
import { useTimezone } from '@/features/users/use-timezone';
import { spacing, useTheme } from '@/theme';

const MODES: { mode: ProgressMode; label: string }[] = [
  { mode: 'MILESTONES', label: 'Milestones' },
  { mode: 'TASKS', label: 'Linked tasks' },
  { mode: 'MANUAL', label: 'I’ll set it' },
];

// New goal (no id) or edit (?id=…), as a native sheet in the style of the design's New task
// (the design has no goal form). Editing adds complete / reopen and delete (FR-GOAL-005).
export default function GoalForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const today = localToday(useTimezone());
  const weekStartsOn = useMe().data?.settings.weekStartsOn ?? 1;
  const goal = useGoal(id).data;
  const categories = useCategories();
  const create = useCreateGoal();
  const update = useUpdateGoal(id ?? '');
  const remove = useDeleteGoal();
  const toast = useToast();

  const { control, handleSubmit, setError, reset, formState } = useZodForm(createGoalSchema, {
    title: '',
    description: null,
    categoryId: null,
    targetDate: null,
    progressMode: 'MILESTONES',
    manualProgress: null,
  });
  const mode = useWatch({ control, name: 'progressMode' });

  // Editing: fill the form once per goal (a later refresh mustn't wipe what's being typed).
  const filledFor = useRef<string | null>(null);
  useEffect(() => {
    if (goal && filledFor.current !== goal.id) {
      filledFor.current = goal.id;
      reset({
        title: goal.title,
        description: goal.description,
        categoryId: goal.categoryId,
        targetDate: goal.targetDate,
        progressMode: goal.progressMode,
        manualProgress: goal.manualProgress,
      });
    }
  }, [goal, reset]);

  const save = handleSubmit(async (values) => {
    try {
      if (id) await update.mutateAsync(values);
      else await create.mutateAsync(values);
      router.back();
    } catch (err) {
      applyApiError(err, setError, [
        'title',
        'description',
        'categoryId',
        'targetDate',
        'progressMode',
        'manualProgress',
      ]);
    }
  });

  const setStatus = async (status: 'ACTIVE' | 'COMPLETED') => {
    try {
      await update.mutateAsync({ status });
      router.back();
      if (status === 'COMPLETED') toast({ message: 'Goal completed. Well done!' });
    } catch {
      toast({ message: "Couldn't update the goal. Try again.", tone: 'error' });
    }
  };

  // There's no restore for goals yet, so deleting asks first. Its tasks stay.
  const confirmDelete = () =>
    Alert.alert('Delete this goal?', 'Its milestones go with it. Linked tasks stay in Tasks.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(id ?? '', {
            onSuccess: () => router.dismissTo('/goals'),
            onError: () =>
              toast({ message: "Couldn't delete the goal. Try again.", tone: 'error' }),
          }),
      },
    ]);

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
          {id ? 'Edit goal' : 'New goal'}
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
          name="targetDate"
          render={({ field, fieldState }) => (
            <DateRow
              title="Target date"
              removeLabel="Remove target date"
              icon="flag"
              value={field.value ?? null}
              onChange={field.onChange}
              today={today}
              weekStartsOn={weekStartsOn}
              error={fieldState.error?.message}
            />
          )}
        />
      </ListGroup>

      <Controller
        control={control}
        name="progressMode"
        render={({ field, fieldState }) => (
          <ChoiceGroup label="Progress counts" error={fieldState.error?.message}>
            {MODES.map((m) => (
              <Chip
                key={m.mode}
                label={m.label}
                selected={(field.value ?? 'MILESTONES') === m.mode}
                onPress={() => field.onChange(m.mode)}
              />
            ))}
          </ChoiceGroup>
        )}
      />
      {mode === 'MANUAL' && (
        <Controller
          control={control}
          name="manualProgress"
          render={({ field, fieldState }) => (
            <TextField
              label="Progress (%)"
              value={field.value == null ? '' : String(field.value)}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, '').slice(0, 3);
                field.onChange(digits === '' ? null : Number(digits));
              }}
              onBlur={field.onBlur}
              keyboardType="number-pad"
              error={fieldState.error?.message}
            />
          )}
        />
      )}

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
        title={id ? 'Save' : 'Add goal'}
        size="lg"
        icon="check"
        loading={formState.isSubmitting}
        onPress={() => void save()}
      />
      {id && goal && (
        <>
          {goal.status === 'COMPLETED' ? (
            <Button
              title="Mark as not done"
              variant="secondary"
              icon="refresh"
              onPress={() => void setStatus('ACTIVE')}
            />
          ) : (
            <Button
              title="Mark goal complete"
              variant="secondary"
              icon="trophy"
              onPress={() => void setStatus('COMPLETED')}
            />
          )}
          <Button title="Delete goal" variant="ghost" icon="trash" onPress={confirmDelete} />
        </>
      )}
    </ScrollView>
  );
}
