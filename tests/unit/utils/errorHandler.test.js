/**
 * Error Handler Tests
 * Retro-fueled with 80s sitcom problem solving
 */

const {
  RuntimeError,
  ValidationError,
  WorkflowError,
  PythonAgentError,
  DatabaseError,
  CircuitBreakerError,
  TimeoutError,
  RetryError,
  formatErrorResponse,
  validateRequired,
  validateType,
  validateRange,
  validateArray,
  validateObject,
  withTimeout,
  withRetry,
  withCircuitBreaker,
  withResilience
} = require('../../../src/utils/errorHandler');

// TODO: Add targeted mock for timeout validator if needed after Babel setup is confirmed working

describe('Error Handler Utilities', () => {
  describe('Custom Errors', () => {
    test('RuntimeError should capture message and code', () => {
      const error = new RuntimeError('Test error', 'TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.timestamp).toBeDefined();
    });

    test('ValidationError should include field and value', () => {
      const error = new ValidationError('Invalid field', 'name', null);
      expect(error.name).toBe('ValidationError');
      expect(error.details.field).toBe('name');
      expect(error.details.value).toBeNull();
    });

    test('WorkflowError should capture workflow details', () => {
      const error = new WorkflowError('Workflow failed', 'wf1', 'node1', { status: 'error' });
      expect(error.details.workflowId).toBe('wf1');
      expect(error.details.nodeId).toBe('node1');
      expect(error.details.status).toBe('error');
    });

    test('PythonAgentError should include agent info', () => {
      const error = new PythonAgentError('Agent failed', 'agent1', { timeout: true });
      expect(error.details.agentId).toBe('agent1');
      expect(error.details.timeout).toBe(true);
    });

    test('DatabaseError should capture operation', () => {
      const error = new DatabaseError('DB error', 'read', { table: 'users' });
      expect(error.details.operation).toBe('read');
      expect(error.details.table).toBe('users');
    });

    test('CircuitBreakerError should include service and failures', () => {
      const error = new CircuitBreakerError('ServiceA', 5);
      expect(error.service).toBe('ServiceA');
      expect(error.failureCount).toBe(5);
    });

    test('TimeoutError should include operation and timeout', () => {
      const error = new TimeoutError('OperationA', 3000);
      expect(error.operation).toBe('OperationA');
      expect(error.timeout).toBe(3000);
    });

    test('RetryError should include attempts and last error', () => {
      const error = new RetryError('OperationB', 3, 'Failed');
      expect(error.attempts).toBe(3);
      expect(error.lastError).toBe('Failed');
    });
  });

  describe('Validation Helpers', () => {
    test('validateRequired should throw on missing value', () => {
      expect(() => validateRequired(null, 'field')).toThrow('field is required');
    });

    test('validateRequired should return value when present', () => {
      expect(validateRequired('value', 'field')).toBe('value');
    });

    test('validateType should enforce type', () => {
      expect(() => validateType('string', 'number', 'field')).toThrow('field must be of type number');
      expect(validateType(123, 'number', 'field')).toBe(123);
    });

    test('validateRange should enforce range', () => {
      expect(() => validateRange(5, 10, 20, 'field')).toThrow('field must be between 10 and 20');
      expect(validateRange(15, 10, 20, 'field')).toBe(15);
    });

    test('validateArray should enforce array type and length', () => {
      expect(() => validateArray('not-array', 'field')).toThrow('field must be an array');
      expect(() => validateArray([], 'field', 1)).toThrow('field must have between 1 and Infinity items');
      expect(validateArray([1], 'field')).toEqual([1]);
    });

    test('validateObject should enforce object shape', () => {
      expect(() => validateObject(null, 'field')).toThrow('field must be an object');
      expect(() => validateObject({}, 'field', ['required'])).toThrow('field must have field: required');
      expect(validateObject({ required: true }, 'field', ['required'])).toEqual({ required: true });
    });
  });

  describe('Resilience Patterns', () => {
    test('withTimeout should resolve within timeout', async () => {
      const result = await withTimeout(Promise.resolve('success'), 1000, 'test');
      expect(result).toBe('success');
    });

    test('withTimeout should reject on timeout', async () => {
      await expect(withTimeout(new Promise(resolve => setTimeout(resolve, 500)), 100, 'test')).rejects.toThrow(TimeoutError);
    });

    test('withRetry should retry failed operations', async () => {
      let attempts = 0;
      const fn = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) throw new Error('fail');
        return 'success';
      });

      const result = await withRetry(fn, 3, 10);
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    test('withRetry should throw after max attempts', async () => {
      const fn = jest.fn().mockImplementation(() => {
        throw new Error('fail');
      });

      await expect(withRetry(fn, 2, 10)).rejects.toThrow(RetryError);
    });

    test('withCircuitBreaker should open after failures', async () => {
      const fn = jest.fn().mockImplementation(() => {
        throw new Error('fail');
      });

      const breakerFn = withCircuitBreaker(fn, 2, 1000);

      await expect(breakerFn()).rejects.toThrow('fail');
      await expect(breakerFn()).rejects.toThrow('fail');
      await expect(breakerFn()).rejects.toThrow(CircuitBreakerError);
    });

    test('withResilience should combine retry and timeout', async () => {
      let attempts = 0;
      const fn = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) throw new Error('fail');
        return 'success';
      });

      const result = await withResilience(fn, { maxRetries: 3, retryDelay: 10, timeout: 1000 });
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });
  });

  describe('formatErrorResponse()', () => {
    test('should include error message and code', () => {
      const error = new RuntimeError('Test error', 'TEST_ERROR');
      const response = formatErrorResponse(error, 'req_123');

      expect(response.success).toBe(false);
      expect(response.error.message).toBe('Test error');
      expect(response.error.code).toBe('TEST_ERROR');
      expect(response.requestId).toBe('req_123');
    });

    test('should include stack in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new RuntimeError('Dev error', 'DEV_ERROR');
      const response = formatErrorResponse(error);

      expect(response.error.stack).toBeDefined();
    });
  });
});
