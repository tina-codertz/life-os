import type { PublicCategory } from '@life-os/shared';
import { View } from 'react-native';
import { Card, EmptyState, IconTile, Text } from '@/components/ui';
import { reversed } from '@/lib/arrays';
import { addDays } from '@/features/tasks/dates';
import { categoryIcon } from '@/features/tasks/category-icon';
import { radius, spacing, useTheme } from '@/theme';
import {
  countsByDay,
  formatChange,
  formatDayHeading,
  formatWeekRange,
  weekDays,
  weekdayLetter,
  weekdayShort,
} from './history-dates';
import { DoneBadge, Divider, ListCard, SummaryCard } from './parts';
import { formatClock, useHistory } from './queries';
import { HistoryState } from './history-state';

// The design's History · Week: the week's total with a bar per day (today in ink) and the
// change from last week, then what was completed, day by day.
export function WeekView({
  start,
  today,
  timezone,
  categories,
}: {
  start: string;
  today: string;
  timezone: string;
  categories: Map<string, PublicCategory>;
}) {
  const { colors } = useTheme();
  const lastWeek = addDays(start, -7);
  const history = useHistory(lastWeek, addDays(start, 6), true);
  const days = weekDays(start);

  if (!history.data) return <HistoryState query={history} />;

  const counts = countsByDay(history.data.days);
  const thisWeek = days.map((d) => counts.get(d) ?? 0);
  const total = thisWeek.reduce((a, b) => a + b, 0);
  const before = weekDays(lastWeek).reduce((a, d) => a + (counts.get(d) ?? 0), 0);
  const max = Math.max(...thisWeek, 1);
  // Newest day first.
  const withTasks = reversed(
    history.data.days.filter((d) => d.date >= start && (d.tasks?.length ?? 0) > 0),
  );

  return (
    <View style={{ gap: spacing.md }}>
      <SummaryCard
        caption={`Completed · ${formatWeekRange(start)}`}
        badge={formatChange(total, before, 'week')}
        total={total}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.lg }}>
          <Text variant="stat" accessibilityLabel={`${total} completed`}>
            {total}
          </Text>
          <View
            accessible
            accessibilityLabel={days.map((d, i) => `${weekdayShort(d)} ${thisWeek[i]}`).join(', ')}
            style={{ flex: 1, flexDirection: 'row', gap: 6 }}
          >
            {days.map((day, i) => (
              <View
                key={day}
                style={{
                  flex: 1,
                  height: 84,
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: '100%',
                    height: thisWeek[i] ? 12 + Math.round(((thisWeek[i] ?? 0) / max) * 50) : 6,
                    borderRadius: radius.sm,
                    backgroundColor:
                      day === today
                        ? colors.ink.fill
                        : thisWeek[i]
                          ? colors.chart.bar
                          : colors.chart.track,
                  }}
                />
                <Text variant="caption" tone="secondary" style={{ fontSize: 12 }}>
                  {weekdayLetter(day)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </SummaryCard>

      {withTasks.length === 0 ? (
        <Card>
          <EmptyState
            mascot="sleepy"
            title="Nothing completed this week"
            description="Tasks you finish show up here, day by day."
          />
        </Card>
      ) : (
        withTasks.map((day) => (
          <ListCard key={day.date}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 2,
                paddingBottom: spacing.xs,
              }}
            >
              <Text variant="title3" accessibilityRole="header" style={{ fontSize: 17 }}>
                {formatDayHeading(day.date, today)}
              </Text>
              <DoneBadge count={day.count} />
            </View>
            {(day.tasks ?? []).map((task, i) => {
              const category = task.categoryId ? categories.get(task.categoryId) : undefined;
              const time = task.completedAt ? formatClock(task.completedAt, timezone) : null;
              return (
                <View key={task.id}>
                  {i > 0 && <Divider />}
                  <View
                    accessible
                    accessibilityLabel={[task.title, 'task', time ? `done at ${time}` : null]
                      .filter(Boolean)
                      .join(', ')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      paddingVertical: spacing.sm + 2,
                    }}
                  >
                    <IconTile
                      icon={categoryIcon(category?.icon)}
                      tint={category ? colors.categoryTile[category.color] : colors.tile.lavender}
                      size={42}
                    />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong">{task.title}</Text>
                      <Text variant="caption" tone="secondary">
                        {time ? `Task · ${time}` : 'Task'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ListCard>
        ))
      )}
    </View>
  );
}
