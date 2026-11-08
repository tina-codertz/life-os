// Component tests: Jest with Expo's preset + React Native Testing Library (docs/09 §2.4).
const path = require('node:path');

// The package's main CommonJS file is dist/cjs/lucide-react-native.js; its icons sit beside it.
const lucideCjs = path.dirname(require.resolve('lucide-react-native'));

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Metro resolves the tsconfig "@/…" alias itself; Jest needs it spelled out.
  moduleNameMapper: {
    // Jest resolves lucide's ES-module build (.mjs), which it can't run; use its CommonJS one.
    '^lucide-react-native/icons/(.*)$': path.join(lucideCjs, 'icons', '$1.js'),
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
