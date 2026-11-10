import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Icon, IconTile, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';
import type { CalendarItem } from './calendar-items';

// Opens what an item is: the task sheet, the habit's detail or the event sheet.
export function openItem(item: CalendarItem): void {
  if (item.kind === 'task') router.push({ pathname: '/task-form', params: { id: item.id } });
  else if (item.kind === 'habit') router.push({ pathname: '/habit/[id]', params: { id: item.id } });
  else router.push({ pathname: '/event-form', params: { id: item.id } });
}

export const itemLabel = (item: CalendarItem) =>
  `${item.title}, ${item.detail}${item.done ? ', done' : ''}`;

// The day view's block (and its "All day" rows): the item's pastel, its icon, title and time.
export function Block({ item, compact = false }: { item: CalendarItem; compact?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={itemLabel(item)}
      onPress={() => openItem(item)}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: 'row',
        gap: spacing.sm + 2,
        paddingVertical: compact ? spacing.sm : 10,
        paddingHorizontal: spacing.md - 4,
        borderRadius: 20,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: colors.categoryTile[item.color],
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon name={item.done ? 'check' : item.icon} size={18} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          variant="calloutStrong"
          numberOfLines={1}
          style={item.done ? { textDecorationLine: 'line-through' } : undefined}
        >
          {item.title}
        </Text>
        <Text variant="caption" tone="label" numberOfLines={1} style={{ fontSize: 12 }}>
          {item.detail}
        </Text>
      </View>
    </Pressable>
  );
}

// The month view's list under the grid: icon tile, title, time.
export function ItemRow({ item }: { item: CalendarItem }) {
  const { colors } = useTheme();
  const time = item.detail.replace(/ · \w+$/, '');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={itemLabel(item)}
      onPress={() => openItem(item)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md - 4,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <IconTile icon={item.done ? 'check' : item.icon} tint={colors.categoryTile[item.color]} />
      <View style={{ flex: 1 }}>
        <Text
          variant="calloutStrong"
          numberOfLines={1}
          style={item.done ? { textDecorationLine: 'line-through' } : undefined}
        >
          {item.title}
        </Text>
        <Text variant="caption" tone="secondary">
          {time}
        </Text>
      </View>
    </Pressable>
  );
}

// The grey hour labels and lines behind the day and week views.
export function HourLines({
  first,
  last,
  hourHeight,
  labelWidth,
  long,
}: {
  first: number;
  last: number;
  hourHeight: number;
  labelWidth: number;
  long: boolean;
}) {
  const { colors } = useTheme();
  return (
    <>
      {Array.from({ length: last - first + 1 }, (_, i) => first + i).map((hour, i) => (
        <View
          key={hour}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: i * hourHeight,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            transform: [{ translateY: -8 }],
          }}
        >
          <Text variant="caption" tone="secondary" style={{ width: labelWidth, fontSize: 12 }}>
            {long ? `${hour}:00` : String(hour)}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border.subtle }} />
        </View>
      ))}
    </>
  );
}
