import { View } from 'react-native';
import { Text } from '@/components/ui';
import { formatDayLong } from '@/features/tasks/dates';
import { radius, spacing, useTheme } from '@/theme';
import {
  countsByDay,
  formatWeekRange,
  heatLevel,
  monthName,
  monthWeeks,
  weekdayLetter,
  weekdayShort,
} from './history-dates';
import { HistoryState } from './history-state';
import { Divider, ListCard, ProgressBar, SummaryCard } from './parts';
import { useHistory } from './queries';

// The design's History · Month: the month's total, a heatmap of each day (darker = more done),
// and its weeks with their totals and best day.
export function MonthView({ month, weekStartsOn }: { month: string; weekStartsOn: number }) {
  const { colors } = useTheme();
  const weeks = monthWeeks(month, weekStartsOn);
  const first = weeks[0]?.[0] ?? `${month}-01`;
  const last = weeks.at(-1)?.[6] ?? `${month}-28`;
  const history = useHistory(first, last);

  if (!history.data) return <HistoryState query={history} />;

  const counts = countsByDay(history.data.days);
  const inMonth = (d: string) => d.startsWith(month);
  const total = weeks
    .flat()
    .filter(inMonth)
    .reduce((a, d) => a + (counts.get(d) ?? 0), 0);
  const max = Math.max(
    0,
    ...weeks
      .flat()
      .filter(inMonth)
      .map((d) => counts.get(d) ?? 0),
  );
  const weekTotals = weeks.map((w) => w.reduce((a, d) => a + (counts.get(d) ?? 0), 0));
  const bestWeek = Math.max(...weekTotals, 0);

  return (
    <View style={{ gap: spacing.md }}>
      <SummaryCard caption={`Completed in ${monthName(month)}`} total={total}>
        <Text variant="stat" accessibilityLabel={`${total} completed`}>
          {total}
        </Text>
        <View style={{ gap: 5, marginTop: spacing.md }}>
          <View
            style={{ flexDirection: 'row', gap: 5 }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {(weeks[0] ?? []).map((d) => (
              <Text
                key={d}
                variant="label"
                tone="secondary"
                style={{ flex: 1, textAlign: 'center', fontSize: 12 }}
              >
                {weekdayLetter(d)}
              </Text>
            ))}
          </View>
          {weeks.map((week) => (
            <View key={week[0]} style={{ flexDirection: 'row', gap: 5 }}>
              {week.map((day) => {
                if (!inMonth(day)) return <View key={day} style={{ flex: 1 }} />;
                const count = counts.get(day) ?? 0;
                const level = heatLevel(count, max);
                return (
                  <View
                    key={day}
                    accessible
                    accessibilityLabel={`${formatDayLong(day)}, ${count} done`}
                    testID={`heat-${day}`}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: radius.md - 1,
                      borderCurve: 'continuous',
                      backgroundColor: colors.heat.fill[level],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="label" style={{ color: colors.heat.text[level] }}>
                      {Number(day.slice(8))}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 6,
              marginTop: spacing.xs,
            }}
          >
            <Text variant="caption" tone="secondary" style={{ fontSize: 12 }}>
              Less
            </Text>
            {colors.heat.fill.map((fill) => (
              <View
                key={fill}
                style={{ width: 18, height: 18, borderRadius: 6, backgroundColor: fill }}
              />
            ))}
            <Text variant="caption" tone="secondary" style={{ fontSize: 12 }}>
              More
            </Text>
          </View>
        </View>
      </SummaryCard>

      <ListCard title="By week">
        {weeks.map((week, i) => {
          const weekTotal = weekTotals[i] ?? 0;
          const best = week.reduce<string | null>(
            (b, d) => ((counts.get(d) ?? 0) > (b ? (counts.get(b) ?? 0) : 0) ? d : b),
            null,
          );
          return (
            <View key={week[0]}>
              {i > 0 && <Divider />}
              <View
                accessible
                accessibilityLabel={`${formatWeekRange(week[0] ?? '')}, ${weekTotal} done`}
                style={{ paddingVertical: spacing.sm + 2, gap: spacing.xs + 2 }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <Text variant="bodyStrong">{formatWeekRange(week[0] ?? '')}</Text>
                  <Text variant="calloutStrong">
                    {weekTotal}{' '}
                    <Text variant="caption" tone="secondary">
                      done
                    </Text>
                  </Text>
                </View>
                <ProgressBar
                  fraction={bestWeek ? weekTotal / bestWeek : 0}
                  strong={weekTotal > 0 && weekTotal === bestWeek}
                />
                {best && (
                  <Text variant="caption" tone="secondary" style={{ fontSize: 12 }}>
                    Best day {weekdayShort(best)} · {counts.get(best)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </ListCard>
    </View>
  );
}
