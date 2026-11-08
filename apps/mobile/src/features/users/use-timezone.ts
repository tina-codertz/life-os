import { useMemo } from 'react';
import { useSession } from '@/features/auth/session';
import { deviceDefaults } from '@/features/onboarding/device-defaults';
import { useMe } from './queries';

// The zone that decides "today" (ADR-006): the user's saved setting, or the phone's until the
// settings have loaded.
export function useTimezone(): string {
  const { status } = useSession();
  const saved = useMe({ enabled: status === 'signedIn' }).data?.settings.timezone;
  const device = useMemo(() => deviceDefaults().timezone, []);
  return saved ?? device;
}
