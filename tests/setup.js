/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  /**
   * Wait for a specified amount of time
   * @param {number} ms - Milliseconds to wait
   */
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Create a mock auto-clicker configuration
   */
  createMockConfig: () => ({
    area: { x: 0, y: 0, width: 800, height: 600 },
    ocr: { engine: 'simple', language: ['eng'], confidence: 0.7 },
    click: { button: 'left', clickType: 'single' },
    refreshRate: 500,
    targetPattern: 'number'
  }),

  /**
   * Create a mock session data
   */
  createMockSession: () => ({
    id: 'test-session-123',
    status: 'running',
    startTime: Date.now(),
    config: global.testUtils.createMockConfig(),
    totalClicks: 0,
    errors: []
  }),

  /**
   * Check if servers are running
   */
  checkServers: async () => {
    try {
      const response = await fetch('http://localhost:3001/health');
      return response.ok;
    } catch (error) {
      return false;
    }
  }
};

// Setup and teardown hooks
beforeAll(async () => {
  // Ensure test environment is ready
  console.log('🧪 Setting up test environment...');
});

afterAll(async () => {
  // Clean up test environment
  console.log('🧪 Cleaning up test environment...');
});

// Increase timeout for integration tests
jest.setTimeout(30000);
