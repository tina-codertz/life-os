import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { MIN_TOUCH_TARGET, radius, spacing, useTheme } from '@/theme';
import { addMonths, formatDayLong, formatMonth, monthGrid, monthOf, weekdayLetters } from './dates';

export interface MonthCalendarProps {
  // The chosen day ("2026-11-20"), or null.
  value: string | null;
  onChange: (day: string) => void;
  // Today in the user's time zone: marked with a dot, and the earliest day that can be picked.
  today: string;
  // 0 = Sunday … 6 = Saturday (the user's setting).
  weekStartsOn: number;
}

// A month grid in the style of the design's Month screen: rounded day cells, the chosen day in
// ink, today with a dot. Days before today can't be picked (except one already chosen).
export function MonthCalendar({ value, onChange, today, weekStartsOn }: MonthCalendarProps) {
  const { colors } = useTheme();
  const [month, setMonth] = useState(() => monthOf(value ?? today));
  const atFirstMonth = month <= monthOf(today);

  return (
    <View style={{ gap: spacing.sm }} testID="month-calendar">
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text variant="bodyStrong" accessibilityRole="header" style={{ flex: 1, paddingLeft: 4 }}>
          {formatMonth(month)}
        </Text>
        <MonthButton
          icon="chevronLeft"
          label="Previous month"
          disabled={atFirstMonth}
          onPress={() => setMonth((m) => addMonths(m, -1))}
        />
        <MonthButton
          icon="chevronRight"
          label="Next month"
          onPress={() => setMonth((m) => addMonths(m, 1))}
        />
      </View>

      <View
        style={{ flexDirection: 'row' }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {weekdayLetters(weekStartsOn).map((letter, i) => (
          <Text
            key={i}
            variant="label"
            tone="secondary"
            style={{ flex: 1, textAlign: 'center', fontSize: 12 }}
          >
            {letter}
          </Text>
        ))}
      </View>

      {monthGrid(month, weekStartsOn).map((week, w) => (
        <View key={w} style={{ flexDirection: 'row' }}>
          {week.map((day, d) => {
            if (!day) return <View key={d} style={{ flex: 1 }} />;
            const selected = day === value;
            const disabled = day < today && !selected;
            const isToday = day === today;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={isToday ? `Today, ${formatDayLong(day)}` : formatDayLong(day)}
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                onPress={() => onChange(day)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: MIN_TOUCH_TARGET,
                  marginHorizontal: 2,
                  borderRadius: radius.md + 2,
                  borderCurve: 'continuous',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected
                    ? colors.ink.fill
                    : pressed
                      ? colors.bg.subtle
                      : 'transparent',
                })}
              >
                <Text
                  variant="bodyStrong"
                  tone={selected ? 'onInk' : 'primary'}
                  style={disabled ? { opacity: 0.3 } : undefined}
                >
                  {Number(day.slice(8))}
                </Text>
                {isToday && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 5,
                      width: 5,
                      height: 5,
                      borderRadius: radius.full,
                      backgroundColor: selected ? colors.ink.text : colors.accent.default,
                    }}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function MonthButton({
  icon,
  label,
  disabled = false,
  onPress,
}: {
  icon: 'chevronLeft' | 'chevronRight';
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: MIN_TOUCH_TARGET,
        height: MIN_TOUCH_TARGET,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.3 : pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} size={18} color={colors.text.primary} />
    </Pressable>
  );
}
