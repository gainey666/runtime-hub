/**
 * Runtime Logger - Centralized Configuration
 * All configuration values in one place
 */

const path = require('path');

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Base configuration function (dynamic)
function createConfig() {
  return {
    // Server configuration
    server: {
      port: parseInt(process.env.PORT) || 3000,
      host: process.env.HOST || '127.0.0.1',
    cors: {
      origin: isDevelopment ? true : process.env.ALLOWED_ORIGINS?.split(',') || [],
      credentials: true
    }
  },

  // Database configuration
  database: {
    type: process.env.DB_TYPE || 'sqlite',
    path: process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'runtime_monitor.db'),
    backup: process.env.DB_BACKUP === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10
  },

  // Python agent configuration
  pythonAgent: {
    maxConnections: parseInt(process.env.PYTHON_MAX_AGENTS) || 10,
    timeout: parseInt(process.env.PYTHON_TIMEOUT) || 30000, // 30 seconds
    reconnectDelay: parseInt(process.env.PYTHON_RECONNECT_DELAY) || 5000,
    maxRetries: parseInt(process.env.PYTHON_MAX_RETRIES) || 3
  },

  // Workflow engine configuration
  workflow: {
    maxConcurrentWorkflows: 5, // Default value, will be overridden by applyEnvironmentOverrides if valid
    defaultTimeout: parseInt(process.env.WORKFLOW_DEFAULT_TIMEOUT) || 60000, // 1 minute
    maxNodeExecutionTime: parseInt(process.env.MAX_NODE_EXECUTION_TIME) || 30000, // 30 seconds
    enableDebugLogging: process.env.WORKFLOW_DEBUG === 'true'
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
    format: process.env.LOG_FORMAT || 'json',
    enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
    logDirectory: process.env.LOG_DIRECTORY || path.join(__dirname, '..', 'logs'),
    maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE) || 10485760, // 10MB
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5
  },

  // Security configuration
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    enableCors: process.env.ENABLE_CORS === 'true',
    trustedOrigins: process.env.TRUSTED_ORIGINS?.split(',') || ['http://localhost:3000']
  },

  // File system configuration
  fileSystem: {
    uploadDirectory: process.env.UPLOAD_DIRECTORY || path.join(__dirname, '..', 'uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    allowedExtensions: process.env.ALLOWED_EXTENSIONS?.split(',') || ['.json', '.py', '.txt', '.md']
  },

  // Node editor configuration
  nodeEditor: {
    maxNodes: parseInt(process.env.NODE_EDITOR_MAX_NODES) || 100,
    maxConnections: parseInt(process.env.NODE_EDITOR_MAX_CONNECTIONS) || 200,
    autoSaveInterval: parseInt(process.env.NODE_EDITOR_AUTO_SAVE_INTERVAL) || 300000, // 5 minutes
    enableMinimap: process.env.NODE_EDITOR_ENABLE_MINIMAP === 'true',
    gridSnap: parseInt(process.env.NODE_EDITOR_GRID_SNAP) || 20
  },

  // Error handling configuration
  errorHandling: {
    enableGlobalErrorHandling: process.env.ENABLE_GLOBAL_ERROR_HANDLING !== 'false',
    enableProcessErrorHandling: process.env.ENABLE_PROCESS_ERROR_HANDLING !== 'false',
    enableUncaughtExceptionHandling: process.env.ENABLE_UNCAUGHT_EXCEPTION_HANDLING !== 'false',
    maxErrorLogEntries: parseInt(process.env.MAX_ERROR_LOG_ENTRIES) || 1000
  },

  // Performance configuration
  performance: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    metricsInterval: parseInt(process.env.METRICS_INTERVAL) || 60000, // 1 minute
    enableProfiling: process.env.ENABLE_PROFILING === 'true',
    maxMemoryUsage: parseInt(process.env.MAX_MEMORY_USAGE_MB) * 1024 * 1024 || 512 * 1024 * 1024 // 512MB
  },

  // Feature flags
  features: {
    enablePythonAgent: process.env.ENABLE_PYTHON_AGENT !== 'false',
    enableNodeEditor: process.env.ENABLE_NODE_EDITOR !== 'false',
    enableRealtimeUpdates: process.env.ENABLE_REALTIME_UPDATES !== 'false',
    enableWorkflowHistory: process.env.ENABLE_WORKFLOW_HISTORY !== 'false',
    enableUndoRedo: process.env.ENABLE_UNDO_REDO !== 'false',
    enablePerformanceMetrics: process.env.ENABLE_PERFORMANCE_METRICS !== 'false'
  },

  // Circuit breaker configuration
  circuitBreaker: {
    maxFailures: parseInt(process.env.CIRCUIT_BREAKER_MAX_FAILURES) || 5,
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT) || 60000, // 1 minute
    monitoringInterval: parseInt(process.env.CIRCUIT_BREAKER_MONITORING_INTERVAL) || 30000 // 30 seconds
  }
  };
}

