import type { Config } from 'jest';

const config: Config = {
  preset:              'ts-jest',
  testEnvironment:     'node',
  roots:               ['<rootDir>/src/__tests__'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'CommonJS' } }],
  },
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/app/api/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      lines:     70,
      functions: 70,
      branches:  60,
    },
  },
};

export default config;
