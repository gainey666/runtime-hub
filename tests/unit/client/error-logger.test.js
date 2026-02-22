/**
 * @jest-environment jsdom
 */

/**
 * Error Logger Unit Tests
 * Retro-fueled with 90s debugging nostalgia
 */

const fs = require('fs');
const path = require('path');

// Mock fs for testing
jest.mock('fs');

describe('Error Logger', () => {
  let mockConsole;
  let originalConsole;

  beforeEach(() => {
    // Mock console methods
    mockConsole = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn()
    };
    originalConsole = global.console;
    global.console = mockConsole;

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });

    // Mock Date.now
    jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // 2022-01-01 00:00:00

    // Mock performance.now
    Object.defineProperty(window, 'performance', {
      value: {
        now: jest.fn(() => 123.456)
      },
      writable: true
    });

    // Mock navigator
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Test Browser/1.0',
        platform: 'Test Platform'
      },
      writable: true
    });
  });

  afterEach(() => {
    global.console = originalConsole;
    jest.restoreAllMocks();
  });

  describe('ErrorLogger Class', () => {
    test('should initialize with default values', () => {
      // Import after mocks are set up
      delete require.cache[require.resolve('../../../public/error-logger.js')];
      const { ErrorLogger } = require('../../../public/error-logger.js');

      const logger = new ErrorLogger();

      expect(logger.logs).toEqual([]);
      expect(logger.errors).toEqual([]);
      expect(logger.warnings).toEqual([]);
      expect(logger.info).toEqual([]);
      expect(logger.maxLogs).toBe(1000);
      expect(logger.autoExport).toBe(true);
    });

    test('should log errors', () => {
      const { ErrorLogger } = require('../../../public/error-logger.js');
      const logger = new ErrorLogger();

      const testError = new Error('Test error');
      logger.logError('Test Error Type', { message: 'Test message', error: testError });

      expect(logger.errors).toHaveLength(1);
      expect(logger.errors[0].type).toBe('Test Error Type');
      expect(logger.errors[0].data.message).toBe('Test message');
      expect(logger.errors[0].timestamp).toBeDefined();
    });

    test('should log warnings', () => {
      const { ErrorLogger } = require('../../../public/error-logger.js');
      const logger = new ErrorLogger();

      logger.logWarning('Test Warning Type', { message: 'Test warning' });

      expect(logger.warnings).toHaveLength(1);
      expect(logger.warnings[0].type).toBe('Test Warning Type');
      expect(logger.warnings[0].data.message).toBe('Test warning');
    });

    test('should log info messages', () => {
      const { ErrorLogger } = require('../../../public/error-logger.js');
      const logger = new ErrorLogger();

      logger.logInfo('Test Info Type', { message: 'Test info' });

      expect(logger.info).toHaveLength(1);
      expect(logger.info[0].type).toBe('Test Info Type');
      expect(logger.info[0].data.message).toBe('Test info');
    });

    test('should get debug summary', () => {
      const { ErrorLogger } = require('../../../public/error-logger.js');
      const logger = new ErrorLogger();

      // Add test data
      logger.logError('Error 1', { msg: 'error1' });
      logger.logError('Error 2', { msg: 'error2' });
      logger.logWarning('Warning 1', { msg: 'warning1' });
      logger.logInfo('Info 1', { msg: 'info1' });

      const summary = logger.getDebugSummary();

      expect(summary.totalErrors).toBe(2);
      expect(summary.totalWarnings).toBe(1);
      expect(summary.totalInfo).toBe(1);
      expect(summary.totalLogs).toBe(4);
      expect(summary.errorTypes).toContain('Error 1');
      expect(summary.errorTypes).toContain('Error 2');
      expect(summary.warningTypes).toContain('Warning 1');
      expect(summary.infoTypes).toContain('Info 1');
    });

    test('should clear logs', () => {
      const { ErrorLogger } = require('../../../public/error-logger.js');
      const logger = new ErrorLogger();

      // Add test data
      logger.logError('Test Error', { message: 'test' });
      logger.logWarning('Test Warning', { message: 'test' });
      logger.logInfo('Test Info', { message: 'test' });

      expect(logger.errors).toHaveLength(1);
      expect(logger.warnings).toHaveLength(1);
      expect(logger.info).toHaveLength(1);

      logger.clearLogs();

      expect(logger.errors).toEqual([]);
      expect(logger.warnings).toEqual([]);
      expect(logger.info).toEqual([]);
    });

    test('should limit log storage', () => {
      const { ErrorLogger } = require('../../../public/error-logger.js');
      const logger = new ErrorLogger();
      logger.maxLogs = 3;

      // Add 5 errors
      for (let i = 0; i < 5; i++) {
        logger.logError(`Error ${i}`, { message: `error${i}` });
      }

      expect(logger.errors).toHaveLength(3);
      expect(logger.errors[0].type).toBe('Error 2'); // Oldest remaining
      expect(logger.errors[2].type).toBe('Error 4'); // Newest
    });
  });

  describe('Global Error Capture', () => {
    test('should capture unhandled errors', () => {
      const { ErrorLogger } = require('../../../public/error-logger.js');
      const logger = new ErrorLogger();

      // Simulate unhandled error
      const testError = new Error('Unhandled error');
      window.dispatchEvent(new ErrorEvent('error', { error: testError }));

      // Error should be captured (this might need actual implementation testing)
      expect(mockConsole.error).toHaveBeenCalled();
    });

    test('should capture unhandled promise rejections', () => {
      const { ErrorLogger } = require('../../../public/error-logger.js');
      const logger = new ErrorLogger();

      // Simulate unhandled promise rejection
      const testError = new Error('Unhandled promise rejection');
      window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(testError),
        reason: testError
      }));

      // Error should be captured
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('Global Instance', () => {
    test('should expose global errorLogger instance', () => {
      const { errorLogger } = require('../../../public/error-logger.js');

      expect(errorLogger).toBeDefined();
      expect(errorLogger).toBeInstanceOf(require('../../../public/error-logger.js').ErrorLogger);
    });

    test('should expose global exportDebugData function', () => {
      const { exportDebugData } = require('../../../public/error-logger.js');

      expect(typeof exportDebugData).toBe('function');
    });
  });

  describe('BeforeUnload Handler', () => {
    test('should export debug data on page unload', () => {
      const mockExport = jest.fn();
      const { ErrorLogger } = require('../../../public/error-logger.js');
      const logger = new ErrorLogger();
      logger.exportDebugData = mockExport;

      // Simulate beforeunload event
      window.dispatchEvent(new Event('beforeunload'));

      expect(mockExport).toHaveBeenCalled();
    });
  });

  describe('DOMContentLoaded Initialization', () => {
    test('should add debug button on DOM ready', () => {
      // Mock document methods
      const mockButton = { onclick: null, innerHTML: '' };
      document.createElement = jest.fn(() => mockButton);
      document.body = { appendChild: jest.fn() };
      document.querySelector = jest.fn(() => ({ appendChild: jest.fn() }));

      // Reset module and import
      delete require.cache[require.resolve('../../../public/error-logger.js')];
      require('../../../public/error-logger.js');

      // Simulate DOMContentLoaded
      document.dispatchEvent(new Event('DOMContentLoaded'));

      expect(document.createElement).toHaveBeenCalledWith('button');
      expect(mockButton.onclick).toBeDefined();
    });
  });

  describe('Console Capture', () => {
    test('should capture console.log calls', () => {
      const { ErrorLogger } = require('../../../public/error-logger.js');
      const logger = new ErrorLogger();

      // Enable console capture
      logger.setupConsoleCapture();

      // Log something
      console.log('Test log message');

      expect(logger.logs).toHaveLength(1);
      expect(logger.logs[0].message).toBe('Test log message');
    });

    test('should capture console.error calls', () => {
      const { ErrorLogger } = require('../../../public/error-logger.js');
      const logger = new ErrorLogger();

      // Enable console capture
      logger.setupConsoleCapture();

      // Log error
      console.error('Test error message');

      expect(logger.errors).toHaveLength(1);
      expect(logger.errors[0].data.message).toBe('Test error message');
    });

    test('should capture console.warn calls', () => {
      const { ErrorLogger } = require('../../../public/error-logger.js');
      const logger = new ErrorLogger();

      // Enable console capture
      logger.setupConsoleCapture();

      // Log warning
      console.warn('Test warning message');

      expect(logger.warnings).toHaveLength(1);
      expect(logger.warnings[0].data.message).toBe('Test warning message');
    });
  });

  describe('Server Status Capture', () => {
    test('should capture server status', async () => {
      // Mock fetch
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'healthy',
            uptime: 123.456,
            memory: { heapUsed: 50000000 }
          })
        })
      );

      const { ErrorLogger } = require('../../../public/error-logger.js');
      const logger = new ErrorLogger();

      const serverStatus = await logger.captureServerStatus();

      expect(serverStatus.status).toBe('healthy');
      expect(serverStatus.uptime).toBe(123.456);
      expect(serverStatus.memory.heapUsed).toBe(50000000);
    });

    test('should handle server status fetch failure', async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      );

      const { ErrorLogger } = require('../../../public/error-logger.js');
      const logger = new ErrorLogger();

      const serverStatus = await logger.captureServerStatus();

      expect(serverStatus.error).toBe('Network error');
      expect(serverStatus.timestamp).toBeDefined();
    });
  });
});
