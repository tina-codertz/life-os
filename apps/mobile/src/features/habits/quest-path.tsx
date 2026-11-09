import type { PublicHabit } from '@life-os/shared';
import { Pressable, View } from 'react-native';
import { Icon, Mascot, Text } from '@/components/ui';
import { formatDayLong } from '@/features/tasks/dates';
import { radius, spacing, useTheme } from '@/theme';
import type { PathNode } from './quest';

const NODE = 64;
const TODAY = 72;
const ROW = 80;
// The design's zigzag: each circle's offset from the centre line.
const OFFSETS = [42, -24, -12, 40, -6, -40];

export interface QuestPathProps {
  habit: PublicHabit;
  nodes: PathNode[];
  // Days that can still be changed (today and the last 7: FR-HAB-002).
  canChange: (date: string) => boolean;
  onPressDay: (node: PathNode) => void;
}

// The design's quest path: past days (green tick = done, grey = missed), today's big star
// ("START"), then the next days ahead (🎁 at a milestone, 🔒 otherwise). Lio cheers next to the
// latest done day. Each circle says what it is to a screen reader.
export function QuestPath({ habit, nodes, canChange, onPressDay }: QuestPathProps) {
  const { colors } = useTheme();
  const lastDone = nodes.reduce((at, n, i) => (n.kind === 'done' ? i : at), -1);
  const firstAhead = nodes.findIndex((n) => n.kind === 'gift' || n.kind === 'locked');

  return (
    <View style={{ height: nodes.length * ROW + spacing.xl, marginTop: spacing.sm }}>
      {nodes.map((node, i) => {
        const offset = OFFSETS[i % OFFSETS.length] ?? 0;
        const top = i * ROW;
        const isToday = node.kind === 'today';
        const size = isToday ? TODAY : NODE;
        const pressable =
          isToday || ((node.kind === 'done' || node.kind === 'missed') && canChange(node.date));
        const circle = (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              ...circleStyle(node, habit, colors),
            }}
          >
            <NodeIcon node={node} habit={habit} />
          </View>
        );
        return (
          <View
            key={node.date + node.kind}
            style={{
              position: 'absolute',
              top,
              left: '50%',
              marginLeft: offset - size / 2,
              alignItems: 'center',
            }}
          >
            {isToday && !node.done && (
              <View
                style={{
                  position: 'absolute',
                  top: -22,
                  zIndex: 2,
                  backgroundColor: colors.bg.surface,
                  borderRadius: radius.md - 2,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 4,
                }}
              >
                <Text variant="label" tone="accent" style={{ fontSize: 12, letterSpacing: 1 }}>
                  START
                </Text>
              </View>
            )}
            {isToday ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={todayLabel(node, habit)}
                accessibilityHint={
                  chestReady(node, habit)
                    ? 'Opens the chest'
                    : node.done
                      ? 'Undo today’s check-in'
                      : 'Check in for today'
                }
                onPress={() => onPressDay(node)}
                testID="quest-today"
                style={({ pressed }) => ({
                  width: TODAY + 16,
                  height: TODAY + 16,
                  borderRadius: radius.full,
                  backgroundColor: colors.quest.ring,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                })}
              >
                {circle}
              </Pressable>
            ) : pressable ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${formatDayLong(node.date)}, ${node.kind === 'done' ? 'done' : 'missed'}`}
                accessibilityHint={node.kind === 'done' ? 'Undo this day' : 'Mark this day done'}
                onPress={() => onPressDay(node)}
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }] })}
              >
                {circle}
              </Pressable>
            ) : (
              <View accessible accessibilityLabel={staticLabel(node)}>
                {circle}
              </View>
            )}
          </View>
        );
      })}

      {lastDone >= 0 && habit.streak.current > 0 && (
        <View
          style={{
            position: 'absolute',
            top: lastDone * ROW + ROW * 0.6,
            left: '50%',
            marginLeft: 30,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Mascot mood="excited" height={64} decorative />
          <View
            style={{
              backgroundColor: colors.ink.fill,
              borderRadius: radius.lg - 6,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            }}
          >
            <Text variant="label" tone="onInk">
              Day {habit.streak.current}. Keep going!
            </Text>
          </View>
        </View>
      )}
      {firstAhead >= 0 && (
        <View style={{ position: 'absolute', top: firstAhead * ROW, left: 0 }}>
          <Mascot mood="sleepy" height={60} decorative />
        </View>
      )}
    </View>
  );
}

// Today's milestone, chest not opened yet: an amber 🎁 circle.
const chestReady = (node: PathNode, habit: PublicHabit) =>
  node.kind === 'today' && node.done && Boolean(habit.chest && !habit.chest.collected);

function circleStyle(
  node: PathNode,
  habit: PublicHabit,
  colors: ReturnType<typeof useTheme>['colors'],
) {
  if (chestReady(node, habit)) {
    return { backgroundColor: colors.reward.fill, boxShadow: `0 6px 0 ${colors.reward.shade}` };
  }
  if (node.kind === 'done' || (node.kind === 'today' && node.done)) {
    return { backgroundColor: colors.quest.done, boxShadow: `0 6px 0 ${colors.quest.doneShade}` };
  }
  if (node.kind === 'today') {
    return {
      backgroundImage: `linear-gradient(135deg, ${colors.accent.fill}, ${colors.accent.fillEnd})`,
      boxShadow: `0 6px 0 ${colors.quest.todayShade}`,
    };
  }
  return { backgroundColor: colors.quest.idle, boxShadow: `0 6px 0 ${colors.quest.idleShade}` };
}

function NodeIcon({ node, habit }: { node: PathNode; habit: PublicHabit }) {
  const { colors } = useTheme();
  switch (node.kind) {
    case 'done':
      return <Icon name="check" size={28} color={colors.quest.doneIcon} />;
    case 'missed':
      return <Icon name="close" size={22} color={colors.quest.lockIcon} />;
    case 'rest':
      return <Icon name="moon" size={24} color={colors.quest.lockIcon} />;
    case 'gift':
      return <Icon name="gift" size={26} color={colors.quest.giftIcon} />;
    case 'locked':
      return <Icon name="lock" size={24} color={colors.quest.lockIcon} />;
    case 'today':
      if (chestReady(node, habit)) {
        return <Icon name="gift" size={32} color={colors.reward.text} />;
      }
      if (node.done) return <Icon name="check" size={32} color={colors.quest.doneIcon} />;
      // A count habit shows how far today has got ("3/8"); otherwise the design's star.
      if (habit.targetCount > 1 && node.count > 0) {
        return (
          <Text variant="calloutStrong" tone="onAccent">
            {node.count}/{habit.targetCount}
          </Text>
        );
      }
      return <Icon name="star" size={30} color={colors.text.onAccent} />;
  }
  return null;
}

function todayLabel(node: Extract<PathNode, { kind: 'today' }>, habit: PublicHabit): string {
  if (chestReady(node, habit)) {
    return `Today, ${habit.name}, done. Day ${habit.chest?.streakDay} chest to open`;
  }
  if (node.done) return `Today, ${habit.name}, done`;
  if (habit.targetCount > 1) {
    return `Today, ${habit.name}, ${node.count} of ${habit.targetCount}${habit.unit ? ` ${habit.unit}` : ''}`;
  }
  return `Today, ${habit.name}, not done yet`;
}

function staticLabel(node: PathNode): string {
  const day = formatDayLong(node.date);
  switch (node.kind) {
    case 'done':
      return `${day}, done`;
    case 'missed':
      return `${day}, missed`;
    case 'rest':
      return `Today, ${day}, a rest day`;
    case 'gift':
      return `${day}, day ${node.streakDay}: a reward`;
    case 'locked':
      return `${day}, day ${node.streakDay}, still to come`;
    default:
      return day;
  }
}
