/**
 * E2E Workflow Tests
 * Retro-fueled with 90s workflow automation dreams
 */

const request = require('supertest');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const WorkflowEngine = require('../../src/workflow-engine.js');
const { getConfig } = require('../../src/config/index.js');

describe('E2E Workflow Tests', () => {
  let server;
  let app;
  let io;
  let workflowEngine;
  let baseUrl;
  let socketClient;

  beforeAll(async () => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Create HTTP server and Socket.IO
    server = createServer(app);
    io = new Server(server, {
      cors: { origin: "*" }
    });

    // Initialize workflow engine
    const config = getConfig();
    workflowEngine = new WorkflowEngine(io, config);

    // Setup API routes
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0-test',
        environment: 'test',
        services: {
          database: 'connected',
          workflowEngine: workflowEngine.runningWorkflows.size < config.workflow.maxConcurrentWorkflows ? 'healthy' : 'overloaded',
          pythonAgents: 'unknown'
        },
        metrics: {
          runningWorkflows: workflowEngine.runningWorkflows.size,
          maxConcurrentWorkflows: config.workflow.maxConcurrentWorkflows
        }
      });
    });

    app.post('/api/workflows/execute', async (req, res) => {
      try {
        const { nodes, connections } = req.body;

        // Validate input
        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
          return res.status(400).json({
            success: false,
            error: { message: 'Nodes array is required', code: 'VALIDATION_ERROR' }
          });
        }

        if (!connections || !Array.isArray(connections)) {
          return res.status(400).json({
            success: false,
            error: { message: 'Connections array is required', code: 'VALIDATION_ERROR' }
          });
        }

        // Validate node structure
        nodes.forEach((node, index) => {
          if (!node.id || !node.type || typeof node.x !== 'number' || typeof node.y !== 'number') {
            throw new Error(`Invalid node structure at index ${index}`);
          }
        });

        // Validate connection structure
        connections.forEach((connection, index) => {
          if (!connection.id || !connection.from || !connection.to ||
              !connection.from.nodeId || !connection.to.nodeId ||
              typeof connection.from.portIndex !== 'number' ||
              typeof connection.to.portIndex !== 'number') {
            throw new Error(`Invalid connection structure at index ${index}`);
          }
        });

        const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Execute workflow
        workflowEngine.executeWorkflow(workflowId, nodes, connections)
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
        res.status(400).json({
          success: false,
          error: { message: error.message, code: 'VALIDATION_ERROR' }
        });
      }
    });

    app.post('/api/workflows/:workflowId/stop', (req, res) => {
      const { workflowId } = req.params;
      const success = workflowEngine.stopWorkflow(workflowId);

      res.json({
        success: success,
        workflowId: workflowId,
        message: success ? 'Workflow stopped successfully' : 'Workflow not found'
      });
    });

    app.get('/api/workflows/:workflowId/status', (req, res) => {
      const { workflowId } = req.params;
      let workflow = workflowEngine.runningWorkflows.get(workflowId);
      
      // If not in running workflows, check history
      if (!workflow) {
        const history = workflowEngine.getHistory();
        workflow = history.find(w => w.id === workflowId);
      }
      
      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: { message: 'Workflow not found', code: 'WORKFLOW_NOT_FOUND' }
        });
      }

      // Calculate completedNodes for workflows from history
      let completedNodes = workflow.completedNodes || 0;
      if (workflow.status === 'completed' && !workflow.completedNodes) {
        completedNodes = workflow.nodeCount || 0;
      }

      res.json({
        success: true,
        workflow: {
          id: workflow.id,
          status: workflow.status,
          nodeCount: workflow.nodeCount,
          completedNodes,
          startTime: workflow.startTime,
          endTime: workflow.endTime,
          duration: workflow.duration,
          error: workflow.error
        }
      });
    });

    // Start server
    await new Promise((resolve) => {
      server.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });

    // Setup Socket.IO client for testing
    socketClient = require('socket.io-client')(`http://localhost:${server.address().port}`);
  });

  afterAll(async () => {
    if (socketClient) {
      socketClient.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (io) {
      io.close();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (server) {
      server.close();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Force close any remaining connections
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  describe('Complete Workflow Execution', () => {
    test('should execute simple start-to-end workflow', async () => {
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'end', type: 'End', x: 100, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      // Start workflow
      const startResponse = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(200);

      expect(startResponse.body.success).toBe(true);
      expect(startResponse.body.workflowId).toBeDefined();

      const workflowId = startResponse.body.workflowId;

      // Wait for workflow to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check final status
      const statusResponse = await request(baseUrl)
        .get(`/api/workflows/${workflowId}/status`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.workflow.status).toBe('completed');
      expect(statusResponse.body.workflow.nodeCount).toBe(2);
      expect(statusResponse.body.workflow.completedNodes).toBe(2);
    });

    test('should execute conditional workflow with true branch', async () => {
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'condition', type: 'Condition', x: 100, y: 0, inputs: ['main'], outputs: ['true', 'false'], config: { condition: 'test', operator: 'equals', value: 'test' } },
          { id: 'end_true', type: 'End', x: 200, y: -50, inputs: ['true'], outputs: [], config: {} },
          { id: 'end_false', type: 'End', x: 200, y: 50, inputs: ['false'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'condition', portIndex: 0 } },
          { id: 'conn2', from: { nodeId: 'condition', portIndex: 0 }, to: { nodeId: 'end_true', portIndex: 0 } },
          { id: 'conn3', from: { nodeId: 'condition', portIndex: 1 }, to: { nodeId: 'end_false', portIndex: 0 } }
        ]
      };

      const startResponse = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(200);

      const workflowId = startResponse.body.workflowId;

      // Wait for workflow to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const statusResponse = await request(baseUrl)
        .get(`/api/workflows/${workflowId}/status`)
        .expect(200);

      expect(statusResponse.body.workflow.status).toBe('completed');
      expect(statusResponse.body.workflow.nodeCount).toBe(4);
      expect(statusResponse.body.workflow.completedNodes).toBe(3); // Start + Condition + True branch
    });

    test('should execute workflow with delay', async () => {
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'delay', type: 'Delay', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: { duration: 200, unit: 'ms' } },
          { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'delay', portIndex: 0 } },
          { id: 'conn2', from: { nodeId: 'delay', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      const startTime = Date.now();

      const startResponse = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(200);

      const workflowId = startResponse.body.workflowId;

      // Wait for workflow to complete (delay + execution time)
      await new Promise(resolve => setTimeout(resolve, 500));

      const endTime = Date.now();

      const statusResponse = await request(baseUrl)
        .get(`/api/workflows/${workflowId}/status`)
        .expect(200);

      expect(statusResponse.body.workflow.status).toBe('completed');
      expect(statusResponse.body.workflow.duration).toBeGreaterThan(200); // At least the delay duration
      expect(endTime - startTime).toBeGreaterThan(200); // Total time should be > 200ms
    });

    test('should handle workflow errors gracefully', async () => {
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'invalid', type: 'InvalidNodeType', x: 100, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'invalid', portIndex: 0 } }
        ]
      };

      const startResponse = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(200);

      const workflowId = startResponse.body.workflowId;

      // Wait for workflow to fail
      await new Promise(resolve => setTimeout(resolve, 500));

      const statusResponse = await request(baseUrl)
        .get(`/api/workflows/${workflowId}/status`)
        .expect(200);

      expect(statusResponse.body.workflow.status).toBe('error');
      expect(statusResponse.body.workflow.nodeCount).toBe(2);
      expect(statusResponse.body.workflow.completedNodes).toBe(1); // Only start node completed
    });
  });

  describe('Workflow Management E2E', () => {
    test('should stop running workflow via API', async () => {
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'delay', type: 'Delay', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: { duration: 2000, unit: 'ms' } },
          { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'delay', portIndex: 0 } },
          { id: 'conn2', from: { nodeId: 'delay', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      // Start workflow
      const startResponse = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(200);

      const workflowId = startResponse.body.workflowId;

      // Wait for workflow to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Stop workflow
      const stopResponse = await request(baseUrl)
        .post(`/api/workflows/${workflowId}/stop`)
        .expect(200);

      expect(stopResponse.body.success).toBe(true);
      expect(stopResponse.body.workflowId).toBe(workflowId);

      // Check final status
      await new Promise(resolve => setTimeout(resolve, 100));

      const statusResponse = await request(baseUrl)
        .get(`/api/workflows/${workflowId}/status`)
        .expect(200);

      expect(statusResponse.body.workflow.status).toBe('stopped');
    });
  });

  describe('Real-time Updates', () => {
    test('should receive workflow status updates via Socket.IO', (done) => {
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'end', type: 'End', x: 100, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      let workflowUpdateReceived = false;
      let nodeUpdateReceived = false;

      socketClient.on('workflow_update', (data) => {
        expect(data.workflowId).toBeDefined();
        expect(data.status).toBe('completed');
        expect(data.timestamp).toBeDefined();
        workflowUpdateReceived = true;

        if (workflowUpdateReceived && nodeUpdateReceived) {
          done();
        }
      });

      socketClient.on('node_update', (data) => {
        expect(data.workflowId).toBeDefined();
        expect(data.nodeId).toBeDefined();
        expect(['running', 'completed']).toContain(data.status);
        expect(data.timestamp).toBeDefined();
        nodeUpdateReceived = true;

        if (workflowUpdateReceived && nodeUpdateReceived) {
          done();
        }
      });

      // Wait for Socket.IO client to connect before starting workflow
      socketClient.on('connect', () => {
        // Start workflow
        request(baseUrl)
          .post('/api/workflows/execute')
          .send(workflowData)
          .then(() => {
            // Wait for updates
            setTimeout(() => {
              if (!workflowUpdateReceived || !nodeUpdateReceived) {
                done(new Error('Socket.IO updates not received'));
              }
            }, 1000);
          });
      });
    });
  });

  describe('Health Monitoring', () => {
    test('should maintain healthy service status', async () => {
      const response = await request(baseUrl)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.services.database).toBe('connected');
      expect(response.body.services.workflowEngine).toBe('healthy');
      expect(response.body.metrics.runningWorkflows).toBeDefined();
      expect(response.body.metrics.maxConcurrentWorkflows).toBeDefined();
    });

    test('should track running workflows in health status', async () => {
      // Start a workflow
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'delay', type: 'Delay', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: { duration: 1000, unit: 'ms' } },
          { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'delay', portIndex: 0 } },
          { id: 'conn2', from: { nodeId: 'delay', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      await request(baseUrl)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(200);

      // Check health status
      const healthResponse = await request(baseUrl)
        .get('/health')
        .expect(200);

      expect(healthResponse.body.metrics.runningWorkflows).toBe(1);
      expect(healthResponse.body.services.workflowEngine).toBe('healthy');
    });
  });
});
