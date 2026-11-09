import { MAX_HABIT_REMINDERS } from '@life-os/shared';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Button, Icon, ListRow, Text } from '@/components/ui';
import { formatTime } from '@/features/tasks/dates';
import { toDate, toMinutes } from '@/features/tasks/due-time-row';
import { sorted } from '@/lib/arrays';
import { MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';

const EVENING = 21 * 60;

export interface ReminderRowProps {
  value: number[];
  onChange: (times: number[]) => void;
  error?: string | undefined;
}

// The habit sheet's Reminder row, in the style of New task's Time row (the design shows a
// reminder only as "reminder 21:00" under the habit's name). Up to 3 times a day; each has a
// ✕ to remove it. Adding opens the phone's time picker: a dialog on Android, a wheel on iOS.
export function ReminderRow({ value, onChange, error }: ReminderRowProps) {
  const { colors, scheme } = useTheme();
  const [picking, setPicking] = useState<number | null>(null);
  const add = (minutes: number) =>
    onChange(sorted([...new Set([...value, minutes])], (a, b) => a - b));
  const start = value.includes(EVENING) ? Math.min(EVENING + 60, 23 * 60) : EVENING;

  function open() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(start),
        mode: 'time',
        is24Hour: true,
        onValueChange: (_event, date) => add(toMinutes(date)),
      });
      return;
    }
    setPicking(start);
  }

  return (
    <ListRow
      icon="clock"
      tint={colors.tile.sky}
      title="Reminder"
      value={value.length === 0 ? 'Off' : value.map(formatTime).join(', ')}
    >
      {value.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {value.map((minutes) => (
            <Pressable
              key={minutes}
              accessibilityRole="button"
              accessibilityLabel={`Remove the ${formatTime(minutes)} reminder`}
              onPress={() => onChange(value.filter((m) => m !== minutes))}
              style={({ pressed }) => ({
                minHeight: MIN_TOUCH_TARGET,
                paddingHorizontal: spacing.md,
                borderRadius: radius.full,
                backgroundColor: colors.bg.subtle,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs + 2,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text variant="calloutStrong">{formatTime(minutes)}</Text>
              <Icon name="close" size={16} color={colors.text.label} />
            </Pressable>
          ))}
        </View>
      )}
      {picking !== null && Platform.OS !== 'android' ? (
        <>
          <DateTimePicker
            testID="reminder-picker"
            value={toDate(picking)}
            mode="time"
            display="spinner"
            locale="en-GB"
            themeVariant={scheme}
            textColor={colors.text.primary}
            onValueChange={(_event, date) => setPicking(toMinutes(date))}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              title={`Add ${formatTime(picking)}`}
              size="sm"
              onPress={() => {
                add(picking);
                setPicking(null);
              }}
            />
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setPicking(null)} />
          </View>
        </>
      ) : (
        value.length < MAX_HABIT_REMINDERS && (
          <Button
            title={value.length === 0 ? 'Add a reminder' : 'Add another time'}
            variant="ghost"
            size="sm"
            icon="add"
            onPress={open}
            style={{ alignSelf: 'flex-start', paddingHorizontal: spacing.xs }}
          />
        )
      )}
      {error && (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      )}
    </ListRow>
  );
}
