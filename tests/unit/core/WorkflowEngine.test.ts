/**
 * Workflow Engine Tests
 * Comprehensive test suite for workflow execution engine
 */

import WorkflowEngine from '../../../src/core/WorkflowEngine';
import { Workflow, WorkflowConfig } from '../../../src/types';

// Mock IO for testing
const mockIO = {
  emit: jest.fn(),
  on: jest.fn(),
  once: jest.fn()
};

// Test configuration
const testConfig: WorkflowConfig = {
  workflow: {
    maxConcurrentWorkflows: 5,
    maxNodeExecutionTime: 30000,
    enableDebugLogging: true
  },
  pythonAgent: {
    timeout: 30000,
    maxRetries: 3
  }
};

// Helper function to create test workflows
function createTestWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  const defaultWorkflow: Workflow = {
    id: `test-workflow-${Date.now()}`,
    name: 'Test Workflow',
    nodes: [
      { id: 'start-1', type: 'start', config: {}, position: { x: 0, y: 0 } },
      { id: 'end-1', type: 'end', config: {}, position: { x: 100, y: 0 } }
    ],
    connections: [
      { id: 'conn-1', source: 'start-1', target: 'end-1' }
    ],
    status: 'idle',
    startTime: 0,
    endTime: 0,
    duration: 0,
    cancelled: false
  };

  return { ...defaultWorkflow, ...overrides };
}

