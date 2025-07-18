module.exports = {
  // Root level options that apply to all projects
  testTimeout: 10000,
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(three|three-csg-ts))'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  
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
      collectCoverageFrom: [
        'src/**/*.js',
        '!src/tests/**',
        '!src/**/*.test.js',
        '!src/**/*.spec.js'
      ],
      coverageDirectory: 'coverage',
      coverageThreshold: {
        global: {
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/tests/integration/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/tests/integration.setup.js'],
      setupFiles: ['<rootDir>/src/tests/jest.setup.js']
    }
  ]
};