import type { PublicSettings, PublicUser } from '@life-os/shared';
import { api, authStore } from '@/features/auth/auth-instance';
import type { DeviceDefaults } from './device-defaults';
import { type OnboardingDraft, resetDraft } from './draft';

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

export function finishOnboarding(draft: OnboardingDraft, device: DeviceDefaults): Promise<void> {
  return complete(
    {
      timezone: draft.timezone ?? device.timezone,
      followDeviceTimezone: draft.followDeviceTimezone,
      weekStartsOn: device.weekStartsOn,
      theme: draft.theme,
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
