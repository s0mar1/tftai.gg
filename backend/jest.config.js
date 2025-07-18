import baseConfig from '../jest.config.base.js';

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  ...baseConfig,
  // Backend-specific overrides
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  
  transform: {
    '^.+\.tsx?$': ['ts-jest', { useESM: true }],
  },
  
  testMatch: [
    '**/src/**/*.test.ts',
  ],
  
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/types/**/*.ts',
    '!**/__tests__/**'
  ],
  
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};