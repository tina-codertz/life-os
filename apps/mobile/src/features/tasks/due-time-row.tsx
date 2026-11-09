import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform } from 'react-native';
import { Button, ListRow, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';
import { formatTime } from './dates';

// Minutes after midnight ↔ the picker's Date. The picker only shows a wall-clock time, so the
// date part and the phone's time zone don't matter: hours and minutes go in and come out.
export function toDate(minutes: number): Date {
  const date = new Date(2026, 0, 1, 0, 0, 0, 0);
  date.setHours(Math.floor(minutes / 60), minutes % 60);
  return date;
}
export const toMinutes = (date: Date) => date.getHours() * 60 + date.getMinutes();

// The default when a time is first added: the next full hour, as a sensible starting point.
function nextHour(): number {
  return Math.min((new Date().getHours() + 1) * 60, 23 * 60);
}

export interface DueTimeRowProps {
  value: number | null;
  onChange: (minutes: number | null) => void;
  // A time needs a date (the API refuses one without).
  hasDate: boolean;
  error?: string | undefined;
}

// The design's Time row. Tapping it opens the phone's own time picker: a dialog on Android, a
// wheel under the row on iOS. "Remove time" clears it.
export function DueTimeRow({ value, onChange, hasDate, error }: DueTimeRowProps) {
  const { colors, scheme } = useTheme();
  const [wheelOpen, setWheelOpen] = useState(false);
  const current = value ?? nextHour();

  function open() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(current),
        mode: 'time',
        is24Hour: true,
        // Only called when a time is set, not when the dialog is dismissed.
        onValueChange: (_event, date) => onChange(toMinutes(date)),
      });
      return;
    }
    if (value === null) onChange(current);
    setWheelOpen((isOpen) => !isOpen);
  }

  return (
    <ListRow
      icon="clock"
      tint={colors.tile.lime}
      title="Time"
      value={!hasDate ? 'Pick a date first' : value === null ? 'None' : formatTime(value)}
      {...(hasDate ? { onPress: open, accessibilityHint: 'Opens the time picker' } : {})}
      testID="due-time-row"
    >
      {hasDate && wheelOpen && Platform.OS !== 'android' && (
        <DateTimePicker
          testID="time-picker"
          value={toDate(current)}
          mode="time"
          display="spinner"
          locale="en-GB"
          themeVariant={scheme}
          textColor={colors.text.primary}
          onValueChange={(_event, date) => onChange(toMinutes(date))}
        />
      )}
      {hasDate && value !== null && (
        <Button
          title="Remove time"
          variant="ghost"
          size="sm"
          onPress={() => {
            onChange(null);
            setWheelOpen(false);
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
  );
}
