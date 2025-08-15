module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'server.js',
    '**/*.js',
    '!**/node_modules/**',
    '!**/client/**',
    '!**/venv/**',
    '!**/__tests__/**',
    '!**/*.config.js',
    '!**/*.sh'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 87,
      statements: 87
    }
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/test-setup.js'],
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
}; 