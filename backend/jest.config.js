export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'services/**/*.js',
    'validators/**/*.js',
    'middleware/**/*.js',
    'controllers/**/*.js',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
