/**
 * Configuration System Tests
 * Retro-fueled with 90s configuration validation
 */

const { getConfig, validateConfig, getEnvConfig } = require('../../../src/config');
const path = require('path');

describe('Configuration System', () => {
  beforeEach(() => {
    // Clear module cache to ensure fresh config reading
    delete require.cache[require.resolve('../../../src/config')];
    
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.DB_PATH;
    delete process.env.LOG_LEVEL;
  });

  describe('getConfig()', () => {
    test('should return valid configuration with defaults', () => {
      const { getConfig } = require('../../../src/config');
      const config = getConfig();
      
      expect(config).toBeDefined();
      expect(config.server).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.workflow).toBeDefined();
      expect(config.logging).toBeDefined();
      expect(config.errorHandling).toBeDefined();
    });

    test('should use environment variables when provided', () => {
      process.env.PORT = '4000';
      process.env.LOG_LEVEL = 'error';
      process.env.DB_PATH = '/custom/path/db.sqlite';
      
      console.log('DEBUG: process.env.PORT =', process.env.PORT);
      console.log('DEBUG: process.env.LOG_LEVEL =', process.env.LOG_LEVEL);
      
      const { getConfig } = require('../../../src/config');
      const config = getConfig();
      
      console.log('DEBUG: config.server.port =', config.server.port);
      console.log('DEBUG: config.logging.level =', config.logging.level);
      
      expect(config.server.port).toBe(4000);
      expect(config.logging.level).toBe('error');
      expect(config.database.path).toBe('/custom/path/db.sqlite');
    });

    test('should validate configuration', () => {
      // Valid configuration should not throw
      expect(() => getConfig()).not.toThrow();
    });

    test('should throw error for invalid port', () => {
      process.env.PORT = 'invalid';
      
      expect(() => getConfig()).toThrow('Invalid server port configuration');
    });

    test('should throw error for invalid database type', () => {
      process.env.DB_TYPE = 'invalid';
      
      expect(() => getConfig()).toThrow('Invalid database type');
    });
  });

  describe('validateConfig()', () => {
    test('should validate correct configuration', () => {
      // Set valid environment variables
      process.env.DB_TYPE = 'sqlite';
      process.env.PYTHON_TIMEOUT = '30000';
      process.env.MAX_CONCURRENT_WORKFLOWS = '5';
      
      const { validateCurrentConfig } = require('../../../src/config');
      
      expect(() => validateCurrentConfig()).not.toThrow();
    });

    test('should detect invalid timeout values', () => {
      // Set invalid timeout
      process.env.PYTHON_TIMEOUT = '100';
      process.env.DB_TYPE = 'sqlite'; // Set valid DB type
      process.env.MAX_CONCURRENT_WORKFLOWS = '5'; // Set valid workflow limit
      
      const { validateCurrentConfig } = require('../../../src/config');
      
      expect(() => validateCurrentConfig()).toThrow('Python agent timeout must be between 1s and 5 minutes');
    });

    test('should detect invalid workflow limits', () => {
      // Set invalid workflow limit
      process.env.MAX_CONCURRENT_WORKFLOWS = '100';
      process.env.DB_TYPE = 'sqlite'; // Set valid DB type
      process.env.PYTHON_TIMEOUT = '30000'; // Set valid timeout
      
      const { validateCurrentConfig } = require('../../../src/config');
      
      expect(() => validateCurrentConfig()).toThrow('Max concurrent workflows must be between 1 and 50');
    });
  });

  describe('getEnvConfig()', () => {
    test('should return development config by default', () => {
      const config = getEnvConfig();
      
      expect(config.logging.level).toBe('debug');
      expect(config.workflow.enableDebugLogging).toBe(true);
      expect(config.security.enableCors).toBe(true);
    });

    test('should return production config', () => {
      process.env.NODE_ENV = 'production';
      
      const config = getEnvConfig();
      
      expect(config.logging.level).toBe('warn');
      expect(config.workflow.enableDebugLogging).toBe(false);
      expect(config.security.enableCors).toBe(false);
    });

    test('should return test config', () => {
      process.env.NODE_ENV = 'test';
      
      const config = getEnvConfig();
      
      expect(config.logging.level).toBe('error');
      expect(config.workflow.enableDebugLogging).toBe(false);
      expect(config.security.enableCors).toBe(true);
    });
  });

  describe('Feature Flags', () => {
    test('should have all feature flags defined', () => {
      const config = getConfig();
      
      expect(config.features).toBeDefined();
      expect(config.features.enablePythonAgent).toBeDefined();
      expect(config.features.enableNodeEditor).toBeDefined();
      expect(config.features.enableRealtimeUpdates).toBeDefined();
      expect(config.features.enableWorkflowHistory).toBeDefined();
      expect(config.features.enableUndoRedo).toBeDefined();
      expect(config.features.enablePerformanceMetrics).toBeDefined();
    });

    test('should enable features by default', () => {
      const config = getConfig();
      
      expect(config.features.enablePythonAgent).toBe(true);
      expect(config.features.enableNodeEditor).toBe(true);
      expect(config.features.enableRealtimeUpdates).toBe(true);
    });

    test('should allow disabling features', () => {
      process.env.ENABLE_PYTHON_AGENT = 'false';
      
      const config = getConfig();
      
      expect(config.features.enablePythonAgent).toBe(false);
    });
  });

  describe('Circuit Breaker Configuration', () => {
    test('should have circuit breaker settings', () => {
      const config = getConfig();
      
      expect(config.circuitBreaker).toBeDefined();
      expect(config.circuitBreaker.maxFailures).toBeDefined();
      expect(config.circuitBreaker.resetTimeout).toBeDefined();
      expect(config.circuitBreaker.monitoringInterval).toBeDefined();
    });

    test('should use default circuit breaker values', () => {
      const config = getConfig();
      
      expect(config.circuitBreaker.maxFailures).toBe(5);
      expect(config.circuitBreaker.resetTimeout).toBe(60000);
      expect(config.circuitBreaker.monitoringInterval).toBe(30000);
    });

    test('should allow custom circuit breaker values', () => {
      process.env.CIRCUIT_BREAKER_MAX_FAILURES = '10';
      process.env.CIRCUIT_BREAKER_RESET_TIMEOUT = '120000';
      
      const config = getConfig();
      
      expect(config.circuitBreaker.maxFailures).toBe(10);
      expect(config.circuitBreaker.resetTimeout).toBe(120000);
    });
  });
});
