/**
 * Runtime Logger - Centralized Error Handling
 * Consistent error patterns across the application
 */

const config = require('../config');

// Custom error classes
class RuntimeError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'RuntimeError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.stack = (new Error()).stack;
  }
}

class ValidationError extends RuntimeError {
  constructor(message, field, value) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

class WorkflowError extends RuntimeError {
  constructor(message, workflowId, nodeId, details = {}) {
    super(message, 'WORKFLOW_ERROR', { workflowId, nodeId, ...details });
    this.name = 'WorkflowError';
  }
}

class PythonAgentError extends RuntimeError {
  constructor(message, agentId, details = {}) {
    super(message, 'PYTHON_AGENT_ERROR', { agentId, ...details });
    this.name = 'PythonAgentError';
  }
}

class DatabaseError extends RuntimeError {
  constructor(message, operation, details = {}) {
    super(message, 'DATABASE_ERROR', { operation, ...details });
    this.name = 'DatabaseError';
  }
}

class CircuitBreakerError extends RuntimeError {
  constructor(service, failureCount) {
    super(`Circuit breaker open for ${service} after ${failureCount} failures`, 'CIRCUIT_BREAKER');
    this.service = service;
    this.failureCount = failureCount;
  }
}

class TimeoutError extends RuntimeError {
  constructor(operation, timeout) {
    super(`Operation ${operation} timed out after ${timeout}ms`, 'TIMEOUT');
    this.operation = operation;
    this.timeout = timeout;
  }
}

class RetryError extends RuntimeError {
  constructor(operation, attempts, lastError) {
    super(`Operation ${operation} failed after ${attempts} attempts: ${lastError}`, 'MAX_RETRIES_EXCEEDED');
    this.operation = operation;
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

// Error response formatter
function formatErrorResponse(error, requestId = null) {
  const response = {
    success: false,
    error: {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: error.timestamp || new Date().toISOString()
    }
  };

  if (requestId) {
    response.requestId = requestId;
  }

  // Include details in development mode
  if (config.isDevelopment && error.details) {
    response.error.details = error.details;
    response.error.stack = error.stack;
  }

  return response;
}

// Async error wrapper
function asyncErrorHandler(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      handleError(error, req, res, next);
    }
  };
}

// Sync error wrapper
function syncErrorHandler(fn) {
  return (req, res, next) => {
    try {
      fn(req, res, next);
    } catch (error) {
      handleError(error, req, res, next);
    }
  };
}

// Central error handler
function handleError(error, req, res, next) {
  // Log error
  logError(error, req);

  // Determine HTTP status code
  let statusCode = 500;
  if (error instanceof ValidationError) {
    statusCode = 400;
  } else if (error.code === 'NOT_FOUND') {
    statusCode = 404;
  } else if (error.code === 'UNAUTHORIZED') {
    statusCode = 401;
  } else if (error.code === 'FORBIDDEN') {
    statusCode = 403;
  }

  // Send error response
  const requestId = req.id || generateRequestId();
  const errorResponse = formatErrorResponse(error, requestId);
  
  res.status(statusCode).json(errorResponse);
}

// Error logging
function logError(error, req = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    stack: error.stack,
    details: error.details || {}
  };

  if (req) {
    logEntry.request = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
  }

  // Log to console (will be enhanced with proper logging later)
  console.error('ERROR:', JSON.stringify(logEntry, null, 2));

  // Store error for debugging (will be enhanced with database later)
  storeError(logEntry);
}

// Error storage (temporary - will be enhanced with database)
const errorStore = [];
function storeError(errorEntry) {
  errorStore.push(errorEntry);
  
  // Keep only last N errors
  const maxErrors = config.config.errorHandling.maxErrorLogEntries;
  if (errorStore.length > maxErrors) {
    errorStore.splice(0, errorStore.length - maxErrors);
  }
}

// Get recent errors
function getRecentErrors(limit = 50) {
  return errorStore.slice(-limit);
}

// Clear error store
function clearErrors() {
  errorStore.length = 0;
}

// Generate request ID
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Validation helper
function validateRequired(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }
  return value;
}

// Validate type
function validateType(value, expectedType, fieldName) {
  if (typeof value !== expectedType) {
    throw new ValidationError(`${fieldName} must be of type ${expectedType}`, fieldName, typeof value);
  }
  return value;
}

