module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Verträge und die wenigen Tests neben dem Code, den sie prüfen.
  testMatch: ['**/pact/**/*.pact.test.ts', '**/src/**/*.test.ts'],
  setupFiles: ['<rootDir>/pact/env.ts'],
  setupFilesAfterEnv: ['<rootDir>/pact/reset.ts'],
  moduleNameMapper: {
    '^expo-secure-store$': '<rootDir>/pact/stubs/expoSecureStore.ts',
    '^expo-localization$': '<rootDir>/pact/stubs/expoLocalization.ts',
  },
};
