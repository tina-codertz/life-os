import {
  describeRule,
  formatRule,
  MAX_REPEAT_INTERVAL,
  parseRule,
  type Recurrence,
  RRULE_WEEKDAYS,
  type RRuleWeekday,
  weekdayOf,
} from '@life-os/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { Chip, ListRow, Text, TextField } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

type Kind = 'NEVER' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'MONTHLY' | 'EVERY';

const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'NEVER', label: 'Never' },
  { kind: 'DAILY', label: 'Daily' },
  { kind: 'WEEKDAYS', label: 'Weekdays' },
  { kind: 'WEEKLY', label: 'Weekly' },
  { kind: 'MONTHLY', label: 'Monthly' },
  { kind: 'EVERY', label: 'Every few days' },
];

const WORKWEEK: RRuleWeekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];
const DAY_LABEL: Record<RRuleWeekday, string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
};

function kindOf(rule: Recurrence | null): Kind {
  if (!rule) return 'NEVER';
  if (rule.freq === 'DAILY') return rule.interval === 1 ? 'DAILY' : 'EVERY';
  if (rule.freq === 'MONTHLY') return 'MONTHLY';
  return rule.days.join() === WORKWEEK.join() ? 'WEEKDAYS' : 'WEEKLY';
}

export interface RepeatRowProps {
  value: string | null; // an RRULE, e.g. "FREQ=WEEKLY;BYDAY=MO"
  onChange: (rule: string | null) => void;
  // The due date: a repeat needs one, and Weekly / Monthly start from its weekday / day.
  dueDate: string | null;
  error?: string | undefined;
}

// The design's Repeat row (FR-TASK-006). Tapping it shows the choices as chips, like the
// due-date ones; Weekly adds weekday chips and "Every few days" a number.
export function RepeatRow({ value, onChange, dueDate, error }: RepeatRowProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const rule = value ? parseRule(value) : null;
  const kind = kindOf(rule);
  const set = (next: Recurrence | null) => onChange(next ? formatRule(next) : null);

  function choose(next: Kind) {
    if (!dueDate) return;
    switch (next) {
      case 'NEVER':
        return set(null);
      case 'DAILY':
        return set({ freq: 'DAILY', interval: 1 });
      case 'WEEKDAYS':
        return set({ freq: 'WEEKLY', days: WORKWEEK });
      case 'WEEKLY':
        return set({ freq: 'WEEKLY', days: [weekdayOf(dueDate)] });
      case 'MONTHLY':
        return set({ freq: 'MONTHLY', day: Number(dueDate.slice(8)) });
      case 'EVERY':
        return set({ freq: 'DAILY', interval: 2 });
    }
  }

  return (
    <ListRow
      icon="repeat"
      tint={colors.tile.peach}
      title="Repeat"
      value={!dueDate ? 'Pick a date first' : rule ? describeRule(rule) : 'Never'}
      {...(dueDate
        ? { onPress: () => setOpen((o) => !o), accessibilityHint: 'Shows how often it repeats' }
        : {})}
      testID="repeat-row"
    >
      {dueDate && open && (
        <View style={{ gap: spacing.sm }}>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Repeat"
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
          >
            {KINDS.map((k) => (
              <Chip
                key={k.kind}
                label={k.label}
                selected={kind === k.kind}
                onPress={() => choose(k.kind)}
              />
            ))}
          </View>
          {rule?.freq === 'WEEKLY' && kind === 'WEEKLY' && (
            <WeekdayPicker days={rule.days} onChange={(days) => set({ freq: 'WEEKLY', days })} />
          )}
          {rule?.freq === 'DAILY' && kind === 'EVERY' && (
            <IntervalField
              interval={rule.interval}
              onChange={(interval) => set({ freq: 'DAILY', interval })}
            />
          )}
          {rule?.freq === 'MONTHLY' && (
            <Text variant="caption" tone="secondary">
              On day {rule.day} each month (the last day in shorter months).
            </Text>
          )}
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

// At least one day stays chosen: unticking the last one is ignored.
function WeekdayPicker({
  days,
  onChange,
}: {
  days: RRuleWeekday[];
  onChange: (days: RRuleWeekday[]) => void;
}) {
  return (
    <View
      accessibilityLabel="Repeat on"
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 }}
    >
      {RRULE_WEEKDAYS.map((day) => {
        const on = days.includes(day);
        return (
          <Chip
            key={day}
            mode="multiple"
            label={DAY_LABEL[day]}
            selected={on}
            onPress={() => {
              if (on && days.length === 1) return;
              onChange(on ? days.filter((d) => d !== day) : [...days, day]);
            }}
          />
        );
      })}
    </View>
  );
}

function IntervalField({
  interval,
  onChange,
}: {
  interval: number;
  onChange: (interval: number) => void;
}) {
  const [text, setText] = useState(String(interval));
  const n = Number(text);
  const valid = /^\d+$/.test(text) && n >= 2 && n <= MAX_REPEAT_INTERVAL;
  return (
    <TextField
      label="Every how many days?"
      value={text}
      keyboardType="number-pad"
      onChangeText={(next) => {
        setText(next);
        const value = Number(next);
        if (/^\d+$/.test(next) && value >= 2 && value <= MAX_REPEAT_INTERVAL) onChange(value);
      }}
      error={valid ? undefined : `Use a number from 2 to ${MAX_REPEAT_INTERVAL}.`}
    />
  );
}
