import { useState } from 'react';
import { View } from 'react-native';
import { Button, Chip, type IconName, ListRow, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';
import { addDays, formatDue } from './dates';
import { MonthCalendar } from './month-calendar';

// A date in a sheet (a task's due date, a goal's target, a milestone's due date, an event's
// day): with `quickPicks`, one tap for Today or Tomorrow; any other day from the month calendar.
// Without `removeLabel` the date can't be removed (an event always has a day).
export function DateRow({
  title,
  removeLabel,
  value,
  onChange,
  today,
  weekStartsOn,
  quickPicks = false,
  icon = 'calendar',
  error,
}: {
  title: string;
  removeLabel?: string;
  value: string | null;
  onChange: (day: string | null) => void;
  today: string;
  weekStartsOn: number;
  quickPicks?: boolean;
  icon?: IconName;
  error?: string | undefined;
}) {
  const { colors } = useTheme();
  const tomorrow = addDays(today, 1);
  const quick = quickPicks && (value === today || value === tomorrow);
  const otherDay = value !== null && !quick;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const choose = (day: string | null) => {
    onChange(day);
    setCalendarOpen(false);
  };

  return (
    <ListRow
      icon={icon}
      tint={colors.tile.sky}
      title={title}
      value={value ? formatDue(value, today).text : 'None'}
    >
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={title}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
      >
        {quickPicks && (
          <>
            <Chip label="Today" selected={value === today} onPress={() => choose(today)} />
            <Chip label="Tomorrow" selected={value === tomorrow} onPress={() => choose(tomorrow)} />
          </>
        )}
        <Chip
          label={otherDay ? formatDue(value, today).text : 'Pick a date'}
          icon="calendar"
          selected={otherDay || calendarOpen}
          onPress={() => setCalendarOpen((open) => !open)}
        />
      </View>
      {calendarOpen && (
        <MonthCalendar value={value} today={today} weekStartsOn={weekStartsOn} onChange={choose} />
      )}
      {value && removeLabel && (
        <Button
          title={removeLabel}
          variant="ghost"
          size="sm"
          onPress={() => choose(null)}
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
