import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { type PlannedReminder, REMINDER_PREFIX } from './plan';

const CHANNEL = 'habit-reminders';

// How a notification looks when it arrives while the app is open: shown, with a sound.
export function showNotificationsInApp() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Android 8+ files notifications under a channel; on Android 13+ it must exist before the
// permission prompt can appear. (A no-op on iOS.)
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Habit reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

function allowed(status: Notifications.NotificationPermissionsStatus): boolean {
  return status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

// Asked when a reminder is first saved, not at launch. True if notifications may be shown.
export async function askForReminderPermission(): Promise<boolean> {
  await ensureChannel();
  if (allowed(await Notifications.getPermissionsAsync())) return true;
  return allowed(await Notifications.requestPermissionsAsync());
}

// The docs list each scheduled item as a request ({ identifier }) in one place and as
// { request: { identifier } } in another; accept both.
function identifierOf(item: unknown): string | undefined {
  if (typeof item !== 'object' || item === null) return undefined;
  if ('identifier' in item && typeof item.identifier === 'string') return item.identifier;
  if ('request' in item && typeof item.request === 'object' && item.request !== null) {
    return identifierOf(item.request);
  }
  return undefined;
}

// Make the phone's scheduled habit reminders exactly `plan`: ours are replaced (their text can
// change with the streak), anything else the app schedules later is left alone. Without
// permission nothing is scheduled.
export async function syncReminders(plan: PlannedReminder[]): Promise<void> {
  const ours = (await Notifications.getAllScheduledNotificationsAsync())
    .map(identifierOf)
    .filter((id): id is string => Boolean(id?.startsWith(REMINDER_PREFIX)));
  await Promise.all(ours.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  if (plan.length === 0 || !allowed(await Notifications.getPermissionsAsync())) return;
  await ensureChannel();
  await Promise.all(
    plan.map((r) =>
      Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, data: { habitId: r.habitId } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: r.at,
          channelId: CHANNEL,
        },
      }),
    ),
  );
}

// Tapping a reminder opens its habit.
export function onReminderTapped(open: (habitId: string) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const habitId = response.notification.request.content.data?.['habitId'];
    if (typeof habitId === 'string') open(habitId);
  });
  return () => subscription.remove();
}
