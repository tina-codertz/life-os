import type { PublicUser } from '@life-os/shared';
import * as SecureStore from 'expo-secure-store';
import { secureSessionStorage } from './session-storage';

// An in-memory keychain standing in for the native module.
const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'afterFirstUnlockThisDeviceOnly',
  getItemAsync: jest.fn(async (key: string) => mockKeychain.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockKeychain.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockKeychain.delete(key);
  }),
}));

const USER: PublicUser = {
  id: 'u1',
  email: 'tina@example.com',
  displayName: 'Tina',
  emailVerifiedAt: null,
  onboardingCompletedAt: '2026-11-08T10:00:00.000Z',
  createdAt: '2026-11-08T09:00:00.000Z',
};

describe('secureSessionStorage', () => {
  beforeEach(() => mockKeychain.clear());

  it('saves and loads the session, kept on this device only', async () => {
    await secureSessionStorage.save({ refreshToken: 'refresh-1', user: USER });
    await expect(secureSessionStorage.load()).resolves.toEqual({
      refreshToken: 'refresh-1',
      user: USER,
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('lifeos.refreshToken', 'refresh-1', {
      keychainAccessible: 'afterFirstUnlockThisDeviceOnly',
    });
  });

  it('clear removes everything', async () => {
    await secureSessionStorage.save({ refreshToken: 'refresh-1', user: USER });
    await secureSessionStorage.clear();
    await expect(secureSessionStorage.load()).resolves.toBeNull();
  });

  it.each([
    ['no token', () => mockKeychain.set('lifeos.user', JSON.stringify(USER))],
    [
      'corrupt user JSON',
      () => {
        mockKeychain.set('lifeos.refreshToken', 'refresh-1');
        mockKeychain.set('lifeos.user', '{not json');
      },
    ],
    [
      'user without an id',
      () => {
        mockKeychain.set('lifeos.refreshToken', 'refresh-1');
        mockKeychain.set('lifeos.user', JSON.stringify({ email: 'x@y.co' }));
      },
    ],
  ])('treats %s as no session (no crash at launch)', async (_case, arrange) => {
    arrange();
    await expect(secureSessionStorage.load()).resolves.toBeNull();
  });
});
