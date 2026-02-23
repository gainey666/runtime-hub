/**
 * Jest Configuration for Workflow Engine Tests
 */

module.exports = {
    testEnvironment: 'node',
    testTimeout: 15000, // 15 seconds per test
    setupFilesAfterEnv: ['<rootDir>/../../setup.js'],
    testMatch: ['<rootDir>/**/*.test.js'],
    collectCoverageFrom: [
        '<rootDir>/../../src/',
        '!<rootDir>/../../src/core/',
        '!<rootDir>/../../src/auto-clicker/'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    verbose: true,
    detectOpenHandles: false
};
