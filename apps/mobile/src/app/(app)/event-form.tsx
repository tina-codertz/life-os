import { addDays, CATEGORY_COLORS, createEventSchema, daysBetween } from '@life-os/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChoiceGroup } from '@/components/choice-group';
import { Button, Chip, IconButton, ListGroup, Text, TextField, useToast } from '@/components/ui';
import {
  useCreateEvent,
  useDeleteEvent,
  useEvent,
  useUpdateEvent,
} from '@/features/calendar/queries';
import { applyApiError, useZodForm } from '@/features/forms/zod-form';
import { localToday } from '@/features/tasks/dates';
import { DateRow } from '@/features/tasks/date-row';
import { DueTimeRow } from '@/features/tasks/due-time-row';
import { RepeatRow } from '@/features/tasks/repeat-row';
import { useMe } from '@/features/users/queries';
import { useTimezone } from '@/features/users/use-timezone';
import { spacing, useTheme } from '@/theme';

const COLOR_NAMES: Record<(typeof CATEGORY_COLORS)[number], string> = {
  violet: 'Violet',
  blue: 'Blue',
  teal: 'Teal',
  green: 'Green',
  amber: 'Amber',
  orange: 'Orange',
  red: 'Red',
  pink: 'Pink',
  gray: 'Grey',
};
const HOUR = 60;

// New event (?date=… from the Calendar's +) or edit (?id=…), in the style of the design's New
// task (the design has no event form; your choice). No times = all day. A change or delete
// applies to every repeat (MVP).
export default function EventForm() {
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const today = localToday(useTimezone());
  const weekStartsOn = useMe().data?.settings.weekStartsOn ?? 1;
  const event = useEvent(id).data;
  const create = useCreateEvent();
  const update = useUpdateEvent(id ?? '');
  const remove = useDeleteEvent();
  const toast = useToast();

  const { control, handleSubmit, setError, setValue, reset, formState } = useZodForm(
    createEventSchema,
    {
      title: '',
      color: 'orange',
      startDate: date ?? today,
      endDate: date ?? today,
      startTime: null,
      endTime: null,
      recurrenceRule: null,
      recurrenceUntil: null,
      location: null,
      notes: null,
    },
  );
  const [startDate, endDate, startTime, rule] = useWatch({
    control,
    name: ['startDate', 'endDate', 'startTime', 'recurrenceRule'],
  });

  // Editing: fill the form once per event (a later refresh mustn't wipe what's being typed).
  const filledFor = useRef<string | null>(null);
  useEffect(() => {
    if (event && filledFor.current !== event.id) {
      filledFor.current = event.id;
      reset({
        title: event.title,
        color: event.color,
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: event.startTime,
        endTime: event.endTime,
        recurrenceRule: event.recurrenceRule,
        recurrenceUntil: event.recurrenceUntil,
        location: event.location,
        notes: event.notes,
      });
    }
  }, [event, reset]);

  const save = handleSubmit(async (values) => {
    try {
      if (id) await update.mutateAsync(values);
      else await create.mutateAsync(values);
      router.back();
    } catch (err) {
      applyApiError(err, setError, [
        'title',
        'color',
        'startDate',
        'endDate',
        'startTime',
        'endTime',
        'recurrenceRule',
        'recurrenceUntil',
        'location',
        'notes',
      ]);
    }
  });

  const confirmDelete = () =>
    Alert.alert(
      'Delete this event?',
      event?.recurrenceRule ? 'Every repeat of it goes too.' : undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            remove.mutate(id ?? '', {
              onSuccess: () => router.back(),
              onError: () =>
                toast({ message: "Couldn't delete the event. Try again.", tone: 'error' }),
            }),
        },
      ],
    );

  // Moving the day keeps how many days the event lasts (an event made elsewhere may span some).
  const span = daysBetween(startDate, endDate ?? startDate);

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
          {id ? 'Edit event' : 'New event'}
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
          name="startDate"
          render={({ field, fieldState }) => (
            <DateRow
              title="Day"
              value={field.value}
              onChange={(day) => {
                if (!day) return;
                field.onChange(day);
                setValue('endDate', addDays(day, span));
              }}
              today={today}
              weekStartsOn={weekStartsOn}
              quickPicks
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="startTime"
          render={({ field, fieldState }) => (
            <DueTimeRow
              title="Starts"
              removeLabel="All day"
              value={field.value ?? null}
              onChange={(minutes) => {
                field.onChange(minutes);
                // Both times or neither: a start gets an end an hour later, all day clears both.
                if (minutes === null) setValue('endTime', null);
                else setValue('endTime', Math.min(minutes + HOUR, 23 * HOUR + 59));
              }}
              hasDate
              testID="start-time-row"
              pickerTestID="start-time-picker"
              error={fieldState.error?.message}
            />
          )}
        />
        {startTime != null && (
          <Controller
            control={control}
            name="endTime"
            render={({ field, fieldState }) => (
              <DueTimeRow
                title="Ends"
                removeLabel={null}
                value={field.value ?? null}
                onChange={field.onChange}
                hasDate
                testID="end-time-row"
                pickerTestID="end-time-picker"
                error={fieldState.error?.message}
              />
            )}
          />
        )}
        <Controller
          control={control}
          name="recurrenceRule"
          render={({ field, fieldState }) => (
            <RepeatRow
              value={field.value ?? null}
              onChange={(next) => {
                field.onChange(next);
                if (next === null) setValue('recurrenceUntil', null);
              }}
              dueDate={startDate}
              error={fieldState.error?.message}
            />
          )}
        />
        {rule != null && (
          <Controller
            control={control}
            name="recurrenceUntil"
            render={({ field, fieldState }) => (
              <DateRow
                title="Stop repeating"
                removeLabel="Keep repeating"
                icon="flag"
                value={field.value ?? null}
                onChange={field.onChange}
                today={today}
                weekStartsOn={weekStartsOn}
                error={fieldState.error?.message}
              />
            )}
          />
        )}
      </ListGroup>

      <Controller
        control={control}
        name="color"
        render={({ field, fieldState }) => (
          <ChoiceGroup label="Colour" error={fieldState.error?.message}>
            {CATEGORY_COLORS.map((c) => (
              <Chip
                key={c}
                label={COLOR_NAMES[c]}
                tint={colors.categoryTile[c]}
                dotColor={colors.category[c]}
                selected={(field.value ?? 'orange') === c}
                onPress={() => field.onChange(c)}
              />
            ))}
          </ChoiceGroup>
        )}
      />

      <Controller
        control={control}
        name="location"
        render={({ field, fieldState }) => (
          <TextField
            label="Place"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="notes"
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
        title={id ? 'Save' : 'Add event'}
        size="lg"
        icon="check"
        loading={formState.isSubmitting}
        onPress={() => void save()}
      />
      {id && event && (
        <Button title="Delete event" variant="ghost" icon="trash" onPress={confirmDelete} />
      )}
    </ScrollView>
  );
}
