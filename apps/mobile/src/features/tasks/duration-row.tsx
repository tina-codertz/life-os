import { View } from 'react-native';
import { Chip, ListRow, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

const CHOICES = [15, 30, 45, 60, 90, 120, 180, 240] as const;

// "45 min", "1 h", "1 h 30".
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${minutes / 60} h` : `${Math.floor(minutes / 60)} h ${rest}`;
}

// How long a timed task takes, for its block on the calendar (your choice, Calendar I).
// Without one the block is half an hour. Needs a time, like a time needs a date.
export function DurationRow({
  value,
  onChange,
  hasTime,
  error,
}: {
  value: number | null;
  onChange: (minutes: number | null) => void;
  hasTime: boolean;
  error?: string | undefined;
}) {
  const { colors } = useTheme();
  return (
    <ListRow
      icon="clock"
      tint={colors.tile.lavender}
      title="Length"
      value={!hasTime ? 'Pick a time first' : value === null ? 'None' : formatDuration(value)}
      testID="duration-row"
    >
      {hasTime && (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Length"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
        >
          <Chip label="None" selected={value === null} onPress={() => onChange(null)} />
          {/* A length set elsewhere that isn't one of the chips still shows as chosen. */}
          {value !== null && !(CHOICES as readonly number[]).includes(value) && (
            <Chip label={formatDuration(value)} selected onPress={() => onChange(value)} />
          )}
          {CHOICES.map((m) => (
            <Chip
              key={m}
              label={formatDuration(m)}
              selected={value === m}
              onPress={() => onChange(m)}
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
