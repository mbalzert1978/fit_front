module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/pact/**/*.pact.test.ts'],
  setupFiles: ['<rootDir>/pact/env.ts'],
  setupFilesAfterEnv: ['<rootDir>/pact/reset.ts'],
  moduleNameMapper: {
    '^expo-secure-store$': '<rootDir>/pact/stubs/expoSecureStore.ts',
  },
};
