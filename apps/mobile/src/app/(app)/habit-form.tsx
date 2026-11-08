import {
  CATEGORY_COLORS,
  type CategoryColor,
  type CreateHabitInput,
  createHabitSchema,
  HABIT_GOAL_DAYS,
  type HabitSchedule,
} from '@life-os/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { type Control, Controller, useWatch } from 'react-hook-form';
import type { z } from 'zod';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, IconButton, ListGroup, ListRow, Text, TextField } from '@/components/ui';
import { applyApiError, useZodForm } from '@/features/forms/zod-form';
import { HABIT_ICONS, scheduleLabel } from '@/features/habits/quest';
import {
  useArchiveHabit,
  useCreateHabit,
  useDeleteHabit,
  useHabits,
  useUpdateHabit,
} from '@/features/habits/queries';
import { spacing, useTheme } from '@/theme';

const COLOR_NAMES: Record<CategoryColor, string> = {
  violet: 'Lavender',
  blue: 'Sky',
  teal: 'Mint',
  green: 'Lime',
  amber: 'Sun',
  orange: 'Peach',
  red: 'Rose',
  pink: 'Pink',
  gray: 'Grey',
};
type HabitFormValues = z.input<typeof createHabitSchema>;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Monday first, as the design's calendars are.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// New habit (no id) or edit (?id=…), as a native sheet in the style of the design's New task
// (the design has no habit form of its own).
export default function HabitForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const habits = useHabits();
  const habit = habits.data?.find((h) => h.id === id);
  const create = useCreateHabit();
  const update = useUpdateHabit(id ?? '');
  const archive = useArchiveHabit();
  const remove = useDeleteHabit();

  const { control, handleSubmit, setError, reset, formState } = useZodForm(createHabitSchema, {
    name: '',
    icon: 'book-open',
    color: 'violet',
    targetCount: 1,
    unit: null,
    goalDays: 21,
    schedule: { frequency: 'DAILY' },
  });

  // Editing: fill the form once per habit (a later refresh mustn't wipe what's being typed).
  const filledFor = useRef<string | null>(null);
  useEffect(() => {
    if (habit && filledFor.current !== habit.id) {
      filledFor.current = habit.id;
      reset({
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        targetCount: habit.targetCount,
        unit: habit.unit,
        goalDays: habit.goalDays,
        schedule: habit.schedule,
      });
    }
  }, [habit, reset]);

  const save = handleSubmit(async (values) => {
    try {
      if (id && habit) {
        const { startDate: _start, schedule, ...rest } = values;
        // A schedule is only sent when it changed: each change is a new version from today.
        const changed = JSON.stringify(schedule) !== JSON.stringify(habit.schedule);
        await update.mutateAsync({ ...rest, ...(changed ? { schedule } : {}) });
      } else {
        await create.mutateAsync(values);
      }
      router.back();
    } catch (err) {
      applyApiError(err, setError, ['name', 'icon', 'color', 'targetCount', 'unit', 'goalDays']);
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
          {id ? 'Edit habit' : 'New habit'}
        </Text>
        <IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label="Name"
            placeholder="Read 20 min"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="icon"
        render={({ field }) => (
          <Choices label="Icon">
            {HABIT_ICONS.map((i) => (
              <Chip
                key={i.name}
                label={i.label}
                icon={i.glyph}
                selected={field.value === i.name}
                onPress={() => field.onChange(i.name)}
              />
            ))}
          </Choices>
        )}
      />

      <Controller
        control={control}
        name="color"
        render={({ field }) => (
          <Choices label="Colour">
            {CATEGORY_COLORS.map((c) => (
              <Chip
                key={c}
                label={COLOR_NAMES[c]}
                tint={colors.categoryTile[c]}
                dotColor={colors.category[c]}
                selected={field.value === c}
                onPress={() => field.onChange(c)}
              />
            ))}
          </Choices>
        )}
      />

      <ListGroup>
        <Controller
          control={control}
          name="schedule"
          render={({ field, fieldState }) => (
            <ScheduleRow
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <TargetRow control={control} />
        <Controller
          control={control}
          name="goalDays"
          render={({ field }) => (
            <ListRow
              icon="flag"
              tint={colors.tile.lavender}
              title="Challenge"
              value={`${field.value ?? 21} days`}
            >
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Challenge length"
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
              >
                {HABIT_GOAL_DAYS.map((d) => (
                  <Chip
                    key={d}
                    label={`${d} days`}
                    selected={(field.value ?? 21) === d}
                    onPress={() => field.onChange(d)}
                  />
                ))}
              </View>
            </ListRow>
          )}
        />
      </ListGroup>

      {formState.errors.root?.['server'] && (
        <Text tone="danger" accessibilityRole="alert">
          {formState.errors.root['server'].message}
        </Text>
      )}

      <Button
        title={id ? 'Save' : 'Create habit'}
        size="lg"
        icon="check"
        loading={formState.isSubmitting}
        onPress={() => void save()}
      />
      {id && habit && (
        <>
          <Button
            title="Archive habit"
            variant="secondary"
            icon="archive"
            onPress={() => {
              archive.mutate({ id: habit.id, archived: true });
              router.back();
            }}
          />
          <Button
            title="Delete habit"
            variant="ghost"
            icon="trash"
            onPress={() =>
              Alert.alert('Delete this habit?', 'Its check-ins go too. Archive it to keep them.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    remove.mutate(habit.id);
                    router.back();
                  },
                },
              ])
            }
          />
        </>
      )}
    </ScrollView>
  );
}

