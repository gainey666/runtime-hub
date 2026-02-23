/**
 * Workflow Engine History Cleanup Tests
 * Tests the auto-prune functionality and DELETE endpoint
 */

const WorkflowEngine = require('../../../src/workflow-engine-wrapper');
const { EventEmitter } = require('events');
const request = require('supertest');
const express = require('express');

describe('Workflow Engine History Cleanup', () => {
  let workflowEngine;
  let mockIo;
  let testServer;
  let app;

  beforeEach(() => {
    mockIo = new EventEmitter();
    workflowEngine = new WorkflowEngine(mockIo, {
      workflow: {
        defaultTimeout: 10000,
        maxNodeExecutionTime: 5000
      }
    });

    // Create a test Express server for testing endpoints
    app = express();
    app.use(express.json());

    // Add workflow history endpoints
    app.delete('/api/workflows/history', (req, res) => {
      try {
        workflowEngine.clearWorkflowHistory();
        
        res.json({
          success: true,
          message: 'Workflow history cleared successfully'
        });
        
      } catch (error) {
        console.error('Failed to clear workflow history:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });

    app.get('/api/workflows/history', (req, res) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        const history = workflowEngine.getHistory(limit);
        
        res.json({
          success: true,
          history: history,
          total: history.length
        });
        
      } catch (error) {
        console.error('Failed to get workflow history:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });
  });

  describe('Auto-prune functionality', () => {
    test('should auto-prune workflow history when exceeding 500 entries', async () => {
      // Create 505 workflow entries to exceed the 500 limit
      const workflows = [];
      for (let i = 0; i < 505; i++) {
        const workflow = {
          id: `test-workflow-${i}`,
          name: `Test Workflow ${i}`,
          description: `Test workflow ${i} for history testing`,
          nodes: [
            {
              id: `start-node-${i}`,
              type: 'start',
              config: {},
              position: { x: 50, y: 100 }
            }
          ],
          connections: [],
          status: 'completed',
          startTime: Date.now() - (i * 1000),
          endTime: Date.now() - (i * 1000) + 100,
          duration: 100,
          cancelled: false,
          error: undefined
        };
        
        workflows.push(workflow);
        
        // Add to history
        workflowEngine.addToHistory(workflow);
      }

      // Check that history was auto-pruned to 500 entries
      const history = workflowEngine.getHistory();
      expect(history.length).toBe(500);
      
      // Check that the oldest entries were removed (should be entries 0-4)
      const oldestEntry = history[0];
      expect(oldestEntry.id).toBe('test-workflow-5'); // First 5 entries should be removed
      
      // Check that the newest entries are still there
      const newestEntry = history[history.length - 1];
      expect(newestEntry.id).toBe('test-workflow-504');
      
      console.log('🔍 Debug: Auto-prune working correctly - history limited to 500 entries');
    });

    test('should maintain max history size of 500 entries', async () => {
      // Check initial max history size
      expect(workflowEngine.maxHistorySize).toBe(500);
      
      // Add exactly 500 entries
      for (let i = 0; i < 500; i++) {
        const workflow = {
          id: `exact-limit-${i}`,
          name: `Exact Limit Test ${i}`,
          description: 'Test for exact limit',
          nodes: [{ id: `node-${i}`, type: 'start', config: {}, position: { x: 0, y: 0 } }],
          connections: [],
          status: 'completed',
          startTime: Date.now(),
          endTime: Date.now() + 100,
          duration: 100,
          cancelled: false,
          error: undefined
        };
        
        workflowEngine.addToHistory(workflow);
      }

      // Should have exactly 500 entries
      const history = workflowEngine.getHistory();
      expect(history.length).toBe(500);
      
      // Add one more entry
      const extraWorkflow = {
        id: 'extra-workflow',
        name: 'Extra Workflow',
        description: 'This should trigger pruning',
        nodes: [{ id: 'extra-node', type: 'start', config: {}, position: { x: 0, y: 0 } }],
        connections: [],
        status: 'completed',
        startTime: Date.now(),
        endTime: Date.now() + 100,
        duration: 100,
        cancelled: false,
        error: undefined
      };
      
      workflowEngine.addToHistory(extraWorkflow);
      
      // Should still have 500 entries (oldest removed)
      const updatedHistory = workflowEngine.getHistory();
      expect(updatedHistory.length).toBe(500);
      expect(updatedHistory[updatedHistory.length - 1].id).toBe('extra-workflow');
      
      console.log('🔍 Debug: Max history size maintained correctly');
    });
  });

  describe('DELETE /api/workflows/history endpoint', () => {
    test('should clear all workflow history', async () => {
      // Add some workflow history first
      for (let i = 0; i < 10; i++) {
        const workflow = {
          id: `delete-test-${i}`,
          name: `Delete Test ${i}`,
          description: 'Test for delete endpoint',
          nodes: [{ id: `delete-node-${i}`, type: 'start', config: {}, position: { x: 0, y: 0 } }],
          connections: [],
          status: 'completed',
          startTime: Date.now(),
          endTime: Date.now() + 100,
          duration: 100,
          cancelled: false,
          error: undefined
        };
        
        workflowEngine.addToHistory(workflow);
      }

      // Verify history exists
      let history = workflowEngine.getHistory();
      expect(history.length).toBe(10);

      // Call DELETE endpoint
      const response = await request(app)
        .delete('/api/workflows/history')
        .expect(200);

      // Verify response
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Workflow history cleared successfully');

      // Verify history is cleared
      history = workflowEngine.getHistory();
      expect(history.length).toBe(0);
      
      console.log('🔍 Debug: DELETE endpoint cleared history successfully');
    });

    test('should return error when clearWorkflowHistory fails', async () => {
      // Temporarily break the clearWorkflowHistory method
      const originalClearHistory = workflowEngine.clearWorkflowHistory;
      workflowEngine.clearWorkflowHistory = () => {
        throw new Error('Test error');
      };

      try {
        const response = await request(app)
          .delete('/api/workflows/history')
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Test error');
        
        console.log('🔍 Debug: DELETE endpoint handles errors correctly');
      } finally {
        // Restore original method
        workflowEngine.clearWorkflowHistory = originalClearHistory;
      }
    });
  });

  describe('GET /api/workflows/history endpoint', () => {
    test('should return workflow history with total count', async () => {
      // Add some workflow history
      for (let i = 0; i < 5; i++) {
        const workflow = {
          id: `get-test-${i}`,
          name: `Get Test ${i}`,
          description: 'Test for get endpoint',
          nodes: [{ id: `get-node-${i}`, type: 'start', config: {}, position: { x: 0, y: 0 } }],
          connections: [],
          status: 'completed',
          startTime: Date.now(),
          endTime: Date.now() + 100,
          duration: 100,
          cancelled: false,
          error: undefined
        };
        
        workflowEngine.addToHistory(workflow);
      }

      const response = await request(app)
        .get('/api/workflows/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.history).toHaveLength(5);
      expect(response.body.total).toBe(5);
      expect(response.body.history[0].id).toBe('get-test-0');
      expect(response.body.history[4].id).toBe('get-test-4');
      
      console.log('🔍 Debug: GET endpoint returns history correctly');
    });

    test('should respect limit parameter', async () => {
      // Add more workflow history
      for (let i = 0; i < 10; i++) {
        const workflow = {
          id: `limit-test-${i}`,
          name: `Limit Test ${i}`,
          description: 'Test for limit parameter',
          nodes: [{ id: `limit-node-${i}`, type: 'start', config: {}, position: { x: 0, y: 0 } }],
          connections: [],
          status: 'completed',
          startTime: Date.now(),
          endTime: Date.now() + 100,
          duration: 100,
          cancelled: false,
          error: undefined
        };
        
        workflowEngine.addToHistory(workflow);
      }

      const response = await request(app)
        .get('/api/workflows/history?limit=3')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.history).toHaveLength(3);
      expect(response.body.total).toBe(3);
      // Should return the last 3 entries
      expect(response.body.history[0].id).toBe('limit-test-7');
      expect(response.body.history[2].id).toBe('limit-test-9');
      
      console.log('🔍 Debug: GET endpoint respects limit parameter');
    });
  });
});
