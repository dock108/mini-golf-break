module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '**/src/tests/**/*.test.js',
    '**/src/tests/integration/**/*.test.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/src/tests/setup.js',
    '/src/tests/.*Test.js$',
    '/tests/uat/'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  testTimeout: 10000,
  setupFiles: ['<rootDir>/src/tests/jest.setup.js'],
  // Separate projects for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/tests/**/*.test.js'],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/src/tests/integration/',
        '/src/tests/setup.js',
        '/src/tests/.*Test.js$'
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
      setupFiles: ['<rootDir>/src/tests/jest.setup.js']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/tests/integration/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
      setupFiles: ['<rootDir>/src/tests/jest.setup.js'],
      coverageThreshold: {} // No coverage requirements for integration tests
    }
  ]
};