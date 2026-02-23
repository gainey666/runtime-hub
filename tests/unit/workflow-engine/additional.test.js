/**
 * Additional Workflow Engine Tests
 * Testing uncovered methods and edge cases
 */

const WorkflowEngine = require('../../../src/workflow-engine.js');
const { EventEmitter } = require('events');

describe('WorkflowEngine - Additional Coverage', () => {
  let engine;
  let mockIo;

  beforeEach(() => {
    mockIo = new EventEmitter();
    engine = new WorkflowEngine(mockIo, {
      workflow: {
        maxConcurrentWorkflows: 5,
        defaultTimeout: 60000,
        maxNodeExecutionTime: 5000,
        enableDebugLogging: false
      }
    });
  });

  afterEach(async () => {
    // Clear any running workflows
    const runningWorkflows = Array.from(engine.runningWorkflows.keys());
    for (const workflowId of runningWorkflows) {
      try {
        await engine.stop(workflowId);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    engine.runningWorkflows.clear();
    engine.workflowHistory = [];
    
    // Wait a bit for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Constructor Edge Cases', () => {
    test('should initialize with custom config', () => {
      const customConfig = {
        workflow: {
          maxConcurrentWorkflows: 10,
          defaultTimeout: 30000,
          maxNodeExecutionTime: 3000,
          enableDebugLogging: true
        }
      };
      
      const customEngine = new WorkflowEngine(mockIo, customConfig);
      
      expect(customEngine.config.workflow.maxConcurrentWorkflows).toBe(10);
      expect(customEngine.config.workflow.defaultTimeout).toBe(30000);
      expect(customEngine.config.workflow.maxNodeExecutionTime).toBe(3000);
      expect(customEngine.config.workflow.enableDebugLogging).toBe(true);
    });

    test('should initialize node executors', () => {
      expect(engine.nodeExecutors.size).toBeGreaterThan(0);
      expect(engine.nodeExecutors.has('Start')).toBe(true);
      expect(engine.nodeExecutors.has('End')).toBe(true);
      expect(engine.nodeExecutors.has('Delay')).toBe(true);
    });

    test('should initialize performance metrics', () => {
      const metrics = engine.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalWorkflows).toBe(0);
      expect(metrics.successfulWorkflows).toBe(0);
      expect(metrics.failedWorkflows).toBe(0);
    });

    test('should initialize workflow history', () => {
      expect(engine.workflowHistory).toEqual([]);
      expect(engine.maxHistorySize).toBe(1000);
    });
  });

  describe('Error Handling', () => {
    test('should handle error for workflow without start node', async () => {
      const nodes = [
        { id: 'end', type: 'End', x: 100, y: 0, inputs: ['main'], outputs: [], config: {} }
      ];
      const connections = [];

      const result = await engine.executeWorkflow('test_wf', nodes, connections);
      expect(result.status).toBe('error');
      expect(result.error).toBe('No Start node found in workflow');
    });

    test('should handle error for maximum concurrent workflows', async () => {
      // Fill up the concurrent workflow limit
      const config = { workflow: { maxConcurrentWorkflows: 1 } };
      const limitedEngine = new WorkflowEngine(mockIo, config);
      
      const nodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
        { id: 'delay', type: 'Delay', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: { duration: 1000, unit: 'ms' } },
        { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
      ];
      const connections = [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'delay', portIndex: 0 } },
        { id: 'conn2', from: { nodeId: 'delay', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
      ];

      // Start first workflow
      const firstWorkflow = limitedEngine.executeWorkflow('first', nodes, connections);
      
      // Try to start second workflow - should fail
      const result = await limitedEngine.executeWorkflow('second', nodes, connections);
      
      expect(result.status).toBe('error');
      expect(result.error).toBe('Maximum concurrent workflows (1) reached');
      
      // Clean up
      limitedEngine.stopWorkflow('first');
      await firstWorkflow.catch(() => {});
    });

    test('should handle workflow execution timeout', async () => {
      const config = { workflow: { defaultTimeout: 100 } };
      const timeoutEngine = new WorkflowEngine(mockIo, config);
      
      const nodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
        { id: 'delay', type: 'Delay', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: { duration: 200, unit: 'ms' } },
        { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
      ];
      const connections = [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'delay', portIndex: 0 } },
        { id: 'conn2', from: { nodeId: 'delay', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
      ];

      const result = await timeoutEngine.executeWorkflow('timeout_test', nodes, connections);
      expect(result.status).toBe('error');
      expect(result.error).toBe('Workflow execution timeout');
    });
  });

  describe('Node Executors - Additional Coverage', () => {
    test('should execute Condition node - true path', async () => {
      const node = {
        id: 'condition',
        type: 'Condition',
        config: {
          condition: 'test',
          operator: 'equals',
          value: 'test'
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const result = await engine.executeCondition(node, workflow, connections);
      
      expect(result.result).toBe(true);
      expect(result.branch).toBe('true');
    });

    test('should execute Condition node - false path', async () => {
      const node = {
        id: 'condition',
        type: 'Condition',
        config: {
          condition: 'test',
          operator: 'equals',
          value: 'different'
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const result = await engine.executeCondition(node, workflow, connections);

      expect(result.result).toBe(false);
      expect(result.branch).toBe('false');
    });

    test('should execute HTTP Request node', async () => {
      const node = {
        id: 'http',
        type: 'HTTP Request',
        config: {
          url: 'https://httpbin.org/get',
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const result = await engine.executeHTTPRequest(node, workflow, connections);
      
      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
    });

    test('should execute SQL Query node', async () => {
      const node = {
        id: 'sql',
        type: 'SQL Query',
        config: {
          query: 'SELECT 1 as test',
          database: 'test.db'
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const result = await engine.executeSQLQuery(node, workflow, connections);
      
      expect(result.rows).toBeDefined();
      expect(Array.isArray(result.rows)).toBe(true);
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('should execute Show Message node', async () => {
      const node = {
        id: 'message',
        type: 'Show Message',
        config: {
          message: 'Test message',
          type: 'info'
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const result = await engine.executeShowMessage(node, workflow, connections);
      
      expect(result.message).toBe('Test message');
      expect(result.shown).toBe(true);
    });

    test('should execute Write Log node', async () => {
      const node = {
        id: 'log',
        type: 'Write Log',
        config: {
          message: 'Test log message',
          level: 'info',
          logFile: 'test.log'
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const result = await engine.executeWriteLog(node, workflow, connections);
      
      expect(result.level).toBe('info');
      expect(result.message).toBe('Test log message');
      expect(result.logFile).toBe('test.log');
      expect(result.logged).toBe(true);
    });

    test('should execute Wait node', async () => {
      const node = {
        id: 'wait',
        type: 'Wait',
        config: {
          duration: 50,
          unit: 'ms'
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const startTime = Date.now();
      const result = await engine.executeDelay(node, workflow, connections);
      const endTime = Date.now();

      expect(result.duration).toBe(50);
      expect(result.unit).toBe('ms');
      expect(result.completed).toBe(true);
      expect(endTime - startTime).toBeGreaterThanOrEqual(40);
    });

    test('should execute Keyboard Input node', async () => {
      const node = {
        id: 'keyboard',
        type: 'Keyboard Input',
        config: {
          keys: 'ctrl+c',
          action: 'copy'
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const result = await engine.executeKeyboardInput(node, workflow, connections);
      
      expect(result.keys).toBe('simulated keys');
      expect(result.sent).toBe(true);
    });

    test('should execute Encrypt Data node', async () => {
      const node = {
        id: 'encrypt',
        type: 'Encrypt Data',
        config: {
          data: 'secret message',
          algorithm: 'AES-256'
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const result = await engine.executeEncryptData(node, workflow, connections);
      
      expect(result.encrypted).toBe('simulated encrypted data');
    });

    test('should execute Loop node', async () => {
      const node = {
        id: 'loop',
        type: 'Loop',
        config: {
          iterations: 3
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const result = await engine.executeLoop(node, workflow, connections);
      
      expect(result.message).toBe('Loop execution simulated');
    });

    test('should execute Monitor Function node', async () => {
      const node = {
        id: 'monitor',
        type: 'Monitor Function',
        config: {
          functionName: 'testFunction',
          interval: 1000
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const result = await engine.executeMonitorFunction(node, workflow, connections);
      
      expect(result.message).toBe('Function monitoring simulated');
    });

    test('should execute Import Module node', async () => {
      const node = {
        id: 'import',
        type: 'Import Module',
        config: {
          module: 'test-module',
          path: './test.js'
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const result = await engine.executeImportModule(node, workflow, connections);
      
      expect(result.module).toBe('test-module');
      expect(result.path).toBe('./test.js');
      expect(result.loaded).toBe(true);
      expect(result.exports).toContain('default');
    });

    test('should execute List Directory node', async () => {
      const node = {
        id: 'listdir',
        type: 'List Directory',
        config: {
          path: './test'
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const result = await engine.executeListDirectory(node, workflow, connections);
      
      expect(result.files).toEqual(['file1.txt', 'file2.txt']);
      expect(result.directories).toEqual(['dir1', 'dir2']);
    });

    test('should execute Start Process node', async () => {
      const node = {
        id: 'startproc',
        type: 'Start Process',
        config: {
          command: 'node',
          args: ['--version']
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const result = await engine.executeStartProcess(node, workflow, connections);
      
      expect(result.processId).toBe(1234);
      expect(result.status).toBe('started');
    });

    test('should execute Kill Process node', async () => {
      const node = {
        id: 'killproc',
        type: 'Kill Process',
        config: {
          processId: 1234
        }
      };
      const workflow = { id: 'test', cancelled: false };
      const connections = [];

      const result = await engine.executeKillProcess(node, workflow, connections);
      
      expect(result.processId).toBe(1234);
      expect(result.status).toBe('killed');
    });
  });

  describe('Broadcast Methods', () => {
    test('should broadcast workflow update', () => {
      const mockCallback = jest.fn();
      mockIo.on('workflow_update', mockCallback);

      const workflowData = {
        id: 'test_wf',
        status: 'completed',
        duration: 1000
      };

      engine.broadcastWorkflowUpdate('test_wf', 'completed', workflowData);

      expect(mockCallback).toHaveBeenCalledWith({
        workflowId: 'test_wf',
        status: 'completed',
        data: workflowData,
        timestamp: expect.any(Number)
      });
    });

    test('should broadcast node update', () => {
      const mockCallback = jest.fn();
      mockIo.on('node_update', mockCallback);

      const nodeData = {
        id: 'test_node',
        type: 'Delay',
        status: 'completed'
      };

      engine.broadcastNodeUpdate('test_wf', 'test_node', 'completed', nodeData);

      expect(mockCallback).toHaveBeenCalledWith({
        workflowId: 'test_wf',
        nodeId: 'test_node',
        status: 'completed',
        data: nodeData,
        timestamp: expect.any(Number)
      });
    });

    test('should update metrics for completed workflow', async () => {
      const workflow = {
        id: 'test_wf',
        nodes: [{ id: 'start', type: 'Start' }],
        status: 'completed',
        duration: 1500,
        startTime: Date.now() - 1500,
        endTime: Date.now()
      };

      engine.updateMetrics(workflow);

      const metrics = engine.getMetrics();
      expect(metrics.totalWorkflows).toBe(1);
      expect(metrics.successfulWorkflows).toBe(1);
      expect(metrics.failedWorkflows).toBe(0);
      expect(metrics.averageExecutionTime).toBe(1500);
    });

    test('should update metrics for failed workflow', () => {
      const workflow = {
        id: 'test_wf',
        status: 'error',
        duration: 800,
        error: 'Test error',
        nodes: [{ id: 'start', type: 'Start' }]
      };

      engine.updateMetrics(workflow);

      const metrics = engine.getMetrics();
      expect(metrics.totalWorkflows).toBe(1);
      expect(metrics.successfulWorkflows).toBe(0);
      expect(metrics.failedWorkflows).toBe(1);
    });

    test('should add workflow to history', () => {
      const workflow = {
        id: 'test_wf',
        status: 'completed',
        duration: 1000,
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        nodes: [{ id: 'start', type: 'Start' }] // Add nodes array
      };

      engine.addToHistory(workflow);

      expect(engine.workflowHistory).toHaveLength(1);
      // Check that the history entry contains the expected properties
      const historyEntry = engine.workflowHistory[0];
      expect(historyEntry.id).toBe(workflow.id);
      expect(historyEntry.status).toBe(workflow.status);
      expect(historyEntry.duration).toBe(workflow.duration);
      expect(historyEntry.nodeCount).toBe(1); // This is added by addToHistory
    });

    test('should limit history size', () => {
      engine.maxHistorySize = 3;

      // Add 5 workflows
      for (let i = 1; i <= 5; i++) {
        engine.addToHistory({
          id: `test_wf_${i}`,
          status: 'completed',
          duration: 1000,
          startTime: Date.now() - 1000,
          endTime: Date.now(),
          nodes: [{ id: 'start', type: 'Start' }] // Add nodes array
        });
      }

      expect(engine.workflowHistory).toHaveLength(3);
      expect(engine.workflowHistory[0].id).toBe('test_wf_3');
      expect(engine.workflowHistory[2].id).toBe('test_wf_5');
    });

    test('should return formatted metrics', () => {
      engine.performanceMetrics.totalWorkflows = 10;
      engine.performanceMetrics.successfulWorkflows = 8;
      engine.performanceMetrics.failedWorkflows = 2;
      engine.performanceMetrics.averageExecutionTime = 1200;

      const metrics = engine.getMetrics();

      expect(metrics.totalWorkflows).toBe(10);
      expect(metrics.successfulWorkflows).toBe(8);
      expect(metrics.failedWorkflows).toBe(2);
      expect(metrics.averageExecutionTime).toBe(1200);
    });

    test('should handle zero workflows in metrics', () => {
      const metrics = engine.getMetrics();

      expect(metrics.totalWorkflows).toBe(0);
      expect(metrics.successfulWorkflows).toBe(0);
      expect(metrics.failedWorkflows).toBe(0);
      expect(metrics.successRate).toBe('0%');
    });

    test('should return limited history', () => {
      for (let i = 1; i <= 10; i++) {
        engine.addToHistory({
          id: `test_wf_${i}`,
          status: 'completed',
          duration: 1000,
          startTime: Date.now() - 1000,
          endTime: Date.now(),
          nodes: [{ id: 'start', type: 'Start' }] // Add nodes array
        });
      }

      const history = engine.getHistory(5);

      expect(history).toHaveLength(5);
      expect(history[0].id).toBe('test_wf_6');
      expect(history[4].id).toBe('test_wf_10');
    });

    test('should return all history when limit not specified', () => {
      for (let i = 1; i <= 5; i++) {
        engine.addToHistory({
          id: `test_wf_${i}`,
          status: 'completed',
          duration: 1000,
          startTime: Date.now() - 1000,
          endTime: Date.now(),
          nodes: [{ id: 'start', type: 'Start' }] // Add nodes array
        });
      }

      const history = engine.getHistory();

      expect(history).toHaveLength(5);
      expect(history[0].id).toBe('test_wf_1');
      expect(history[4].id).toBe('test_wf_5');
    });
  });
});
