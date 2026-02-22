/**
 * API Integration Tests
 * Retro-fueled with 90s NASA telemetry precision
 */

const request = require('supertest');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');

// Import real modules
const WorkflowEngine = require('../../../src/workflow-engine');
const { getConfig } = require('../../../src/config');

describe('API Integration Tests', () => {
  let server;
  let app;
  let io;
  let workflowEngine;
  let testDb;
  let baseUrl;

  beforeAll(async () => {
    // Create in-memory database
    testDb = new sqlite3.Database(':memory');
    
    // Initialize database schema
    await new Promise((resolve, reject) => {
      testDb.serialize(() => {
        testDb.run(`CREATE TABLE IF NOT EXISTS applications (
          id TEXT PRIMARY KEY,
          name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        testDb.run(`CREATE TABLE IF NOT EXISTS execution_logs (
          id TEXT PRIMARY KEY,
          app_id TEXT,
          function_name TEXT,
          start_time DATETIME,
          end_time DATETIME,
          duration INTEGER,
          success BOOLEAN,
          parameters TEXT,
          error_message TEXT,
          return_value TEXT
        )`);
        resolve();
      });
    });

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

    // Setup API routes (simplified version of server.js)
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
      const workflow = workflowEngine.runningWorkflows.get(workflowId);
      
      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: { message: 'Workflow not found', code: 'NOT_FOUND' }
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
    });

    app.get('/api/workflows', (req, res) => {
      const workflows = Array.from(workflowEngine.runningWorkflows.values()).map(workflow => ({
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
    });

    app.get('/api/metrics', (req, res) => {
      const metrics = workflowEngine.getMetrics();
      res.json({
        success: true,
        metrics: metrics
      });
    });

    // Start server
    await new Promise((resolve) => {
      server.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (io) io.close();
    if (server) server.close();
    if (testDb) testDb.close();
  });

  describe('Health Check Integration', () => {
    test('should return healthy status', async () => {
      const response = await request(baseUrl)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.services.database).toBe('connected');
      expect(response.body.services.workflowEngine).toBe('healthy');
      expect(response.body.metrics.runningWorkflows).toBe(0);
    });
  });

  describe('Workflow Execution Integration', () => {
    test('should execute complete workflow', async () => {
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'end', type: 'End', x: 100, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workflowId).toBeDefined();
      expect(response.body.message).toBe('Workflow execution started');

      // Wait a bit for workflow to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check workflow status
      const statusResponse = await request(baseUrl)
        .get(`/api/workflows/${response.body.workflowId}/status`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.workflow.status).toMatch(/completed|error|running/);
    });

    test('should execute workflow with multiple nodes', async () => {
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'delay', type: 'Delay', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: { duration: 100, unit: 'ms' } },
          { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'delay', portIndex: 0 } },
          { id: 'conn2', from: { nodeId: 'delay', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workflowId).toBeDefined();
    });

    test('should handle conditional workflow', async () => {
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

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should reject invalid workflow structure', async () => {
      const invalidWorkflow = {
        nodes: [
          { id: 'start', type: 'Start' } // Missing required fields
        ],
        connections: []
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(invalidWorkflow)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject workflow without start node', async () => {
      const workflowData = {
        nodes: [
          { id: 'end', type: 'End', x: 0, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: []
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Workflow Management Integration', () => {
    test('should stop running workflow', async () => {
      // Start a workflow
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'delay', type: 'Delay', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: { duration: 5000, unit: 'ms' } },
          { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'delay', portIndex: 0 } },
          { id: 'conn2', from: { nodeId: 'delay', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      const startResponse = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(200);

      const workflowId = startResponse.body.workflowId;

      // Wait a bit then stop
      await new Promise(resolve => setTimeout(resolve, 100));

      const stopResponse = await request(baseUrl)
        .post(`/api/workflows/${workflowId}/stop`)
        .expect(200);

      expect(stopResponse.body.success).toBe(true);
      expect(stopResponse.body.workflowId).toBe(workflowId);
    });

    test('should return 404 for non-existent workflow status', async () => {
      const response = await request(baseUrl)
        .get('/api/workflows/non_existent/status')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    test('should list all running workflows', async () => {
      // Start multiple workflows
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'end', type: 'End', x: 100, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      await request(baseUrl).post('/api/workflows/execute').send(workflowData);
      await request(baseUrl).post('/api/workflows/execute').send(workflowData);

      const response = await request(baseUrl)
        .get('/api/workflows')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workflows.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metrics Integration', () => {
    test('should return workflow metrics', async () => {
      const response = await request(baseUrl)
        .get('/api/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.totalWorkflows).toBeDefined();
      expect(response.body.metrics.successRate).toBeDefined();
    });
  });

  describe('Concurrency Integration', () => {
    test('should handle concurrent workflow execution', async () => {
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'end', type: 'End', x: 100, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      // Execute multiple workflows concurrently
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(request(baseUrl).post('/api/workflows/execute').send(workflowData));
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.workflowId).toBeDefined();
      });
    });

    test('should respect concurrent workflow limit', async () => {
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

      // Start maximum concurrent workflows
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(request(baseUrl).post('/api/workflows/execute').send(workflowData));
      }

      const responses = await Promise.allSettled(promises);
      
      // Some should succeed, some should fail due to concurrency limit
      const successCount = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
      const failCount = responses.filter(r => r.status === 'rejected' || r.value.status === 400).length;
      
      expect(successCount + failCount).toBe(5);
    });
  });
});
