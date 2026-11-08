import type { PublicSettings } from '@life-os/shared';
import type { UserSettings } from '../../generated/prisma/client.js';

// Allow-listed, like toPublicUser: currency (v1.1) and aiEnabled (v2) stay hidden.
export function toPublicSettings(settings: UserSettings): PublicSettings {
  return {
    timezone: settings.timezone,
    followDeviceTimezone: settings.followDeviceTimezone,
    weekStartsOn: settings.weekStartsOn,
    theme: settings.theme,
    habitRemindersOn: settings.habitRemindersOn,
    eventReminderDefault: settings.eventReminderDefault,
    crashReportsOn: settings.crashReportsOn,
  };
}