describe('WorkflowEngine', () => {
  let workflowEngine: WorkflowEngine;

  beforeEach(() => {
    workflowEngine = new WorkflowEngine(mockIO, testConfig);
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default config when none provided', () => {
      const engine = new WorkflowEngine(mockIO);
      expect(engine).toBeInstanceOf(WorkflowEngine);
    });

    it('should initialize with custom config when provided', () => {
      const engine = new WorkflowEngine(mockIO, testConfig);
      expect(engine).toBeInstanceOf(WorkflowEngine);
    });
  });

  describe('Workflow Execution', () => {
    it('should execute a simple workflow successfully', async () => {
      const workflow = createTestWorkflow();
      
      await workflowEngine.executeWorkflow(workflow);
      
      // Wait a bit for execution to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const completed = workflowEngine.getWorkflow(workflow.id);
      expect(completed).toBeDefined();
      expect(completed?.status).toBe('completed');
      expect(completed?.duration).toBeGreaterThan(0);
    });

    it('should handle node execution errors', async () => {
      const workflow = createTestWorkflow({
        nodes: [
          { id: 'error-1', type: 'error', config: { message: 'Test error' }, position: { x: 50, y: 0 } },
          { id: 'end-1', type: 'end', config: {}, position: { x: 150, y: 0 } }
        ],
        connections: [
          { id: 'conn-1', source: 'start-1', target: 'error-1' },
          { id: 'conn-2', source: 'error-1', target: 'end-1' }
        ]
      });

      await expect(workflowEngine.executeWorkflow(workflow)).rejects.toThrow('Test error');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const failed = workflowEngine.getWorkflow(workflow.id);
      expect(failed?.status).toBe('failed');
      expect(failed?.error).toBe('Test error');
    });

    it('should handle workflow cancellation', async () => {
      const workflow = createTestWorkflow({
        nodes: [
          { id: 'delay-1', type: 'delay', config: { delay: 1000 }, position: { x: 50, y: 0 } },
          { id: 'end-1', type: 'end', config: {}, position: { x: 150, y: 0 } }
        ],
        connections: [
          { id: 'conn-1', source: 'start-1', target: 'delay-1' },
          { id: 'conn-2', source: 'delay-1', target: 'end-1' }
        ]
      });

      // Start the workflow (executeWorkflow returns void)
      const executePromise = workflowEngine.executeWorkflow(workflow);
      
      // Wait a bit then cancel
      await new Promise(resolve => setTimeout(resolve, 100));
      const cancelResult = workflowEngine.cancelWorkflow(workflow.id);

      // Wait for cancellation to process
      await new Promise(resolve => setTimeout(resolve, 200));

      const cancelled = workflowEngine.getWorkflow(workflow.id);

      expect(cancelResult).toBe(true);
      expect(cancelled?.id).toBe(workflow.id);
      expect(cancelled?.status).toBe('stopped');
      expect(cancelled?.cancelled).toBe(true);
      
      // Wait for execution to complete (should be cancelled)
      await executePromise.catch(() => {});
    }, 3000);

    it('should queue workflows when max concurrent limit reached', async () => {
      const config: WorkflowConfig = {
        workflow: {
          maxConcurrentWorkflows: 1,
          maxNodeExecutionTime: 30000,
          enableDebugLogging: false
        },
        pythonAgent: {
          timeout: 30000,
          maxRetries: 3
        }
      };

      const engine = new WorkflowEngine(mockIO, config);
      
      // Create simple workflows with delay
      const workflow1 = createTestWorkflow({ 
        id: 'workflow-1',
        nodes: [
          { id: 'delay-1', type: 'delay', config: { delay: 500 }, position: { x: 50, y: 0 } },
          { id: 'end-1', type: 'end', config: {}, position: { x: 150, y: 0 } }
        ],
        connections: [
          { id: 'conn-1', source: 'start-1', target: 'delay-1' },
          { id: 'conn-2', source: 'delay-1', target: 'end-1' }
        ]
      });
      
      const workflow2 = createTestWorkflow({ 
        id: 'workflow-2',
        nodes: [
          { id: 'delay-2', type: 'delay', config: { delay: 500 }, position: { x: 50, y: 0 } },
          { id: 'end-2', type: 'end', config: {}, position: { x: 150, y: 0 } }
        ],
        connections: [
          { id: 'conn-1', source: 'start-1', target: 'delay-2' },
          { id: 'conn-2', source: 'delay-2', target: 'end-2' }
        ]
      });

      // Start both workflows
      const promise1 = engine.executeWorkflow(workflow1);
      const promise2 = engine.executeWorkflow(workflow2);

      // Wait a bit for both to start/queue
      await new Promise(resolve => setTimeout(resolve, 50));

      // Wait for first to complete
      await promise1;
      
      // Wait for second to start and complete
      await new Promise(resolve => setTimeout(resolve, 700));

      const workflow2FinalStatus = engine.getWorkflow(workflow2.id);
      expect(workflow2FinalStatus?.status).toBe('completed');

      await promise2;
    }, 5000);
  });

  describe('Node Execution', () => {
    it('should execute start node successfully', async () => {
      const workflow = createTestWorkflow();
      await workflowEngine.executeWorkflow(workflow);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const completed = workflowEngine.getWorkflow(workflow.id);
      expect(completed?.status).toBe('completed');
    });

    it('should execute end node successfully', async () => {
      const workflow = createTestWorkflow();
      await workflowEngine.executeWorkflow(workflow);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const completed = workflowEngine.getWorkflow(workflow.id);
      expect(completed?.status).toBe('completed');
    });

    it('should execute delay node successfully', async () => {
      const workflow = createTestWorkflow({
        nodes: [
          { id: 'delay-1', type: 'delay', config: { delay: 100 } },
          { id: 'end-1', type: 'end', config: {} }
        ],
        connections: [
          { id: 'conn-1', source: 'start-1', target: 'delay-1' },
          { id: 'conn-2', source: 'delay-1', target: 'end-1' }
        ]
      });

      await workflowEngine.executeWorkflow(workflow);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const completed = workflowEngine.getWorkflow(workflow.id);
      expect(completed?.status).toBe('completed');
      expect(completed?.duration).toBeGreaterThan(100);
    }, 1000);

    it('should execute condition node successfully', async () => {
      const workflow = createTestWorkflow({
        nodes: [
          { id: 'condition-1', type: 'condition', config: { condition: 'true' } },
          { id: 'end-1', type: 'end', config: {} }
        ],
        connections: [
          { id: 'conn-1', source: 'start-1', target: 'condition-1' },
          { id: 'conn-2', source: 'condition-1', target: 'end-1' }
        ]
      });

      await workflowEngine.executeWorkflow(workflow);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const completed = workflowEngine.getWorkflow(workflow.id);
      expect(completed?.status).toBe('completed');
    });

    it('should throw error for unknown node type', async () => {
      const workflow = createTestWorkflow({
        nodes: [
          { id: 'unknown-1', type: 'unknown', config: {}, position: { x: 50, y: 0 } },
          { id: 'end-1', type: 'end', config: {}, position: { x: 150, y: 0 } }
        ],
        connections: [
          { id: 'conn-1', source: 'start-1', target: 'unknown-1' },
          { id: 'conn-2', source: 'unknown-1', target: 'end-1' }
        ]
      });

      await expect(workflowEngine.executeWorkflow(workflow)).rejects.toThrow('Unknown node type: unknown');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const failed = workflowEngine.getWorkflow(workflow.id);
      expect(failed?.status).toBe('failed');
      expect(failed?.error).toContain('Unknown node type');
    });
  });

  describe('Metrics and History', () => {
    it('should track workflow metrics', async () => {
      const workflow = createTestWorkflow();
      await workflowEngine.executeWorkflow(workflow);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = workflowEngine.getMetrics();
      expect(metrics.total).toBeGreaterThan(0);
      expect(metrics.successful).toBeGreaterThan(0);
    });

    it('should maintain workflow history', async () => {
      const workflow = createTestWorkflow();
      await workflowEngine.executeWorkflow(workflow);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const history = workflowEngine.getWorkflowHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]?.id).toBe(workflow.id);
    });
  });

  describe('Event Emission', () => {
    it('should emit node events during execution', async () => {
      const workflow = createTestWorkflow();
      
      await workflowEngine.executeWorkflow(workflow);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockIO.emit).toHaveBeenCalledWith(
        'nodeUpdate',
        expect.any(Object)
      );
    });

    it('should broadcast updates via IO', async () => {
      const workflow = createTestWorkflow();
      
      await workflowEngine.executeWorkflow(workflow);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockIO.emit).toHaveBeenCalledWith(
        'workflowUpdate',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle cancelled workflow during node execution', async () => {
      const workflow = createTestWorkflow({
        nodes: [
          { id: 'delay-1', type: 'delay', config: { delay: 1000 }, position: { x: 50, y: 0 } },
          { id: 'end-1', type: 'end', config: {}, position: { x: 150, y: 0 } }
        ],
        connections: [
          { id: 'conn-1', source: 'start-1', target: 'delay-1' },
          { id: 'conn-2', source: 'delay-1', target: 'end-1' }
        ]
      });

      const executePromise = workflowEngine.executeWorkflow(workflow);
      
      // Cancel immediately
      workflowEngine.cancelWorkflow(workflow.id);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const cancelled = workflowEngine.getWorkflow(workflow.id);
      expect(cancelled?.status).toBe('stopped');
      expect(cancelled?.cancelled).toBe(true);
      
      // Wait for execution to complete
      await executePromise.catch(() => {});
    }, 3000);
  });
});
