import { Pressable, View } from 'react-native';
import { Card, Text } from '@/components/ui';
import { weekdayLetter } from '@/features/history/history-dates';
import { formatDayLong } from '@/features/tasks/dates';
import { spacing, useTheme } from '@/theme';
import { type CalendarItem, hourRange, placeBlocks } from './calendar-items';
import { HourLines, itemLabel, openItem } from './parts';

const HOUR = 46; // the design's spacing between hours
const LABEL = 20;

// The design's Week view: the seven days above a card of hours, each item a coloured block
// without words (a screen reader hears them). Tapping a day opens it in the Day view.
export function WeekView({
  week,
  day,
  today,
  itemsByDay,
  onOpenDay,
}: {
  week: string[];
  day: string;
  today: string;
  itemsByDay: Map<string, CalendarItem[]>;
  onOpenDay: (day: string) => void;
}) {
  const { colors } = useTheme();
  const all = [...itemsByDay.values()].flat();
  const { first, last } = hourRange(all);
  const y = (minutes: number) => ((minutes - first * 60) / 60) * HOUR;
  const untimed = week.map((d) => (itemsByDay.get(d) ?? []).filter((i) => i.start === null));

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', paddingLeft: LABEL + spacing.md + 8 }}>
        {week.map((d) => {
          const selected = d === day;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={`${formatDayLong(d)}${d === today ? ', today' : ''}`}
              accessibilityHint="Opens the day"
              onPress={() => onOpenDay(d)}
              style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}
            >
              <Text variant="caption" tone="secondary">
                {weekdayLetter(d)}
              </Text>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? colors.ink.fill : 'transparent',
                }}
              >
                <Text variant="calloutStrong" tone={selected ? 'onInk' : 'primary'}>
                  {Number(d.slice(8))}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Card>
        {untimed.some((list) => list.length > 0) && (
          <View style={{ flexDirection: 'row', paddingLeft: LABEL + 8, marginBottom: spacing.md }}>
            {untimed.map((list, i) => (
              <View key={week[i]} style={{ flex: 1, gap: 3, paddingHorizontal: 2 }}>
                {list.map((item) => (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityLabel={itemLabel(item)}
                    onPress={() => openItem(item)}
                    style={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.categoryTile[item.color],
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
        <View style={{ height: (last - first) * HOUR + spacing.sm, marginTop: spacing.sm }}>
          <HourLines first={first} last={last} hourHeight={HOUR} labelWidth={LABEL} long={false} />
          <View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: LABEL + 8,
              right: 0,
              flexDirection: 'row',
            }}
          >
            {week.map((d) => (
              <View key={d} style={{ flex: 1, marginHorizontal: 2 }}>
                {placeBlocks(itemsByDay.get(d) ?? []).map(({ item, column, columns }) => (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatDayLong(d)}: ${itemLabel(item)}`}
                    onPress={() => openItem(item)}
                    style={{
                      position: 'absolute',
                      top: y(item.start) + 1,
                      height: Math.max(20, y(item.end) - y(item.start) - 2),
                      left: `${(column / columns) * 100}%`,
                      width: `${100 / columns}%`,
                      borderRadius: 12,
                      borderCurve: 'continuous',
                      backgroundColor: colors.categoryTile[item.color],
                      opacity: item.done ? 0.6 : 1,
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </Card>
    </View>
  );
}
