module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    // Transform these ESM-only packages so babel can process them
    'node_modules/(?!(zustand|firebase|@firebase/.*|nanoid|uuid))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Stub all native/expo modules — our unit tests don't need them
    '^expo-av$': '<rootDir>/__mocks__/expo-av.js',
    '^expo-notifications$': '<rootDir>/__mocks__/empty.js',
    '^expo-device$': '<rootDir>/__mocks__/empty.js',
    '^expo-constants$': '<rootDir>/__mocks__/empty.js',
    '^expo-speech$': '<rootDir>/__mocks__/empty.js',
    '^expo-linking$': '<rootDir>/__mocks__/empty.js',
    '^expo-router$': '<rootDir>/__mocks__/empty.js',
    '^expo$': '<rootDir>/__mocks__/empty.js',
    '^expo/virtual/.*$': '<rootDir>/__mocks__/expo-virtual-env.js',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/empty.js',
    '^react-native-screens$': '<rootDir>/__mocks__/empty.js',
    '^react-native-gesture-handler$': '<rootDir>/__mocks__/empty.js',
    '^react-native-reanimated$': '<rootDir>/__mocks__/empty.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage.js',
    '^@react-native-community/netinfo$': '<rootDir>/__mocks__/netinfo.js',
    '^axios$': '<rootDir>/__mocks__/axios.js',
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
