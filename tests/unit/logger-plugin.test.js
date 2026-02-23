/**
 * Logger Plugin Tests
 */

const { executeLogger, getLogs, clearLogs, logStorage } = require('../../plugins/logger-plugin/index.js');

describe('Logger Plugin', () => {
  let mockNode;
  let mockWorkflow;
  let mockConnections;

  beforeEach(() => {
    // Clear log storage before each test
    logStorage.length = 0;
    
    mockNode = {
      id: 'test-logger',
      type: 'Logger',
      config: {
        level: 'info',
        prefix: 'TEST'
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

  describe('executeLogger', () => {
    test('should log data with timestamp and return passthrough output', async () => {
      const inputs = { data: 'test message' };
      
      const result = await executeLogger(mockNode, mockWorkflow, mockConnections, inputs);
      
      expect(result.output).toBe('test message');
      expect(result.logged).toBe(true);
      expect(result.level).toBe('info');
      expect(result.timestamp).toBeDefined();
      expect(result.entry).toBeDefined();
      
      // Check log storage
      expect(logStorage).toHaveLength(1);
      const logEntry = logStorage[0];
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.prefix).toBe('[TEST]');
      expect(logEntry.data).toBe('test message');
      expect(logEntry.workflowId).toBe('test-workflow');
      expect(logEntry.nodeId).toBe('test-logger');
    });

    test('should handle different log levels', async () => {
      const levels = ['info', 'warn', 'error'];
      
      for (const level of levels) {
        // Clear storage
        logStorage.length = 0;
        
        mockNode.config.level = level;
        const inputs = { data: `test ${level} message` };
        
        const result = await executeLogger(mockNode, mockWorkflow, mockConnections, inputs);
        
        expect(logStorage).toHaveLength(1);
        expect(logStorage[0].level).toBe(level.toUpperCase());
        expect(result.output).toBe(`test ${level} message`);
      }
    });

    test('should work without prefix', async () => {
      mockNode.config.prefix = '';
      const inputs = { data: 'no prefix test' };
      
      const result = await executeLogger(mockNode, mockWorkflow, mockConnections, inputs);
      
      expect(result.output).toBe('no prefix test');
      expect(logStorage[0].prefix).toBe('');
    });

    test('should handle complex data types', async () => {
      const complexData = {
        user: 'john',
        score: 100,
        active: true,
        items: ['a', 'b', 'c']
      };
      
      const inputs = { data: complexData };
      const result = await executeLogger(mockNode, mockWorkflow, mockConnections, inputs);
      
      expect(result.output).toEqual(complexData);
      expect(logStorage[0].data).toEqual(complexData);
      expect(logStorage[0].message).toContain(JSON.stringify(complexData));
    });

    test('should use default data when no input provided', async () => {
      mockNode.config.defaultData = 'default message';
      const inputs = {};
      
      const result = await executeLogger(mockNode, mockWorkflow, mockConnections, inputs);
      
      expect(result.output).toBe('default message');
      expect(logStorage[0].data).toBe('default message');
    });
  });

  describe('getLogs', () => {
    beforeEach(() => {
      // Add some test logs
      logStorage.push(
        { timestamp: '2023-01-01T00:00:00.000Z', level: 'INFO', prefix: '[TEST]', workflowId: 'wf1', nodeId: 'node1', data: 'test1', message: '[TEST]test1' },
        { timestamp: '2023-01-01T00:01:00.000Z', level: 'ERROR', prefix: '', workflowId: 'wf1', nodeId: 'node2', data: 'test2', message: 'test2' },
        { timestamp: '2023-01-01T00:02:00.000Z', level: 'WARN', prefix: '[TEST]', workflowId: 'wf2', nodeId: 'node1', data: 'test3', message: '[TEST]test3' }
      );
    });

    test('should return all logs when no filters provided', () => {
      const logs = getLogs();
      
      expect(logs).toHaveLength(3);
      expect(logs[0].data).toBe('test1');
      expect(logs[1].data).toBe('test2');
      expect(logs[2].data).toBe('test3');
    });

    test('should filter by log level', () => {
      const logs = getLogs({ level: 'error' });
      
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('ERROR');
      expect(logs[0].data).toBe('test2');
    });

    test('should filter by workflow ID', () => {
      const logs = getLogs({ workflowId: 'wf1' });
      
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.workflowId === 'wf1')).toBe(true);
    });

    test('should filter by node ID', () => {
      const logs = getLogs({ nodeId: 'node1' });
      
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.nodeId === 'node1')).toBe(true);
    });

    test('should limit results', () => {
      const logs = getLogs({ limit: 2 });
      
      expect(logs).toHaveLength(2);
      expect(logs[0].data).toBe('test2'); // Most recent
      expect(logs[1].data).toBe('test3');
    });

    test('should combine multiple filters', () => {
      const logs = getLogs({ level: 'info', workflowId: 'wf1' });
      
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('INFO');
      expect(logs[0].workflowId).toBe('wf1');
    });
  });

  describe('clearLogs', () => {
    beforeEach(() => {
      // Add some test logs
      logStorage.push(
        { timestamp: '2023-01-01T00:00:00.000Z', level: 'INFO', prefix: '[TEST]', workflowId: 'wf1', nodeId: 'node1', data: 'test1', message: '[TEST]test1' },
        { timestamp: '2023-01-01T00:01:00.000Z', level: 'ERROR', prefix: '', workflowId: 'wf1', nodeId: 'node2', data: 'test2', message: 'test2' },
        { timestamp: '2023-01-01T00:02:00.000Z', level: 'WARN', prefix: '[TEST]', workflowId: 'wf2', nodeId: 'node1', data: 'test3', message: '[TEST]test3' }
      );
    });

    test('should clear all logs when no filters provided', () => {
      expect(logStorage).toHaveLength(3);
      
      clearLogs();
      
      expect(logStorage).toHaveLength(0);
    });

    test('should clear logs by level', () => {
      clearLogs({ level: 'error' });
      
      expect(logStorage).toHaveLength(2);
      expect(logStorage.every(log => log.level !== 'ERROR')).toBe(true);
    });

    test('should clear logs by workflow ID', () => {
      clearLogs({ workflowId: 'wf1' });
      
      expect(logStorage).toHaveLength(1);
      expect(logStorage[0].workflowId).toBe('wf2');
    });

    test('should clear logs by node ID', () => {
      clearLogs({ nodeId: 'node1' });
      
      expect(logStorage).toHaveLength(1);
      expect(logStorage[0].nodeId).toBe('node2');
    });

    test('should combine multiple filters', () => {
      clearLogs({ level: 'info', nodeId: 'node1' });
      
      expect(logStorage).toHaveLength(2);
      expect(logStorage.every(log => log.level !== 'INFO' || log.nodeId !== 'node1')).toBe(true);
    });
  });

  describe('log storage limits', () => {
    test('should limit log storage to 1000 entries', async () => {
      // Add 1005 entries
      for (let i = 0; i < 1005; i++) {
        await executeLogger(mockNode, mockWorkflow, mockConnections, { data: `test ${i}` });
      }
      
      expect(logStorage).toHaveLength(1000);
      expect(logStorage[0].data).toBe('test 5'); // First 5 should be removed
      expect(logStorage[999].data).toBe('test 1004'); // Last entry should be kept
    });
  });
});
