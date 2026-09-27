module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/scripts/**'],
  verbose: true,
  forceExit: true,
  testTimeout: 30000,
};
