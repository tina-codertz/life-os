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