// Validate range
function validateRange(value, min, max, fieldName) {
  if (value < min || value > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`, fieldName, value);
  }
  return value;
}

// Validate array
function validateArray(value, fieldName, minLength = 0, maxLength = Infinity) {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName, typeof value);
  }
  if (value.length < minLength || value.length > maxLength) {
    throw new ValidationError(`${fieldName} must have between ${minLength} and ${maxLength} items`, fieldName, value.length);
  }
  return value;
}

// Validate object
function validateObject(value, fieldName, requiredFields = []) {
  if (typeof value !== 'object' || value === null) {
    throw new ValidationError(`${fieldName} must be an object`, fieldName, typeof value);
  }
  
  for (const field of requiredFields) {
    if (!(field in value)) {
      throw new ValidationError(`${fieldName} must have field: ${field}`, fieldName, value);
    }
  }
  
  return value;
}

// Timeout wrapper
function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new TimeoutError(errorMessage, timeoutMs)), timeoutMs);
    })
  ]);
}

// Retry wrapper
async function withRetry(fn, maxRetries = 3, delay = 1000, backoff = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw new RetryError(fn.name || 'unknown', maxRetries, error.message);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= backoff; // Exponential backoff
    }
  }
  
  throw lastError;
}

// Circuit breaker wrapper
function withCircuitBreaker(fn, maxFailures = 5, resetTimeout = 60000) {
  let failures = 0;
  let lastFailureTime = 0;
  let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  
  return async (...args) => {
    const now = Date.now();
    
    // Check if circuit should reset
    if (state === 'OPEN' && now - lastFailureTime > resetTimeout) {
      state = 'HALF_OPEN';
      console.log(`Circuit breaker for ${fn.name} entering HALF_OPEN state`);
    }
    
    // Reject if circuit is open
    if (state === 'OPEN') {
      throw new CircuitBreakerError(fn.name, failures);
    }
    
    try {
      const result = await fn(...args);
      
      // Reset on success
      if (state === 'HALF_OPEN') {
        state = 'CLOSED';
        failures = 0;
        console.log(`Circuit breaker for ${fn.name} reset to CLOSED`);
      }
      
      return result;
    } catch (error) {
      failures++;
      lastFailureTime = now;
      
      if (failures >= maxFailures) {
        state = 'OPEN';
        console.log(`Circuit breaker for ${fn.name} opened after ${failures} failures`);
      }
      
      throw error;
    }
  };
}

// Combined wrapper with circuit breaker, retry, and timeout
function withResilience(fn, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryBackoff = 2,
    timeout = 30000,
    maxFailures = 5,
    resetTimeout = 60000
  } = options;
  
  const circuitBreakerFn = withCircuitBreaker(fn, maxFailures, resetTimeout);
  
  return async (...args) => {
    return withTimeout(
      withRetry(() => circuitBreakerFn(...args), maxRetries, retryDelay, retryBackoff),
      timeout,
      fn.name || 'operation'
    );
  };
}

// Global error handlers (if enabled)
if (config.config.errorHandling.enableGlobalErrorHandling) {
  process.on('uncaughtException', (error) => {
    logError(error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    const error = new RuntimeError(
      `Unhandled promise rejection: ${reason}`,
      'UNHANDLED_PROMISE_REJECTION',
      { reason, promise }
    );
    logError(error);
  });
}

module.exports = {
  // Error classes
  RuntimeError,
  ValidationError,
  WorkflowError,
  PythonAgentError,
  DatabaseError,
  CircuitBreakerError,
  TimeoutError,
  RetryError,
  
  // Error handling functions
  handleError,
  asyncErrorHandler,
  syncErrorHandler,
  formatErrorResponse,
  
  // Error logging
  logError,
  getRecentErrors,
  clearErrors,
  
  // Validation helpers
  validateRequired,
  validateType,
  validateRange,
  validateArray,
  validateObject,
  
  // Resilience patterns
  withTimeout,
  withRetry,
  withCircuitBreaker,
  withResilience,
  
  // Utility functions
  generateRequestId
};

module.exports = {
  // Error classes
  RuntimeError,
  ValidationError,
  WorkflowError,
  PythonAgentError,
  DatabaseError,
  CircuitBreakerError,
  TimeoutError,
  RetryError,
  
  // Error handling
  handleError,
  asyncErrorHandler,
  syncErrorHandler,
  formatErrorResponse,
  
  // Error logging
  logError,
  getRecentErrors,
  clearErrors,
  
  // Validation helpers
  validateRequired,
  validateType,
  validateRange,
  validateArray,
  validateObject,
  
  // Resilience patterns
  withTimeout,
  withRetry,
  withCircuitBreaker,
  withResilience,
  
  // Utility functions
  generateRequestId
};
