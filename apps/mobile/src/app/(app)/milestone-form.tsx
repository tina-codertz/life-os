import { createMilestoneSchema } from '@life-os/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Controller } from 'react-hook-form';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton, ListGroup, Text, TextField, useToast } from '@/components/ui';
import { applyApiError, useZodForm } from '@/features/forms/zod-form';
import {
  useAddMilestone,
  useGoal,
  useRemoveMilestone,
  useUpdateMilestone,
} from '@/features/goals/queries';
import { localToday } from '@/features/tasks/dates';
import { DateRow } from '@/features/tasks/date-row';
import { useMe } from '@/features/users/queries';
import { useTimezone } from '@/features/users/use-timezone';
import { spacing } from '@/theme';

// Add a milestone to a goal (?goalId=…) or edit one (&id=…): a title and an optional due date
// (FR-GOAL-002). The design's "Add milestone" button opens it.
export default function MilestoneForm() {
  const { goalId = '', id } = useLocalSearchParams<{ goalId?: string; id?: string }>();
  const insets = useSafeAreaInsets();
  const today = localToday(useTimezone());
  const weekStartsOn = useMe().data?.settings.weekStartsOn ?? 1;
  const milestone = useGoal(goalId).data?.milestones.find((m) => m.id === id);
  const add = useAddMilestone(goalId);
  const update = useUpdateMilestone(goalId);
  const remove = useRemoveMilestone(goalId);
  const toast = useToast();

  const { control, handleSubmit, setError, reset, formState } = useZodForm(createMilestoneSchema, {
    title: '',
    dueDate: null,
  });

  const filledFor = useRef<string | null>(null);
  useEffect(() => {
    if (milestone && filledFor.current !== milestone.id) {
      filledFor.current = milestone.id;
      reset({ title: milestone.title, dueDate: milestone.dueDate });
    }
  }, [milestone, reset]);

  const save = handleSubmit(async (values) => {
    try {
      if (id) await update.mutateAsync({ id, ...values });
      else await add.mutateAsync(values);
      router.back();
    } catch (err) {
      applyApiError(err, setError, ['title', 'dueDate']);
    }
  });

  const confirmDelete = () =>
    Alert.alert('Delete this milestone?', 'Its tasks stay on the goal.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(id ?? '', {
            onSuccess: () => router.back(),
            onError: () =>
              toast({ message: "Couldn't delete the milestone. Try again.", tone: 'error' }),
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
          {id ? 'Edit milestone' : 'New milestone'}
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
              onChange={field.onChange}
              today={today}
              weekStartsOn={weekStartsOn}
              error={fieldState.error?.message}
            />
          )}
        />
      </ListGroup>

      {formState.errors.root?.['server'] && (
        <Text tone="danger" accessibilityRole="alert">
          {formState.errors.root['server'].message}
        </Text>
      )}

      <Button
        title={id ? 'Save' : 'Add milestone'}
        size="lg"
        icon="check"
        loading={formState.isSubmitting}
        onPress={() => void save()}
      />
      {id && milestone && (
        <Button title="Delete milestone" variant="ghost" icon="trash" onPress={confirmDelete} />
      )}
    </ScrollView>
  );
}
