module.exports = {
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
      setupFiles: ['<rootDir>/src/tests/jest.setup.js'],
      // Coverage settings only for unit tests
      collectCoverage: false, // Coverage is collected only when --coverage flag is used
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
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      },
      transform: {
        '^.+\\.js$': 'babel-jest'
      },
      testTimeout: 10000
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/tests/integration/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/tests/integration.setup.js'],
      setupFiles: ['<rootDir>/src/tests/jest.setup.js'],
      // No coverage for integration tests - options removed entirely
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      },
      transform: {
        '^.+\\.js$': 'babel-jest'
      },
      testTimeout: 10000
    }
  ]
};