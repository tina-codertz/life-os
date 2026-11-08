import { addEventListener, type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { act, screen } from '@testing-library/react-native';
import { OfflineBanner } from '@/components/offline-banner';
import { renderWithTheme } from '@/test/render';
import { connectQueryToDevice, isOnline } from './network';

// What NetInfo would report; only the two fields we read matter.
const netState = (isConnected: boolean | null, isInternetReachable: boolean | null) =>
  ({ isConnected, isInternetReachable }) as NetInfoState;

describe('isOnline', () => {
  it.each([
    [true, true, true],
    [true, null, true], // reachability not known yet: don't pause queries by mistake
    [null, null, true],
    [false, null, false],
    [true, false, false], // Wi-Fi without internet (captive portal)
  ])('connected %s, internet %s → online %s', (connected, reachable, expected) => {
    expect(isOnline(netState(connected, reachable))).toBe(expected);
  });
});

describe('offline banner, driven by NetInfo', () => {
  afterEach(async () => {
    await act(async () => onlineManager.setOnline(true));
  });

  it('appears when NetInfo reports no connection and goes away when it is back', async () => {
    const stop = connectQueryToDevice();
    // The listener our code registered with NetInfo: call it like the OS would.
    const listener = jest.mocked(addEventListener).mock.calls.at(-1)?.[0];
    if (!listener) throw new Error('connectQueryToDevice did not listen to NetInfo');

    await renderWithTheme(<OfflineBanner />);
    expect(screen.queryByRole('alert')).toBeNull();

    await act(async () => listener(netState(false, false)));
    expect(onlineManager.isOnline()).toBe(false);
    expect(screen.getByRole('alert')).toHaveTextContent("You're offline. Showing saved data.");

    await act(async () => listener(netState(true, true)));
    expect(screen.queryByRole('alert')).toBeNull();
    stop();
  });
});
