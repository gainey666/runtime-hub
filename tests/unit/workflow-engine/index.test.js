/**
 * Workflow Engine Unit Tests
 * Retro-fueled with 2000s robotics club precision
 */

const WorkflowEngine = require('../../../src/workflow-engine.js');
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

  afterEach(() => {
    // Clear any running workflows
    engine.runningWorkflows.clear();
    engine.workflowHistory = [];
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
      const nodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
        { id: 'end', type: 'End', x: 100, y: 0, inputs: ['main'], outputs: [], config: {} }
      ];
      const connections = [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
      ];

      // Start 3 workflows
      const wf1 = engine.executeWorkflow('test_wf_1', nodes, connections);
      const wf2 = engine.executeWorkflow('test_wf_2', nodes, connections);
      const wf3 = engine.executeWorkflow('test_wf_3', nodes, connections);
      
      // Try to start one more - should fail
      const result = await engine.executeWorkflow('test_wf_4', nodes, connections);
      
      expect(result.status).toBe('error');
      expect(result.error).toBe('Maximum concurrent workflows (3) reached');
      
      // Clean up
      engine.stopWorkflow('test_wf_1');
      engine.stopWorkflow('test_wf_2');
      engine.stopWorkflow('test_wf_3');
      await wf1.catch(() => {});
      await wf2.catch(() => {});
      await wf3.catch(() => {});
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

      const result = await engine.executeStart(node, workflow, connections);
      expect(result.message).toBe('Workflow execution started');
    });

    test('should execute End node', async () => {
      const node = { id: 'end', type: 'End', config: {} };
      const workflow = { executionState: new Map() };
      const connections = [];

      const result = await engine.executeEnd(node, workflow, connections);
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

      const result = await engine.executeCondition(node, workflow, connections);
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
