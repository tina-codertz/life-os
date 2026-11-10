import { Pressable, View } from 'react-native';
import { Card, Text } from '@/components/ui';
import { formatDayLong, monthGrid, weekdayLetters } from '@/features/tasks/dates';
import { radius, spacing, useTheme } from '@/theme';
import { type CalendarItem, type ItemKind, kindsOn } from './calendar-items';
import { ItemRow } from './parts';

const KIND_NAMES: Record<ItemKind, string> = {
  task: 'tasks',
  habit: 'habits done',
  event: 'events',
};

// "SUN 8 NOV", the heading over the chosen day's list.
const dayHeading = (day: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(new Date(`${day}T00:00:00.000Z`))
    .replace(',', '')
    .toUpperCase();

// The design's Month view: the month grid with a dot for each kind of thing on a day (tasks,
// habits done, events), and the chosen day's items listed under it.
export function MonthView({
  month,
  day,
  today,
  weekStartsOn,
  itemsByDay,
  onSelect,
}: {
  month: string;
  day: string;
  today: string;
  weekStartsOn: number;
  itemsByDay: Map<string, CalendarItem[]>;
  onSelect: (day: string) => void;
}) {
  const { colors } = useTheme();
  const dot: Record<ItemKind, string> = {
    task: colors.accent.default,
    habit: colors.quest.done,
    event: colors.category.orange,
  };
  const chosen = itemsByDay.get(day) ?? [];

  return (
    <View style={{ gap: spacing.md }}>
      <Card style={{ padding: spacing.md }}>
        <View
          style={{ flexDirection: 'row' }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {weekdayLetters(weekStartsOn).map((letter, i) => (
            <Text
              key={i}
              variant="caption"
              tone="secondary"
              style={{ flex: 1, textAlign: 'center', fontSize: 12 }}
            >
              {letter}
            </Text>
          ))}
        </View>
        {monthGrid(month, weekStartsOn).map((week, w) => (
          <View key={w} style={{ flexDirection: 'row' }}>
            {week.map((d, i) => {
              if (!d) return <View key={i} style={{ flex: 1 }} />;
              const selected = d === day;
              const kinds = kindsOn(itemsByDay.get(d) ?? []);
              const label = [
                d === today ? `Today, ${formatDayLong(d)}` : formatDayLong(d),
                ...kinds.map((k) => KIND_NAMES[k]),
              ].join(', ');
              return (
                <Pressable
                  key={d}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected }}
                  onPress={() => onSelect(d)}
                  style={{
                    flex: 1,
                    height: 48,
                    marginHorizontal: 1,
                    borderRadius: 18,
                    borderCurve: 'continuous',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.xs,
                    backgroundColor: selected ? colors.ink.fill : 'transparent',
                  }}
                >
                  <Text
                    variant="bodyStrong"
                    tone={selected ? 'onInk' : d === today ? 'accent' : 'primary'}
                  >
                    {Number(d.slice(8))}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 3, height: 5 }}>
                    {kinds.map((k) => (
                      <View
                        key={k}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: radius.full,
                          backgroundColor: selected ? colors.ink.text : dot[k],
                        }}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>

      <Text variant="overline" tone="secondary" accessibilityRole="header">
        {dayHeading(day)}
      </Text>
      <Card style={{ padding: spacing.md - 2, gap: spacing.md - 4 }}>
        {chosen.length === 0 ? (
          <Text tone="secondary">Nothing planned.</Text>
        ) : (
          chosen.map((item) => <ItemRow key={item.key} item={item} />)
        )}
      </Card>
    </View>
  );
}