function Choices({ label, children }: { label: string; children: ReactNode }) {
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
    </View>
  );
}

// How often: every day, some weekdays, or N times a week.
function ScheduleRow({
  value,
  onChange,
  error,
}: {
  value: HabitSchedule;
  onChange: (schedule: HabitSchedule) => void;
  error?: string | undefined;
}) {
  const { colors } = useTheme();
  const weekdays = value.frequency === 'WEEKLY_DAYS' ? value.weekdays : [];
  return (
    <ListRow icon="repeat" tint={colors.tile.peach} title="How often" value={scheduleLabel(value)}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="How often"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
      >
        <Chip
          label="Daily"
          selected={value.frequency === 'DAILY'}
          onPress={() => onChange({ frequency: 'DAILY' })}
        />
        <Chip
          label="Some days"
          selected={value.frequency === 'WEEKLY_DAYS'}
          onPress={() => onChange({ frequency: 'WEEKLY_DAYS', weekdays: [1, 3, 5] })}
        />
        <Chip
          label="Times a week"
          selected={value.frequency === 'TIMES_PER_WEEK'}
          onPress={() => onChange({ frequency: 'TIMES_PER_WEEK', timesPerWeek: 3 })}
        />
      </View>
      {value.frequency === 'WEEKLY_DAYS' && (
        <View
          accessibilityLabel="On these days"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 }}
        >
          {DAY_ORDER.map((d) => {
            const on = weekdays.includes(d);
            return (
              <Chip
                key={d}
                mode="multiple"
                label={DAYS[d] ?? ''}
                selected={on}
                onPress={() => {
                  // At least one day stays chosen.
                  if (on && weekdays.length === 1) return;
                  const next = on ? weekdays.filter((x) => x !== d) : [...weekdays, d];
                  // The shared schema sorts the days when the form is saved.
                  onChange({ frequency: 'WEEKLY_DAYS', weekdays: next });
                }}
              />
            );
          })}
        </View>
      )}
      {value.frequency === 'TIMES_PER_WEEK' && (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Times a week"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 }}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <Chip
              key={n}
              label={`${n}×`}
              selected={value.timesPerWeek === n}
              onPress={() => onChange({ frequency: 'TIMES_PER_WEEK', timesPerWeek: n })}
            />
          ))}
        </View>
      )}
      {error && (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      )}
    </ListRow>
  );
}

// FR-HAB-009: how many a day counts as done (e.g. 8 glasses).
function TargetRow({ control }: { control: Control<HabitFormValues, unknown, CreateHabitInput> }) {
  const { colors } = useTheme();
  const target = useWatch({ control, name: 'targetCount' }) ?? 1;
  const unit = useWatch({ control, name: 'unit' });
  const [text, setText] = useState(String(target));
  return (
    <ListRow
      icon="target"
      tint={colors.tile.lime}
      title="Target"
      value={target === 1 ? 'Once a day' : `${target} ${unit || 'times'} a day`}
    >
      <Controller
        control={control}
        name="targetCount"
        render={({ field, fieldState }) => (
          <TextField
            label="How many a day?"
            keyboardType="number-pad"
            value={text}
            onChangeText={(next) => {
              setText(next);
              field.onChange(next === '' ? undefined : Number(next));
            }}
            error={fieldState.error?.message}
          />
        )}
      />
      {target > 1 && (
        <Controller
          control={control}
          name="unit"
          render={({ field }) => (
            <TextField
              label="Of what?"
              placeholder="glasses"
              value={field.value ?? ''}
              onChangeText={(next) => field.onChange(next || null)}
            />
          )}
        />
      )}
    </ListRow>
  );
}
