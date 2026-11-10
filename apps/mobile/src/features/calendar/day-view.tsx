import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui';
import { formatDayLong } from '@/features/tasks/dates';
import { weekdayLetter } from '@/features/history/history-dates';
import { spacing, useTheme } from '@/theme';
import { type CalendarItem, hourRange, isTimed, minutesNow, placeBlocks } from './calendar-items';
import { Block, HourLines } from './parts';

const HOUR = 56; // the design's spacing between hours
const LABEL = 40;

// The design's Day view: the week as seven pills, then the day's hours with its blocks. Items
// without a time sit in an "All day" row above the hours. A line marks now on today.
export function DayView({
  week,
  day,
  today,
  items,
  timeZone,
  onSelect,
}: {
  week: string[];
  day: string;
  today: string;
  items: CalendarItem[];
  timeZone: string;
  onSelect: (day: string) => void;
}) {
  const { colors } = useTheme();
  const allDay = items.filter((i) => !isTimed(i));
  const { first, last } = hourRange(items);
  const y = (minutes: number) => ((minutes - first * 60) / 60) * HOUR;
  const now = day === today ? minutesNow(timeZone) : null;

  return (
    <View style={{ gap: spacing.md }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 6 }}>
        {week.map((d) => {
          const selected = d === day;
          return (
            <Pressable
              key={d}
              accessibilityRole="tab"
              accessibilityLabel={formatDayLong(d)}
              accessibilityState={{ selected }}
              onPress={() => onSelect(d)}
              style={{
                flex: 1,
                height: 72,
                borderRadius: 22,
                borderCurve: 'continuous',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                backgroundColor: selected ? colors.ink.fill : colors.bg.surface,
              }}
            >
              <Text variant="caption" tone={selected ? 'onInk' : 'secondary'}>
                {weekdayLetter(d)}
              </Text>
              <Text variant="title3" tone={selected ? 'onInk' : 'primary'}>
                {Number(d.slice(8))}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {allDay.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" tone="secondary">
            All day
          </Text>
          {allDay.map((item) => (
            <View key={item.key} style={{ flexDirection: 'row' }}>
              <Block item={item} compact />
            </View>
          ))}
        </View>
      )}

      <View testID="day-hours" style={{ height: (last - first) * HOUR + spacing.md }}>
        <HourLines first={first} last={last} hourHeight={HOUR} labelWidth={LABEL} long />
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: LABEL + 12, right: 0 }}>
          {placeBlocks(items).map(({ item, column, columns }) => (
            <View
              key={item.key}
              style={{
                position: 'absolute',
                top: y(item.start) + 2,
                height: Math.max(40, y(item.end) - y(item.start) - 4),
                left: `${(column / columns) * 100}%`,
                width: `${100 / columns}%`,
                paddingRight: columns > 1 ? 4 : 0,
                flexDirection: 'row',
              }}
            >
              <Block item={item} />
            </View>
          ))}
        </View>
        {now !== null && now >= first * 60 && now <= last * 60 && (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="now-line"
            style={{
              position: 'absolute',
              left: LABEL + 4,
              right: 0,
              top: y(now) - 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: colors.accent.default,
            }}
          >
            <View
              style={{
                position: 'absolute',
                left: -5,
                top: -4,
                width: 11,
                height: 11,
                borderRadius: 6,
                backgroundColor: colors.accent.default,
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
}
