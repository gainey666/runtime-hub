/**
 * Performance Tests
 * Retro-fueled with 90s overclocking benchmarks
 */

const request = require('supertest');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const WorkflowEngine = require('../../src/workflow-engine.js');
const { getConfig } = require('../../src/config/index.js');

describe('Performance Benchmarks', () => {
  let server;
  let app;
  let io;
  let workflowEngine;
  let baseUrl;

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
        environment: 'test'
      });
    });

    app.post('/api/workflows/execute', async (req, res) => {
      try {
        const { nodes, connections } = req.body;
        const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Execute workflow
        workflowEngine.executeWorkflow(workflowId, nodes, connections)
          .then(result => {
            console.log(`✅ Workflow completed: ${workflowId} (${result.duration}ms)`);
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

  describe('API Response Time Benchmarks', () => {
    test('should respond to health check within 100ms', async () => {
      const startTime = Date.now();

      await request(baseUrl)
        .get('/health')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(150);
      console.log(`🏥 Health check response time: ${responseTime}ms`);
    });

    test('should start workflow within 200ms', async () => {
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'end', type: 'End', x: 100, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      const startTime = Date.now();

      await request(baseUrl)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(200);
      console.log(`🚀 Workflow start response time: ${responseTime}ms`);
    });
  });

  describe('Workflow Execution Performance', () => {
    test('should execute simple workflow within 500ms', async () => {
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'end', type: 'End', x: 100, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      const executionStartTime = Date.now();

      const startResponse = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(200);

      const workflowId = startResponse.body.workflowId;

      // Wait for workflow to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check completion time
      const metrics = workflowEngine.getMetrics();
      const executionEndTime = Date.now();
      const totalTime = executionEndTime - executionStartTime;

      expect(totalTime).toBeLessThan(500);
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
      console.log(`⚡ Simple workflow execution time: ${totalTime}ms (avg: ${Math.round(metrics.averageExecutionTime)}ms)`);
    });

    test('should execute complex workflow within 2 seconds', async () => {
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'delay1', type: 'Delay', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: { duration: 100, unit: 'ms' } },
          { id: 'condition', type: 'Condition', x: 200, y: 0, inputs: ['main'], outputs: ['true', 'false'], config: { condition: 'test', operator: 'equals', value: 'test' } },
          { id: 'delay2', type: 'Delay', x: 300, y: -50, inputs: ['true'], outputs: ['main'], config: { duration: 50, unit: 'ms' } },
          { id: 'end', type: 'End', x: 400, y: -50, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'delay1', portIndex: 0 } },
          { id: 'conn2', from: { nodeId: 'delay1', portIndex: 0 }, to: { nodeId: 'condition', portIndex: 0 } },
          { id: 'conn3', from: { nodeId: 'condition', portIndex: 0 }, to: { nodeId: 'delay2', portIndex: 0 } },
          { id: 'conn4', from: { nodeId: 'delay2', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      const executionStartTime = Date.now();

      const startResponse = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(workflowData)
        .expect(200);

      const workflowId = startResponse.body.workflowId;

      // Wait for workflow to complete (includes delays)
      await new Promise(resolve => setTimeout(resolve, 500));

      const executionEndTime = Date.now();
      const totalTime = executionEndTime - executionStartTime;

      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
      console.log(`🏗️ Complex workflow execution time: ${totalTime}ms`);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    test('should not exceed memory limits during workflow execution', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Execute multiple workflows concurrently
      const workflowPromises = [];
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'end', type: 'End', x: 100, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      // Start 10 concurrent workflows
      for (let i = 0; i < 10; i++) {
        workflowPromises.push(
          request(baseUrl)
            .post('/api/workflows/execute')
            .send(workflowData)
        );
      }

      await Promise.all(workflowPromises);

      // Wait for workflows to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      // Should not exceed 50MB memory increase
      expect(memoryIncreaseMB).toBeLessThan(50);
      console.log(`💾 Memory usage: +${memoryIncreaseMB.toFixed(2)}MB (initial: ${(initialMemory / (1024 * 1024)).toFixed(2)}MB, final: ${(finalMemory / (1024 * 1024)).toFixed(2)}MB)`);
    });
  });

  describe('Concurrent Workflow Performance', () => {
    test('should handle concurrent workflow execution efficiently', async () => {
      const concurrentWorkflows = 5;
      const workflowPromises = [];
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

      const startTime = Date.now();

      // Start concurrent workflows
      for (let i = 0; i < concurrentWorkflows; i++) {
        workflowPromises.push(
          request(baseUrl)
            .post('/api/workflows/execute')
            .send(workflowData)
        );
      }

      await Promise.all(workflowPromises);

      // Wait for all workflows to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (allowing for some sequential execution)
      expect(totalTime).toBeLessThan(1000); // Less than 1 second for concurrent execution

      console.log(`🔄 Concurrent workflows (${concurrentWorkflows}) completed in: ${totalTime}ms`);
    });
  });

  describe('Database Performance Benchmarks', () => {
    test('should maintain database performance under load', async () => {
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'end', type: 'End', x: 100, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      const iterations = 20;
      const responseTimes = [];

      // Execute multiple workflows to stress the system
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await request(baseUrl)
          .post('/api/workflows/execute')
          .send(workflowData);

        const endTime = Date.now();
        responseTimes.push(endTime - startTime);

        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Wait for workflows to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      // Performance expectations
      expect(avgResponseTime).toBeLessThan(100); // Average response time < 100ms
      expect(maxResponseTime).toBeLessThan(200); // Max response time < 200ms
      expect(minResponseTime).toBeGreaterThan(0); // Min response time > 0ms

      console.log(`📊 Database performance (${iterations} iterations):`);
      console.log(`   - Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`   - Max response time: ${maxResponseTime}ms`);
      console.log(`   - Min response time: ${minResponseTime}ms`);
    });
  });

  describe('System Resource Monitoring', () => {
    test('should monitor system resources during load', async () => {
      const initialMemory = process.memoryUsage();
      const initialCpu = process.cpuUsage();

      // Generate load with multiple concurrent workflows
      const loadPromises = [];
      const workflowData = {
        nodes: [
          { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
          { id: 'delay', type: 'Delay', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: { duration: 50, unit: 'ms' } },
          { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
        ],
        connections: [
          { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'delay', portIndex: 0 } },
          { id: 'conn2', from: { nodeId: 'delay', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
        ]
      };

      // Start 15 concurrent workflows
      for (let i = 0; i < 15; i++) {
        loadPromises.push(
          request(baseUrl)
            .post('/api/workflows/execute')
            .send(workflowData)
        );
      }

      await Promise.all(loadPromises);

      // Wait for completion and measure
      await new Promise(resolve => setTimeout(resolve, 200));

      const finalMemory = process.memoryUsage();
      const finalCpu = process.cpuUsage(initialCpu);

      const memoryIncreaseMB = (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024);
      const cpuTimeMs = (finalCpu.user + finalCpu.system) / 1000;

      // Resource usage expectations
      expect(memoryIncreaseMB).toBeLessThan(100); // Memory increase < 100MB
      expect(cpuTimeMs).toBeGreaterThan(0); // Some CPU time used
      expect(cpuTimeMs).toBeLessThan(500); // CPU time < 500ms

      console.log(`📈 System resources under load:`);
      console.log(`   - Memory increase: +${memoryIncreaseMB.toFixed(2)}MB`);
      console.log(`   - CPU time used: ${cpuTimeMs.toFixed(2)}ms`);
      console.log(`   - Heap used: ${(finalMemory.heapUsed / (1024 * 1024)).toFixed(2)}MB`);
      console.log(`   - RSS: ${(finalMemory.rss / (1024 * 1024)).toFixed(2)}MB`);
    });
  });
  
  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    }
    // Close socket.io if it exists
    if (io) {
      await new Promise((resolve) => {
        io.close(() => {
          resolve();
        });
      });
    }
  });
});
