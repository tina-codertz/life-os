import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useHabits } from '@/features/habits/queries';
import { useMe } from '@/features/users/queries';
import { useTimezone } from '@/features/users/use-timezone';
import { onReminderTapped, syncReminders } from './notifications';
import { planReminders } from './plan';

// Keeps the phone's habit reminders in step with the habits (ADR-014): on start, whenever a
// habit or check-in changes, the setting is switched, or the app comes back to the front.
// Signed out (this layout unmounts), they're all cancelled.
export function useHabitReminders() {
  const habits = useHabits();
  const enabled = useMe().data?.settings.habitRemindersOn ?? true;
  const timeZone = useTimezone();
  // Re-planned from "now" each time the app comes back to the front.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => sub.remove();
  }, []);

  // React Query keeps `habits.data` the same object while nothing changed, so this only
  // re-plans (and re-syncs) when something did.
  const plan = useMemo(
    () => (habits.data ? planReminders(habits.data, { now, timeZone, enabled }) : undefined),
    [habits.data, now, timeZone, enabled],
  );

  useEffect(() => {
    if (plan) void syncReminders(plan).catch(() => undefined);
  }, [plan]);

  useEffect(() => () => void syncReminders([]).catch(() => undefined), []);

  useEffect(
    () =>
      onReminderTapped((habitId) =>
        router.push({ pathname: '/habit/[id]', params: { id: habitId } }),
      ),
    [],
  );
}
