import { addEventListener, type NetInfoState } from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

// Offline = no network, or a network that can't reach the internet (captive Wi-Fi, a dead
// hotspot). "Unknown" (null, the first moments after launch) counts as online, so queries
// aren't paused by mistake.
export function isOnline(
  state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>,
): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

// Tell TanStack Query when the phone goes offline (queries pause) and when the app comes back
// to the foreground (stale queries refetch). Call once, at startup.
export function connectQueryToDevice(): () => void {
  onlineManager.setEventListener((setOnline) =>
    addEventListener((state) => setOnline(isOnline(state))),
  );
  const subscription = AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
  return () => subscription.remove();
}

// For UI (the offline banner): re-renders when the online state changes.
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
}
