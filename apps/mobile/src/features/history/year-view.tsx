import { View } from 'react-native';
import { IconTile, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';
import { longestStreak, monthLetter, monthName, monthShort, yearMonths } from './history-dates';
import { HistoryState } from './history-state';
import { Divider, ListCard, ProgressBar, SummaryCard } from './parts';
import { useHistory } from './queries';

// The design's History · Year: the year's total and best month, a bar per month (the best in
// ink, with its number), the longest streak, and the three best months.
// (The design's Habits kept / Goals reached tiles join when Habits and Goals exist.)
export function YearView({ year }: { year: number }) {
  const { colors } = useTheme();
  const history = useHistory(`${year}-01-01`, `${year}-12-31`);
  const months = yearMonths(year);

  if (!history.data) return <HistoryState query={history} />;

  const perMonth = months.map((m) =>
    history.data.days.filter((d) => d.date.startsWith(m)).reduce((a, d) => a + d.count, 0),
  );
  const total = history.data.total;
  const max = Math.max(...perMonth, 0);
  const bestIndex = max > 0 ? perMonth.indexOf(max) : -1;
  const best = months[bestIndex];
  const ranked = months
    .map((m, i) => ({ month: m, count: perMonth[i] ?? 0 }))
    .filter((m) => m.count > 0)
    .toSorted((a, b) => b.count - a.count)
    .slice(0, 3);
  const streak = longestStreak(history.data.days.map((d) => d.date));

  return (
    <View style={{ gap: spacing.md }}>
      <SummaryCard
        caption={`Completed in ${year}`}
        badge={best ? `Best: ${monthShort(best)}` : undefined}
        total={total}
      >
        <Text variant="stat" accessibilityLabel={`${total} completed`}>
          {total.toLocaleString('en-GB')}
        </Text>
        <View
          accessible
          accessibilityLabel={months.map((m, i) => `${monthName(m)} ${perMonth[i]}`).join(', ')}
          style={{ flexDirection: 'row', gap: 5, marginTop: spacing.xl }}
        >
          {months.map((m, i) => {
            const count = perMonth[i] ?? 0;
            const isBest = i === bestIndex;
            return (
              <View
                key={m}
                style={{
                  flex: 1,
                  height: 150,
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 6,
                }}
              >
                {isBest && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -spacing.lg,
                      alignSelf: 'center',
                      width: 64,
                      alignItems: 'center',
                      backgroundColor: colors.ink.fill,
                      borderRadius: radius.sm,
                      paddingVertical: 4,
                      zIndex: 1,
                    }}
                  >
                    <Text variant="label" tone="onInk" style={{ fontSize: 12, lineHeight: 15 }}>
                      {count}
                    </Text>
                    <Text tone="onInk" style={{ fontSize: 11, lineHeight: 13, opacity: 0.75 }}>
                      {monthName(m)}
                    </Text>
                  </View>
                )}
                <View
                  style={{
                    width: '100%',
                    height: count ? 12 + Math.round((count / Math.max(max, 1)) * 108) : 6,
                    borderRadius: 9,
                    backgroundColor: isBest
                      ? colors.ink.fill
                      : count
                        ? colors.chart.barStrong
                        : colors.chart.track,
                  }}
                />
                <Text variant="caption" tone="secondary" style={{ fontSize: 11 }}>
                  {monthLetter(m)}
                </Text>
              </View>
            );
          })}
        </View>
      </SummaryCard>

      <View
        accessible
        accessibilityLabel={`Longest streak, ${streak} ${streak === 1 ? 'day' : 'days'} in a row`}
        style={{
          backgroundColor: colors.tile.peach,
          borderRadius: radius.lg + 2,
          padding: spacing.md,
        }}
      >
        <IconTile icon="flame" tint={colors.bg.surface} size={32} round />
        <Text variant="title2" style={{ marginTop: spacing.sm + 2 }}>
          {streak}
        </Text>
        <Text variant="caption" tone="label">
          Longest streak (days in a row)
        </Text>
      </View>

      {ranked.length > 0 && (
        <ListCard title="Best months">
          {ranked.map((m, i) => (
            <View key={m.month}>
              {i > 0 && <Divider />}
              <View
                accessible
                accessibilityLabel={`${monthName(m.month)}, ${m.count} done`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingVertical: spacing.sm + 1,
                }}
              >
                <IconTile
                  icon={i === 0 ? 'trophy' : 'calendar'}
                  tint={i === 0 ? colors.tile.peach : colors.tile.lime}
                />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text variant="bodyStrong">{monthName(m.month)}</Text>
                  <ProgressBar fraction={m.count / (ranked[0]?.count ?? 1)} strong={i === 0} />
                </View>
                <Text variant="bodyStrong" style={{ width: 44, textAlign: 'right' }}>
                  {m.count}
                </Text>
              </View>
            </View>
          ))}
        </ListCard>
      )}
    </View>
  );
}
