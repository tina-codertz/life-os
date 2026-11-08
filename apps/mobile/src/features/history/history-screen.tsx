import { useHeaderHeight } from 'expo-router/react-navigation';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader, ScreenWash } from '@/components/screen';
import { IconButton, SegmentedControl } from '@/components/ui';
import { addDays, localToday, monthOf } from '@/features/tasks/dates';
import { useCategories } from '@/features/tasks/queries';
import { useMe } from '@/features/users/queries';
import { useTimezone } from '@/features/users/use-timezone';
import { spacing, useTheme } from '@/theme';
import { monthName, shiftMonth, startOfWeek } from './history-dates';
import { MonthView } from './month-view';
import { WeekView } from './week-view';
import { YearView } from './year-view';

type Period = 'week' | 'month' | 'year';
const PERIODS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
] as const;

// The design's History (Week / Month / Year): everything completed, in the user's own days.
// Arrows step back and forward a period; never past the current one.
export function HistoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const timezone = useTimezone();
  const today = localToday(timezone);
  const weekStartsOn = useMe().data?.settings.weekStartsOn ?? 1;
  const categories = useCategories();
  const categoryById = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c])),
    [categories.data],
  );

  const [period, setPeriod] = useState<Period>('week');
  // How many periods back from the current one (0 = this week / month / year).
  const [back, setBack] = useState(0);

  const thisWeek = startOfWeek(today, weekStartsOn);
  const week = addDays(thisWeek, -7 * back);
  const month = shiftMonth(monthOf(today), -back);
  const year = Number(today.slice(0, 4)) - back;
  const subtitle =
    period === 'week'
      ? "Everything you've completed"
      : period === 'month'
        ? `${monthName(month)} ${month.slice(0, 4)}`
        : String(year);
  const unit = period;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.canvas }}>
      <ScreenWash />
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.gutter,
          gap: spacing.md,
        }}
      >
        <ScreenHeader
          title="History"
          subtitle={subtitle}
          actions={
            <>
              <IconButton
                icon="chevronLeft"
                accessibilityLabel={`Previous ${unit}`}
                onPress={() => setBack((b) => b + 1)}
              />
              {back > 0 && (
                <IconButton
                  icon="chevronRight"
                  accessibilityLabel={`Next ${unit}`}
                  onPress={() => setBack((b) => b - 1)}
                />
              )}
            </>
          }
        />
        <SegmentedControl
          accessibilityLabel="Show history by"
          options={PERIODS}
          value={period}
          onChange={(next) => {
            setPeriod(next);
            setBack(0);
          }}
        />
        {period === 'week' && (
          <WeekView start={week} today={today} timezone={timezone} categories={categoryById} />
        )}
        {period === 'month' && <MonthView month={month} weekStartsOn={weekStartsOn} />}
        {period === 'year' && <YearView year={year} />}
      </ScrollView>
    </View>
  );
}
