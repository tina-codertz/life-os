// Native modules have no implementation in Jest; use the libraries' own mocks.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
// A phone in Dar es Salaam whose week starts on Monday. Weekday is the library's real enum
// (Sunday = 1), taken from its plain types file, which has no native code.
jest.mock('expo-localization', () => {
  const { Weekday } = jest.requireActual('expo-localization/build/Localization.types');
  return {
    Weekday,
    getCalendars: jest.fn(() => [
      { timeZone: 'Africa/Dar_es_Salaam', firstWeekday: Weekday.MONDAY },
    ]),
  };
});
// Local notifications: an in-memory phone. Tests read what's scheduled with
// getAllScheduledNotificationsAsync() and set the permission with mockSetPermission('denied').
jest.mock('expo-notifications', () => {
  let scheduled = [];
  let permission = 'granted';
  const status = () => ({ granted: permission === 'granted', status: permission, ios: undefined });
  return {
    mockSetPermission: (next) => {
      permission = next;
    },
    mockReset: () => {
      scheduled = [];
      permission = 'granted';
    },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    AndroidImportance: { DEFAULT: 3 },
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => null),
    getPermissionsAsync: jest.fn(async () => status()),
    requestPermissionsAsync: jest.fn(async () => status()),
    scheduleNotificationAsync: jest.fn(async (request) => {
      const identifier = request.identifier ?? String(scheduled.length);
      scheduled = scheduled.filter((n) => n.identifier !== identifier);
      scheduled.push({ ...request, identifier });
      return identifier;
    }),
    cancelScheduledNotificationAsync: jest.fn(async (identifier) => {
      scheduled = scheduled.filter((n) => n.identifier !== identifier);
    }),
    getAllScheduledNotificationsAsync: jest.fn(async () => [...scheduled]),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  };
});
