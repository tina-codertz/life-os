import { type PublicHabit, XP } from '@life-os/shared';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { useToast } from '@/components/ui';
import { formatDayLong } from '@/features/tasks/dates';
import type { PathNode } from './quest';
import { useCheckIn } from './queries';

// What tapping a day does, on the quest path and the habit detail's "Mark done today":
// today → done (or one more for a count habit) with a toast and Undo; a missed day → done;
// a done day → undo, after asking; today's unopened 🎁 → the chest.
export function useDayPress(habit: PublicHabit, today: string) {
  const toast = useToast();
  const checkIn = useCheckIn(habit, today);

  return function press(node: PathNode) {
    // Today reached a milestone: its 🎁 opens the chest (the check-in can be undone after).
    if (node.kind === 'today' && node.done && habit.chest && !habit.chest.collected) {
      router.push({ pathname: '/chest', params: { kind: 'habit', habitId: habit.id } });
      return;
    }
    if (node.kind === 'today' && !node.done) {
      // One tap is done, or one more for a count habit ("3 of 8").
      const count = habit.targetCount > 1 ? node.count + 1 : undefined;
      const previous = node.count;
      checkIn.mutate(
        { day: node.date, undo: false, ...(count !== undefined ? { count } : {}) },
        {
          onSuccess: (result) => {
            const done = (result.completion?.count ?? 0) >= habit.targetCount;
            toast({
              message: done
                ? `Day ${result.streak.current}! +${XP.HABIT} XP`
                : `${result.completion?.count ?? 0} of ${habit.targetCount}${habit.unit ? ` ${habit.unit}` : ''}`,
              tone: done ? 'success' : 'info',
              action: {
                label: 'Undo',
                onPress: () =>
                  checkIn.mutate(
                    previous > 0
                      ? { day: node.date, undo: false, count: previous }
                      : { day: node.date, undo: true },
                  ),
              },
            });
          },
        },
      );
      return;
    }
    if (node.kind === 'missed') {
      checkIn.mutate({ day: node.date, undo: false });
      return;
    }
    if (node.kind === 'done' || (node.kind === 'today' && node.done)) {
      // Undoing a done day asks first: it lowers the streak.
      Alert.alert('Undo this day?', `${formatDayLong(node.date)} won’t count as done.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo',
          style: 'destructive',
          onPress: () => checkIn.mutate({ day: node.date, undo: true }),
        },
      ]);
    }
  };
}
