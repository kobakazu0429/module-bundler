'use strict';

module.exports = /** @type {import('@jest/types').Config.InitialOptions} */ ({
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js'],
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/tests/**/*.test.js'],
});