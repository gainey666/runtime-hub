/**
 * Workflow Engine Unit Tests
 * Retro-fueled with 2000s robotics club precision
 */

const WorkflowEngine = require('../../../src/workflow-engine.js');
const adapters = require('../../../src/engine/node-adapters.js');
const { EventEmitter } = require('events');

describe('WorkflowEngine', () => {
  let engine;
  let mockIo;

  beforeEach(() => {
    mockIo = new EventEmitter();
    engine = new WorkflowEngine(mockIo, {
      workflow: {
        maxConcurrentWorkflows: 3,
        defaultTimeout: 5000,
        maxNodeExecutionTime: 2000,
        enableDebugLogging: false
      },
      pythonAgent: {
        timeout: 10000,
        maxRetries: 2
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
    
    // Remove all event listeners to prevent memory leaks
    engine.removeAllListeners();
    mockIo.removeAllListeners();
    
    // Clear all intervals and timeouts
    for (let i = 1; i < 99999; i++) {
      clearInterval(i);
      clearTimeout(i);
    }
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('Constructor', () => {
    test('should initialize with default config', () => {
      const defaultEngine = new WorkflowEngine(mockIo);
      expect(defaultEngine.config.workflow.maxConcurrentWorkflows).toBe(5);
      expect(defaultEngine.config.workflow.defaultTimeout).toBe(60000);
    });

    test('should initialize with custom config', () => {
      expect(engine.config.workflow.maxConcurrentWorkflows).toBe(3);
      expect(engine.config.workflow.defaultTimeout).toBe(5000);
    });

    test('should initialize node executors', () => {
      expect(engine.nodeExecutors.size).toBeGreaterThan(0);
      expect(engine.nodeExecutors.has('Start')).toBe(true);
      expect(engine.nodeExecutors.has('End')).toBe(true);
      expect(engine.nodeExecutors.has('Execute Python')).toBe(true);
    });

    test('should initialize performance metrics', () => {
      expect(engine.performanceMetrics).toBeDefined();
      expect(engine.performanceMetrics.totalWorkflows).toBe(0);
      expect(engine.performanceMetrics.successfulWorkflows).toBe(0);
      expect(engine.performanceMetrics.failedWorkflows).toBe(0);
    });

    test('should initialize workflow history', () => {
      expect(engine.workflowHistory).toEqual([]);
      expect(engine.maxHistorySize).toBe(1000);
    });
  });

  describe('executeWorkflow()', () => {
    test('should execute simple workflow', async () => {
      const nodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
        { id: 'end', type: 'End', x: 100, y: 0, inputs: ['main'], outputs: [], config: {} }
      ];
      const connections = [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
      ];

      const result = await engine.executeWorkflow('test_wf', nodes, connections);
      
      expect(result.status).toBe('completed');
      expect(result.nodes).toEqual(nodes);
      expect(result.connections).toEqual(connections);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should throw error for workflow without start node', async () => {
      const nodes = [
        { id: 'end', type: 'End', x: 0, y: 0, inputs: ['main'], outputs: [], config: {} }
      ];
      const connections = [];

      const result = await engine.executeWorkflow('test_wf', nodes, connections);
      expect(result.status).toBe('error');
      expect(result.error).toBe('No Start node found in workflow');
    });

    test('should respect concurrent workflow limit', async () => {
      // Directly inject fake running workflows to reliably fill the slot limit,
      // avoiding timing-sensitive races with fast Start→End workflows.
      engine.runningWorkflows.set('fake_1', { id: 'fake_1', status: 'running' });
      engine.runningWorkflows.set('fake_2', { id: 'fake_2', status: 'running' });
      engine.runningWorkflows.set('fake_3', { id: 'fake_3', status: 'running' });

      const nodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, config: {} },
        { id: 'end',   type: 'End',   x: 100, y: 0, config: {} }
      ];
      const connections = [
        { id: 'c1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
      ];

      // 4th workflow should be rejected immediately
      const result = await engine.executeWorkflow('test_wf_4', nodes, connections);

      expect(result.status).toBe('error');
      expect(result.error).toBe('Maximum concurrent workflows (3) reached');

      // afterEach clears runningWorkflows
    });

    test('should timeout workflow execution', async () => {
      const nodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
        { id: 'delay', type: 'Delay', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: { duration: 10000 } }
      ];
      const connections = [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'delay', portIndex: 0 } }
      ];

      const result = await engine.executeWorkflow('test_wf', nodes, connections);
      expect(result.status).toBe('error');
      expect(result.error).toBe('Workflow execution timeout');
    });
  });

  describe('updateMetrics()', () => {
    test('should update metrics for completed workflow', () => {
      const workflow = {
        id: 'test_wf',
        status: 'completed',
        duration: 1000,
        error: null
      };

      engine.updateMetrics(workflow);

      expect(engine.performanceMetrics.totalWorkflows).toBe(1);
      expect(engine.performanceMetrics.successfulWorkflows).toBe(1);
      expect(engine.performanceMetrics.failedWorkflows).toBe(0);
      expect(engine.performanceMetrics.averageExecutionTime).toBe(1000);
    });

    test('should update metrics for failed workflow', () => {
      const workflow = {
        id: 'test_wf',
        status: 'error',
        duration: 500,
        error: 'Test error',
        nodes: [{ id: 'start', type: 'Start' }]
      };

      engine.updateMetrics(workflow);

      expect(engine.performanceMetrics.totalWorkflows).toBe(1);
      expect(engine.performanceMetrics.successfulWorkflows).toBe(0);
      expect(engine.performanceMetrics.failedWorkflows).toBe(1);
      expect(engine.performanceMetrics.errorsByType.get('Test error')).toBe(1);
    });

    test('should calculate average execution time correctly', () => {
      const workflow1 = { id: 'wf1', status: 'completed', duration: 1000 };
      const workflow2 = { id: 'wf2', status: 'completed', duration: 2000 };

      engine.updateMetrics(workflow1);
      engine.updateMetrics(workflow2);

      expect(engine.performanceMetrics.averageExecutionTime).toBe(1500);
    });
  });

  describe('addToHistory()', () => {
    test('should add workflow to history', () => {
      const workflow = {
        id: 'test_wf',
        status: 'completed',
        duration: 1000,
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        nodes: [{ id: 'node1' }, { id: 'node2' }],
        error: null
      };

      engine.addToHistory(workflow);

      expect(engine.workflowHistory).toHaveLength(1);
      expect(engine.workflowHistory[0].id).toBe('test_wf');
      expect(engine.workflowHistory[0].status).toBe('completed');
      expect(engine.workflowHistory[0].nodeCount).toBe(2);
    });

    test('should limit history size', () => {
      engine.maxHistorySize = 2;

      // Add 3 workflows
      for (let i = 0; i < 3; i++) {
        engine.addToHistory({
          id: `wf_${i}`,
          status: 'completed',
          duration: 1000,
          startTime: Date.now(),
          endTime: Date.now() + 1000,
          nodes: [{ id: 'node1' }],
          error: null
        });
      }

      expect(engine.workflowHistory).toHaveLength(2);
      expect(engine.workflowHistory[0].id).toBe('wf_1');
      expect(engine.workflowHistory[1].id).toBe('wf_2');
    });
  });

  describe('getMetrics()', () => {
    test('should return formatted metrics', () => {
      engine.performanceMetrics = {
        totalWorkflows: 10,
        successfulWorkflows: 8,
        failedWorkflows: 2,
        averageExecutionTime: 1500.5,
        totalExecutionTime: 15005,
        nodeExecutions: 25,
        errorsByType: new Map([['Error1', 1], ['Error2', 1]])
      };

      const metrics = engine.getMetrics();

      expect(metrics.successRate).toBe('80.00%');
      expect(metrics.averageExecutionTime).toBe(1501);
      expect(metrics.runningWorkflows).toBe(0);
      expect(metrics.maxConcurrentWorkflows).toBe(3);
    });

    test('should handle zero workflows', () => {
      const metrics = engine.getMetrics();

      expect(metrics.successRate).toBe('0%');
      expect(metrics.averageExecutionTime).toBe(0);
    });
  });

  describe('getHistory()', () => {
    test('should return limited history', () => {
      // Add 5 workflows
      for (let i = 0; i < 5; i++) {
        engine.addToHistory({
          id: `wf_${i}`,
          status: 'completed',
          duration: 1000,
          startTime: Date.now(),
          endTime: Date.now() + 1000,
          nodes: [{ id: 'node1' }],
          error: null
        });
      }

      const history = engine.getHistory(3);
      expect(history).toHaveLength(3);
      expect(history[0].id).toBe('wf_2');
      expect(history[2].id).toBe('wf_4');
    });

    test('should return all history when limit not specified', () => {
      // Add 3 workflows
      for (let i = 0; i < 3; i++) {
        engine.addToHistory({
          id: `wf_${i}`,
          nodes: [{ id: 'start', type: 'Start' }],
          status: 'completed',
          duration: 1000,
          startTime: Date.now(),
          endTime: Date.now() + 1000,
          error: null
        });
      }

      const history = engine.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].status).toBe('completed');
      expect(history[0].endTime).toBeDefined();
    });

    test('should return false for non-existent workflow', () => {
      const result = engine.stopWorkflow('non_existent');
      expect(result).toBe(false);
    });
  });

  describe('Node Executors', () => {
    test('should execute Start node', async () => {
      const node = { id: 'start', type: 'Start', config: {} };
      const workflow = { executionState: new Map() };
      const connections = [];

      const result = await adapters.executeStart(node, workflow, connections);
      expect(result.message).toBe('Workflow execution started');
    });

    test('should execute End node', async () => {
      const node = { id: 'end', type: 'End', config: {} };
      const workflow = { executionState: new Map() };
      const connections = [];

      const result = await adapters.executeEnd(node, workflow, connections);
      expect(result.message).toBe('Workflow execution completed');
    });

    test('should execute Condition node', async () => {
      const node = { 
        id: 'condition', 
        type: 'Condition', 
        config: { 
          condition: 'test', 
          operator: 'equals', 
          value: 'test' 
        } 
      };
      const workflow = { executionState: new Map() };
      const connections = [];

      const result = await adapters.executeCondition(node, workflow, connections);
      expect(result.result).toBe(true);
      expect(result.branch).toBe('true');
    });

    test('should throw error for unknown node type', async () => {
      const node = { id: 'unknown', type: 'UnknownNode', config: {} };
      const workflow = { executionState: new Map() };
      const connections = [];

      await expect(engine.executeNode(workflow, node, connections))
        .rejects.toThrow('No executor found for node type: UnknownNode');
    });
  });

  describe('Data Flow — context.values', () => {
    // Helpers
    const makeNodes = (...types) => types.map((type, i) => ({
      id: `n${i + 1}`, type, x: i * 100, y: 0, config: {}
    }));

    const chain = (nodeIds) => nodeIds.slice(0, -1).map((id, i) => ({
      id: `c${i + 1}`,
      from: { nodeId: id, portIndex: 0 },
      to: { nodeId: nodeIds[i + 1], portIndex: 0 }
    }));

    test('context.values is populated after each node runs', async () => {
      const nodes = makeNodes('Start', 'End');
      const connections = chain(['n1', 'n2']);

      const result = await engine.executeWorkflow('df_test_1', nodes, connections);

      expect(result.context).toBeDefined();
      expect(result.context.values['n1']).toBeDefined();
      expect(result.context.values['n1'].message).toBe('Workflow execution started');
      expect(result.context.values['n2']).toBeDefined();
      expect(result.context.values['n2'].message).toBe('Workflow execution completed');
    });

    test('control-flow ports do not pass data to downstream inputs', async () => {
      // Start(main) → Write Log(message port 1) — should NOT inject Start result as message
      const nodes = [
        { id: 'n1', type: 'Start',     x: 0, y: 0, config: {} },
        { id: 'n2', type: 'Write Log', x: 1, y: 0, config: { message: 'static message', level: 'info' } },
        { id: 'n3', type: 'End',       x: 2, y: 0, config: {} }
      ];
      // Start port 0 = 'main' (control-flow), wired to Write Log port 1 = 'message'
      const connections = [
        { id: 'c1', from: { nodeId: 'n1', portIndex: 0 }, to: { nodeId: 'n2', portIndex: 1 } },
        { id: 'c2', from: { nodeId: 'n2', portIndex: 0 }, to: { nodeId: 'n3', portIndex: 0 } }
      ];

      const result = await engine.executeWorkflow('df_test_2', nodes, connections);

      // Write Log should have used static config, not Start's result object
      expect(result.context.values['n2'].message).toBe('static message');
    });

    test('Condition node follows true branch only when condition is true', async () => {
      const nodes = [
        { id: 'n1', type: 'Start',     x: 0, y: 0, config: {} },
        { id: 'n2', type: 'Condition', x: 1, y: 0, config: { condition: 'yes', operator: 'equals', value: 'yes' } },
        { id: 'n3', type: 'End',       x: 2, y: 0, config: {}, label: 'true-end' },
        { id: 'n4', type: 'End',       x: 2, y: 1, config: {}, label: 'false-end' }
      ];
      const connections = [
        { id: 'c1', from: { nodeId: 'n1', portIndex: 0 }, to: { nodeId: 'n2', portIndex: 0 } },
        // Condition true(port 0) → n3
        { id: 'c2', from: { nodeId: 'n2', portIndex: 0 }, to: { nodeId: 'n3', portIndex: 0 } },
        // Condition false(port 1) → n4
        { id: 'c3', from: { nodeId: 'n2', portIndex: 1 }, to: { nodeId: 'n4', portIndex: 0 } }
      ];

      const result = await engine.executeWorkflow('df_test_3', nodes, connections);

      expect(result.status).toBe('completed');
      expect(result.context.values['n2'].branch).toBe('true');
      expect(result.context.values['n3']).toBeDefined();   // true branch ran
      expect(result.context.values['n4']).toBeUndefined(); // false branch did NOT run
    });

    test('Condition node follows false branch only when condition is false', async () => {
      const nodes = [
        { id: 'n1', type: 'Start',     x: 0, y: 0, config: {} },
        { id: 'n2', type: 'Condition', x: 1, y: 0, config: { condition: 'yes', operator: 'equals', value: 'no' } },
        { id: 'n3', type: 'End',       x: 2, y: 0, config: {} },
        { id: 'n4', type: 'End',       x: 2, y: 1, config: {} }
      ];
      const connections = [
        { id: 'c1', from: { nodeId: 'n1', portIndex: 0 }, to: { nodeId: 'n2', portIndex: 0 } },
        { id: 'c2', from: { nodeId: 'n2', portIndex: 0 }, to: { nodeId: 'n3', portIndex: 0 } },
        { id: 'c3', from: { nodeId: 'n2', portIndex: 1 }, to: { nodeId: 'n4', portIndex: 0 } }
      ];

      const result = await engine.executeWorkflow('df_test_4', nodes, connections);

      expect(result.context.values['n2'].branch).toBe('false');
      expect(result.context.values['n3']).toBeUndefined(); // true branch did NOT run
      expect(result.context.values['n4']).toBeDefined();   // false branch ran
    });

    test('Transform JSON receives data wired from upstream node', async () => {
      const nodes = [
        { id: 'n1', type: 'Start',         x: 0, y: 0, config: {} },
        { id: 'n2', type: 'Transform JSON', x: 1, y: 0, config: {
            operation: 'get',
            key: 'message'
          }
        },
        { id: 'n3', type: 'End',           x: 2, y: 0, config: {} }
      ];
      // n1's main(port 0) is control-flow — should be skipped by resolveInputs
      // Wire n1's output port 0 to n2's data input port 0
      const connections = [
        { id: 'c1', from: { nodeId: 'n1', portIndex: 0 }, to: { nodeId: 'n2', portIndex: 0 } },
        { id: 'c2', from: { nodeId: 'n2', portIndex: 0 }, to: { nodeId: 'n3', portIndex: 0 } }
      ];

      const result = await engine.executeWorkflow('df_test_5', nodes, connections);

      // Start's 'main' port is control-flow, so Transform JSON should fall back to config.input (empty {})
      // operation=get on empty object with key='message' should return undefined, not crash
      expect(result.status).toBe('completed');
      expect(result.context.values['n2'].success).toBe(true);
    });

    test('assets directory is created for each run', async () => {
      const fs = require('fs');
      const path = require('path');
      const nodes = makeNodes('Start', 'End');
      const connections = chain(['n1', 'n2']);

      const result = await engine.executeWorkflow('df_assets_test', nodes, connections);

      expect(result.context.assetsDir).toBeDefined();
      expect(fs.existsSync(result.context.assetsDir)).toBe(true);
    });
  });

  describe('Broadcast Methods', () => {
    test('should broadcast workflow update', (done) => {
      mockIo.on('workflow_update', (data) => {
        expect(data.workflowId).toBe('test_wf');
        expect(data.status).toBe('completed');
        expect(data.timestamp).toBeDefined();
        done();
      });

      engine.broadcastWorkflowUpdate('test_wf', 'completed', { test: true });
    });

    test('should broadcast node update', (done) => {
      mockIo.on('node_update', (data) => {
        expect(data.workflowId).toBe('test_wf');
        expect(data.nodeId).toBe('node1');
        expect(data.status).toBe('running');
        expect(data.timestamp).toBeDefined();
        done();
      });

      engine.broadcastNodeUpdate('test_wf', 'node1', 'running', { test: true });
    });
  });
});
