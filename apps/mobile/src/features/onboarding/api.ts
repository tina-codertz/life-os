import type { PublicCategory, PublicSettings, PublicUser } from '@life-os/shared';
import { api, authStore } from '@/features/auth/auth-instance';
import { isApiError } from '@/services/api-error';
import type { DeviceDefaults } from './device-defaults';
import { type OnboardingDraft, resetDraft } from './draft';
import { FOCUS_AREAS, type FocusAreaKey } from './focus-areas';

// FR-ONB-002: one category per chosen focus area. A name that already exists counts as done,
// so pressing Finish again after a failure doesn't stop on the categories made the first time.
async function seedCategories(keys: FocusAreaKey[]): Promise<void> {
  for (const area of FOCUS_AREAS.filter((a) => keys.includes(a.key))) {
    try {
      await api().post<PublicCategory>('/categories', {
        name: area.name,
        color: area.color,
        icon: area.icon,
      });
    } catch (err) {
      if (!isApiError(err, 'CATEGORY_NAME_TAKEN')) throw err;
    }
  }
}

// Settings first, then the profile with `onboardingCompleted: true`: if the second call fails
// the user stays in onboarding and can simply press Finish again (both calls are safe to repeat).
async function complete(
  settings: Partial<PublicSettings>,
  profile: { displayName?: string },
): Promise<void> {
  await api().patch<PublicSettings>('/users/me/settings', settings);
  const user = await api().patch<PublicUser>('/users/me', {
    ...profile,
    onboardingCompleted: true,
  });
  // The gate sees an onboarded user and opens Today.
  await authStore.getState().setUser(user);
  resetDraft();
}

// Categories first, then settings and profile: onboarding only counts as finished once
// everything the user chose exists. The theme isn't asked here; it's in Settings → Appearance.
export async function finishOnboarding(
  draft: OnboardingDraft,
  device: DeviceDefaults,
): Promise<void> {
  await seedCategories(draft.focusAreas);
  await complete(
    {
      timezone: draft.timezone ?? device.timezone,
      followDeviceTimezone: draft.followDeviceTimezone,
      weekStartsOn: device.weekStartsOn,
    },
    draft.displayName ? { displayName: draft.displayName } : {},
  );
}

// FR-ONB-004. Even when skipping, the time zone and week start are saved: day-based features
// (Today, habits) need them, and the phone's values are the best guess.
export function skipOnboarding(device: DeviceDefaults): Promise<void> {
  return complete(
    { timezone: device.timezone, followDeviceTimezone: true, weekStartsOn: device.weekStartsOn },
    {},
  );
}
