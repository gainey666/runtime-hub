/**
 * Server API Unit Tests
 * Retro-fueled with 2000s enterprise integration precision
 */

const request = require('supertest');
const express = require('express');
const path = require('path');

// Mock dependencies
jest.mock('../../../src/workflow-engine');
jest.mock('socket.io');

const WorkflowEngine = require('../../../src/workflow-engine');

describe('Server API Endpoints', () => {
  let app;
  let mockWorkflowEngine;
  let mockIo;

  beforeEach(() => {
    // Create mock workflow engine
    mockWorkflowEngine = {
      executeWorkflow: jest.fn(),
      stopWorkflow: jest.fn(),
      runningWorkflows: new Map(),
      getMetrics: jest.fn(() => ({
        totalWorkflows: 5,
        successfulWorkflows: 4,
        failedWorkflows: 1,
        successRate: '80.00%',
        averageExecutionTime: 1500
      }))
    };

    // Mock Socket.IO
    mockIo = {
      emit: jest.fn(),
      on: jest.fn()
    };

    // Create Express app with server routes
    app = express();
    app.use(express.json());

    // Health endpoint
    app.get('/health', (req, res) => {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0',
        environment: 'test',
        services: {
          database: 'connected',
          workflowEngine: 'healthy',
          pythonAgents: 'unknown'
        },
        metrics: {
          runningWorkflows: mockWorkflowEngine.runningWorkflows.size,
          maxConcurrentWorkflows: 5
        }
      };
      res.json(health);
    });

    // Workflow execution endpoint
    app.post('/api/workflows/execute', async (req, res) => {
      try {
        const { nodes, connections } = req.body;
        
        // Basic validation
        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Nodes array is required and must not be empty',
              code: 'VALIDATION_ERROR'
            }
          });
        }

        if (!connections || !Array.isArray(connections)) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Connections array is required',
              code: 'VALIDATION_ERROR'
            }
          });
        }

        const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Execute workflow
        mockWorkflowEngine.executeWorkflow(workflowId, nodes, connections)
          .then(result => {
            console.log(`✅ Workflow completed: ${workflowId}`);
          })
          .catch(error => {
            console.error(`❌ Workflow failed: ${workflowId} - ${error.message}`);
          });
        
        res.json({ 
          success: true, 
          workflowId: workflowId,
          message: 'Workflow execution started'
        });
        
      } catch (error) {
        console.error('Failed to start workflow:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Stop workflow endpoint
    app.post('/api/workflows/:workflowId/stop', (req, res) => {
      try {
        const { workflowId } = req.params;
        const success = mockWorkflowEngine.stopWorkflow(workflowId);
        
        res.json({ 
          success: success,
          workflowId: workflowId,
          message: success ? 'Workflow stopped successfully' : 'Workflow not found'
        });
        
      } catch (error) {
        console.error('Failed to stop workflow:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get workflow status endpoint
    app.get('/api/workflows/:workflowId/status', (req, res) => {
      try {
        const { workflowId } = req.params;
        const workflow = mockWorkflowEngine.runningWorkflows.get(workflowId);
        
        if (!workflow) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Workflow not found',
              code: 'NOT_FOUND'
            }
          });
        }
        
        res.json({
          success: true,
          workflow: {
            id: workflow.id,
            status: workflow.status,
            startTime: workflow.startTime,
            duration: workflow.duration,
            nodeCount: workflow.nodes.length,
            completedNodes: Array.from(workflow.executionState.values()).filter(state => state.status === 'completed').length
          }
        });
        
      } catch (error) {
        console.error('Failed to get workflow status:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get all workflows endpoint
    app.get('/api/workflows', (req, res) => {
      try {
        const workflows = Array.from(mockWorkflowEngine.runningWorkflows.values()).map(workflow => ({
          id: workflow.id,
          status: workflow.status,
          startTime: workflow.startTime,
          duration: workflow.duration,
          nodeCount: workflow.nodes.length,
          completedNodes: Array.from(workflow.executionState.values()).filter(state => state.status === 'completed').length
        }));
        
        res.json({
          success: true,
          workflows: workflows
        });
        
      } catch (error) {
        console.error('Failed to get workflows:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    // Get metrics endpoint
    app.get('/api/metrics', (req, res) => {
      try {
        const metrics = mockWorkflowEngine.getMetrics();
        res.json({
          success: true,
          metrics: metrics
        });
      } catch (error) {
        console.error('Failed to get metrics:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });
  });

  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.memory).toBeDefined();
      expect(response.body.services).toBeDefined();
      expect(response.body.metrics).toBeDefined();
    });
  });

  describe('POST /api/workflows/execute', () => {
    test('should start workflow execution', async () => {
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'end', type: 'End', x: 100, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      const response = await request(app)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workflowId).toBeDefined();
      expect(response.body.message).toBe('Workflow execution started');
      expect(mockWorkflowEngine.executeWorkflow).toHaveBeenCalled();
    });

    test('should reject empty nodes array', async () => {
      const response = await request(app)
        .post('/api/workflows/execute')
        .send({ nodes: [], connections: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Nodes array is required');
    });

    test('should reject missing nodes', async () => {
      const response = await request(app)
        .post('/api/workflows/execute')
        .send({ connections: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Nodes array is required');
    });

    test('should reject missing connections', async () => {
      const response = await request(app)
        .post('/api/workflows/execute')
        .send({ nodes: [{ id: 'test', type: 'Start' }] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Connections array is required');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/workflows/execute')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/workflows/:workflowId/stop', () => {
    test('should stop workflow', async () => {
      mockWorkflowEngine.stopWorkflow.mockReturnValue(true);

      const response = await request(app)
        .post('/api/workflows/test_wf/stop')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workflowId).toBe('test_wf');
      expect(response.body.message).toBe('Workflow stopped successfully');
      expect(mockWorkflowEngine.stopWorkflow).toHaveBeenCalledWith('test_wf');
    });

    test('should handle non-existent workflow', async () => {
      mockWorkflowEngine.stopWorkflow.mockReturnValue(false);

      const response = await request(app)
        .post('/api/workflows/non_existent/stop')
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Workflow not found');
    });
  });

  describe('GET /api/workflows/:workflowId/status', () => {
    test('should return workflow status', async () => {
      const mockWorkflow = {
        id: 'test_wf',
        status: 'running',
        startTime: Date.now(),
        duration: 5000,
        nodes: [{ id: 'node1' }, { id: 'node2' }],
        executionState: new Map([
          ['node1', { status: 'completed' }],
          ['node2', { status: 'running' }]
        ])
      };

      mockWorkflowEngine.runningWorkflows.set('test_wf', mockWorkflow);

      const response = await request(app)
        .get('/api/workflows/test_wf/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workflow.id).toBe('test_wf');
      expect(response.body.workflow.status).toBe('running');
      expect(response.body.workflow.nodeCount).toBe(2);
      expect(response.body.workflow.completedNodes).toBe(1);
    });

    test('should return 404 for non-existent workflow', async () => {
      const response = await request(app)
        .get('/api/workflows/non_existent/status')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/workflows', () => {
    test('should return all running workflows', async () => {
      const mockWorkflows = [
        {
          id: 'wf1',
          status: 'running',
          startTime: Date.now(),
          duration: 3000,
          nodes: [{ id: 'node1' }],
          executionState: new Map([['node1', { status: 'completed' }]])
        },
        {
          id: 'wf2',
          status: 'completed',
          startTime: Date.now() - 5000,
          duration: 2000,
          nodes: [{ id: 'node2' }],
          executionState: new Map([['node2', { status: 'completed' }]])
        }
      ];

      mockWorkflowEngine.runningWorkflows.set('wf1', mockWorkflows[0]);
      mockWorkflowEngine.runningWorkflows.set('wf2', mockWorkflows[1]);

      const response = await request(app)
        .get('/api/workflows')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workflows).toHaveLength(2);
      expect(response.body.workflows[0].id).toBe('wf1');
      expect(response.body.workflows[1].id).toBe('wf2');
    });

    test('should return empty array when no workflows', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workflows).toEqual([]);
    });
  });

  describe('GET /api/metrics', () => {
    test('should return workflow metrics', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.totalWorkflows).toBe(5);
      expect(response.body.metrics.successRate).toBe('80.00%');
      expect(mockWorkflowEngine.getMetrics).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle server errors gracefully', async () => {
      // Mock an error in workflow execution
      mockWorkflowEngine.executeWorkflow.mockImplementation(() => {
        throw new Error('Test error');
      });

      const workflowData = {
        nodes: [{ id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} }],
        connections: []
      };

      const response = await request(app)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Test error');
    });

    test('should handle malformed workflow ID', async () => {
      const response = await request(app)
        .get('/api/workflows//status')
        .expect(404);
    });
  });
});
