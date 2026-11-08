import { timezoneSchema } from '@life-os/shared';
import { getCalendars } from 'expo-localization';

export interface DeviceDefaults {
  timezone: string; // IANA, canonical spelling
  weekStartsOn: number; // 0 = Sunday … 6 = Saturday (the API's numbering)
}

// What the phone already knows, so onboarding asks instead of making people type.
export function deviceDefaults(): DeviceDefaults {
  const calendar = getCalendars()[0];
  const parsed = timezoneSchema.safeParse(calendar.timeZone ?? '');
  return {
    timezone: parsed.success ? parsed.data : 'UTC',
    // expo-localization counts Sunday = 1 … Saturday = 7. Unknown → Monday (docs/05 default).
    weekStartsOn: calendar.firstWeekday ? calendar.firstWeekday - 1 : 1,
  };
}
