/**
 * Data Transform Plugin Tests
 */

const { executeDataTransform, validateInput, getAvailableOperations } = require('../../plugins/data-transform-plugin/index.js');

describe('Data Transform Plugin', () => {
  let mockNode;
  let mockWorkflow;
  let mockConnections;

  beforeEach(() => {
    mockNode = {
      id: 'test-transform',
      type: 'Data Transform',
      config: {
        operation: 'uppercase',
        defaultValue: ''
      }
    };
    
    mockWorkflow = {
      id: 'test-workflow',
      cancelled: false,
      nodes: [mockNode],
      connections: [],
      io: {},
      emitFn: () => {},
      context: {
        runId: 'test-run',
        variables: {},
        values: {},
        assetsDir: './test'
      },
      executionState: new Map()
    };
    
    mockConnections = [];
  });

  describe('executeDataTransform', () => {
    describe('uppercase operation', () => {
      test('should convert string to uppercase', async () => {
        const inputs = { input: 'hello world' };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toBe('HELLO WORLD');
        expect(result.operation).toBe('uppercase');
        expect(result.original).toBe('hello world');
      });

      test('should convert number to uppercase string', async () => {
        const inputs = { input: 123 };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toBe('123');
      });

      test('should convert object to uppercase string', async () => {
        const inputs = { input: { test: 'value' } };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toBe('[OBJECT OBJECT]');
      });
    });

    describe('lowercase operation', () => {
      test('should convert string to lowercase', async () => {
        mockNode.config.operation = 'lowercase';
        const inputs = { input: 'HELLO WORLD' };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toBe('hello world');
      });

      test('should handle mixed case', async () => {
        mockNode.config.operation = 'lowercase';
        const inputs = { input: 'HeLLo WoRLd' };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toBe('hello world');
      });
    });

    describe('trim operation', () => {
      test('should remove leading and trailing whitespace', async () => {
        mockNode.config.operation = 'trim';
        const inputs = { input: '  hello world  ' };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toBe('hello world');
      });

      test('should handle only leading whitespace', async () => {
        mockNode.config.operation = 'trim';
        const inputs = { input: '  hello world' };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toBe('hello world');
      });

      test('should handle only trailing whitespace', async () => {
        mockNode.config.operation = 'trim';
        const inputs = { input: 'hello world  ' };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toBe('hello world');
      });
    });

    describe('parse-as-number operation', () => {
      test('should parse valid number string', async () => {
        mockNode.config.operation = 'parse-as-number';
        const inputs = { input: '123.45' };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toBe(123.45);
        expect(typeof result.output).toBe('number');
      });

      test('should parse integer string', async () => {
        mockNode.config.operation = 'parse-as-number';
        const inputs = { input: '42' };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toBe(42);
      });

      test('should pass through number input', async () => {
        mockNode.config.operation = 'parse-as-number';
        const inputs = { input: 99 };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toBe(99);
      });

      test('should return error for invalid number string', async () => {
        mockNode.config.operation = 'parse-as-number';
        const inputs = { input: 'not a number' };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Cannot parse "not a number" as number');
        expect(result.original).toBe('not a number');
      });

      test('should return error for non-string/non-number input', async () => {
        mockNode.config.operation = 'parse-as-number';
        const inputs = { input: { object: 'value' } };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Cannot parse object as number');
      });
    });

    describe('parse-as-json operation', () => {
      test('should parse valid JSON string', async () => {
        mockNode.config.operation = 'parse-as-json';
        const inputs = { input: '{"name": "John", "age": 30}' };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toEqual({ name: 'John', age: 30 });
        expect(typeof result.output).toBe('object');
      });

      test('should parse JSON array', async () => {
        mockNode.config.operation = 'parse-as-json';
        const inputs = { input: '[1, 2, 3]' };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toEqual([1, 2, 3]);
        expect(Array.isArray(result.output)).toBe(true);
      });

      test('should pass through object input', async () => {
        mockNode.config.operation = 'parse-as-json';
        const inputs = { input: { existing: 'object' } };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toEqual({ existing: 'object' });
      });

      test('should return error for invalid JSON string', async () => {
        mockNode.config.operation = 'parse-as-json';
        const inputs = { input: '{invalid json}' };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid JSON');
        expect(result.original).toBe('{invalid json}');
      });

      test('should return error for non-string/non-object input', async () => {
        mockNode.config.operation = 'parse-as-json';
        const inputs = { input: 123 };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Cannot parse number as JSON');
      });
    });

    describe('default value handling', () => {
      test('should use default value for empty string input', async () => {
        mockNode.config.defaultValue = 'default value';
        const inputs = { input: '' };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toBe('DEFAULT VALUE');
      });

      test('should use default value for null input', async () => {
        mockNode.config.defaultValue = 'default value';
        const inputs = { input: null };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toBe('DEFAULT VALUE');
      });

      test('should use default value for undefined input', async () => {
        mockNode.config.defaultValue = 'default value';
        const inputs = {};
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(true);
        expect(result.output).toBe('DEFAULT VALUE');
      });
    });

    describe('error handling', () => {
      test('should handle unknown operation', async () => {
        mockNode.config.operation = 'unknown';
        const inputs = { input: 'test' };
        
        const result = await executeDataTransform(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Unknown operation: unknown');
      });
    });
  });

  describe('validateInput', () => {
    test('should validate null input', () => {
      const result = validateInput(null, 'uppercase');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input cannot be null or undefined');
    });

    test('should validate undefined input', () => {
      const result = validateInput(undefined, 'uppercase');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input cannot be null or undefined');
    });

    test('should validate number string for parse-as-number', () => {
      const result = validateInput('123.45', 'parse-as-number');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid number string for parse-as-number', () => {
      const result = validateInput('not a number', 'parse-as-number');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input must be a valid number string');
    });

    test('should validate JSON string for parse-as-json', () => {
      const result = validateInput('{"key": "value"}', 'parse-as-json');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid JSON string for parse-as-json', () => {
      const result = validateInput('{invalid json}', 'parse-as-json');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input must be valid JSON');
    });
  });

  describe('getAvailableOperations', () => {
    test('should return all available operations', () => {
      const operations = getAvailableOperations();
      
      expect(operations).toHaveLength(5);
      expect(operations.map(op => op.name)).toEqual([
        'uppercase',
        'lowercase', 
        'trim',
        'parse-as-number',
        'parse-as-json'
      ]);
    });

    test('should include operation details', () => {
      const operations = getAvailableOperations();
      
      const uppercaseOp = operations.find(op => op.name === 'uppercase');
      expect(uppercaseOp.description).toBe('Convert string to uppercase');
      expect(uppercaseOp.inputTypes).toContain('string');
      expect(uppercaseOp.outputType).toBe('string');
    });
  });
});
