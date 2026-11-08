// Component tests: Jest with Expo's preset + React Native Testing Library (docs/09 §2.4).
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Metro resolves the tsconfig "@/…" alias itself; Jest needs it spelled out.
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
};