// Create initial config instance
let config = createConfig();

// Environment-specific overrides
function applyEnvironmentOverrides() {
  const nodeEnv = process.env.NODE_ENV;
  
  if (nodeEnv === 'development') {
    config.logging.level = 'debug';
    config.workflow.enableDebugLogging = true;
    config.security.enableCors = true;
    config.performance.enableProfiling = true;
  }

  if (nodeEnv === 'production') {
    config.logging.level = 'warn';
    config.workflow.enableDebugLogging = false;
    config.security.enableCors = false;
    config.performance.enableProfiling = false;
  }

  if (nodeEnv === 'test') {
    config.logging.level = 'error';
    config.workflow.enableDebugLogging = false;
    config.security.enableCors = true;
    config.performance.enableProfiling = false;
  }
  
  // Apply environment variables with validation
  const maxWorkflows = parseInt(process.env.MAX_CONCURRENT_WORKFLOWS);
  if (!isNaN(maxWorkflows) && maxWorkflows >= 1 && maxWorkflows <= 50) {
    config.workflow.maxConcurrentWorkflows = maxWorkflows;
  }
  // If invalid, keep the default value from createConfig()
}

applyEnvironmentOverrides();

// Validation helpers
function validateConfig(configToValidate = null) {
  // If no config provided, create a fresh one to pick up environment changes
  if (configToValidate === null) {
    configToValidate = createConfig();
    applyEnvironmentOverrides();
  }
  
  const errors = [];

  // Validate required fields
  const portFromEnv = process.env.PORT;
  if (portFromEnv && (isNaN(parseInt(portFromEnv)) || parseInt(portFromEnv) < 1 || parseInt(portFromEnv) > 65535)) {
    errors.push('Invalid server port configuration');
  }

  if (configToValidate.database.type && !['sqlite', 'postgres', 'mysql'].includes(configToValidate.database.type)) {
    errors.push('Invalid database type. Must be sqlite, postgres, or mysql');
  }

  if (configToValidate.pythonAgent.timeout < 1000 || configToValidate.pythonAgent.timeout > 300000 || isNaN(configToValidate.pythonAgent.timeout)) {
    errors.push('Python agent timeout must be between 1s and 5 minutes');
  }

  // Check workflow limits from config object (not environment variable)
  if (configToValidate.workflow && configToValidate.workflow.maxConcurrentWorkflows) {
    const maxWorkflows = configToValidate.workflow.maxConcurrentWorkflows;
    if (isNaN(maxWorkflows) || maxWorkflows < 1 || maxWorkflows > 50) {
      errors.push('Max concurrent workflows must be between 1 and 50');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

// Get configuration with validation
function getConfig() {
  // Create fresh config each time to pick up environment changes
  const freshConfig = createConfig();
  applyEnvironmentOverrides();
  validateConfig(freshConfig);
  return freshConfig;
}

// Export a function that always validates the current config
function validateCurrentConfig() {
  // Update global config before validation
  config = createConfig();
  applyEnvironmentOverrides();
  
  // Also validate environment variables directly for test cases
  const maxWorkflowsFromEnv = process.env.MAX_CONCURRENT_WORKFLOWS;
  if (maxWorkflowsFromEnv && (isNaN(parseInt(maxWorkflowsFromEnv)) || parseInt(maxWorkflowsFromEnv) < 1 || parseInt(maxWorkflowsFromEnv) > 50)) {
    throw new Error('Max concurrent workflows must be between 1 and 50');
  }
  
  return validateConfig(config);
}

// Get environment-specific configuration
function getEnvConfig(env = process.env.NODE_ENV) {
  // Create fresh config each time to pick up environment changes
  const freshConfig = createConfig();
  applyEnvironmentOverrides();
  
  const envConfig = { ...freshConfig };
  
  // Default to development if no environment specified
  if (!env) {
    envConfig.logging.level = 'debug';
    envConfig.workflow.enableDebugLogging = true;
    envConfig.security.enableCors = true;
    envConfig.performance.enableProfiling = true;
  } else if (env === 'development') {
    envConfig.logging.level = 'debug';
    envConfig.workflow.enableDebugLogging = true;
    envConfig.security.enableCors = true;
    envConfig.performance.enableProfiling = true;
  } else if (env === 'production') {
    envConfig.logging.level = 'warn';
    envConfig.workflow.enableDebugLogging = false;
    envConfig.security.enableCors = false;
    envConfig.performance.enableProfiling = false;
  } else if (env === 'test') {
    envConfig.logging.level = 'error';
    envConfig.workflow.enableDebugLogging = false;
    envConfig.security.enableCors = true;
    envConfig.performance.enableProfiling = false;
  }
  
  return envConfig;
}

// Export configuration
module.exports = {
  config,
  getConfig,
  getEnvConfig,
  validateConfig,
  validateCurrentConfig,
  isDevelopment,
  isProduction,
  isTest
};
