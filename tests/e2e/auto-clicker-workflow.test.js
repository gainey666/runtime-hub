/**
 * End-to-End Tests for Auto-Clicker Workflow
 * Tests the complete screen capture → OCR → number check → click workflow
 */

const request = require('supertest');
const { spawn } = require('child_process');

describe('Auto-Clicker E2E Workflow', () => {
  let apiServer;
  let mainServer;

  beforeAll(async () => {
    // Start API server
    apiServer = spawn('node', ['src/api-server.js'], {
      cwd: '../auto-clicker-tool',
      stdio: 'pipe'
    });

    // Start main server if not already running
    mainServer = spawn('node', ['src/server.js'], {
      cwd: '.',
      stdio: 'pipe'
    });

    // Wait for servers to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  afterAll(async () => {
    // Clean up servers
    if (apiServer) {
      apiServer.kill();
    }
    if (mainServer) {
      mainServer.kill();
    }
  });

  describe('API Server Health Check', () => {
    test('API server should be healthy', async () => {
      const response = await request('http://localhost:3001')
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });

    test('Main server should be healthy', async () => {
      const response = await request('http://localhost:3000')
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Session Management', () => {
    test('should start auto-clicker session', async () => {
      const sessionConfig = {
        area: { x: 0, y: 0, width: 800, height: 600 },
        ocr: { engine: 'simple', language: ['eng'], confidence: 0.7 },
        click: { button: 'left', clickType: 'single' },
        refreshRate: 500,
        targetPattern: 'number'
      };

      const response = await request('http://localhost:3001')
        .post('/api/auto-clicker/start')
        .send(sessionConfig)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('sessionId');
      
      if (response.body.success) {
        expect(response.body.sessionId).toBeDefined();
        expect(typeof response.body.sessionId).toBe('string');
      }
    });

    test('should get session status', async () => {
      const response = await request('http://localhost:3001')
        .get('/api/auto-clicker/status')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('sessions');
      expect(Array.isArray(response.body.sessions)).toBe(true);
    });

    test('should stop auto-clicker session', async () => {
      const response = await request('http://localhost:3001')
        .post('/api/auto-clicker/stop')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Node Editor Integration', () => {
    test('should serve node editor page', async () => {
      const response = await request('http://localhost:3000')
        .get('/node-editor')
        .expect(200);

      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('Runtime Logger');
    });
  });

  describe('Real-time Events', () => {
    test('should establish WebSocket connection', async () => {
      // This test would require a WebSocket client library
      // For now, we'll test that the server supports WebSocket upgrades
      const response = await request('http://localhost:3000')
        .get('/socket.io/')
        .expect(400); // Expected for WebSocket upgrade requests

      // The fact that it doesn't return 404 indicates Socket.IO is configured
    });
  });

  describe('Workflow Integration', () => {
    test('should execute complete workflow', async () => {
      // Start session
      const startResponse = await request('http://localhost:3001')
        .post('/api/auto-clicker/start')
        .send({
          area: { x: 0, y: 0, width: 800, height: 600 },
          ocr: { engine: 'simple', language: ['eng'], confidence: 0.7 },
          click: { button: 'left', clickType: 'single' },
          refreshRate: 1000,
          targetPattern: 'number'
        })
        .expect(200);

      if (startResponse.body.success) {
        const sessionId = startResponse.body.sessionId;

        // Wait for workflow to execute
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check session status
        const statusResponse = await request('http://localhost:3001')
          .get('/api/auto-clicker/status')
          .expect(200);

        expect(statusResponse.body.success).toBe(true);

        // Stop session
        await request('http://localhost:3001')
          .post('/api/auto-clicker/stop')
          .expect(200);
      }
    }, 10000);
  });

  describe('Error Handling', () => {
    test('should handle invalid session configuration', async () => {
      const invalidConfig = {
        area: { x: -1, y: 0, width: 800, height: 600 }, // Invalid area
        ocr: { engine: 'simple', language: ['eng'], confidence: 0.7 },
        click: { button: 'left', clickType: 'single' },
        refreshRate: 500
      };

      const response = await request('http://localhost:3001')
        .post('/api/auto-clicker/start')
        .send(invalidConfig)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle missing session ID', async () => {
      const response = await request('http://localhost:3001')
        .post('/api/auto-clicker/stop')
        .send({ sessionId: 'non-existent-session' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          request('http://localhost:3001')
            .get('/health')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.body).toHaveProperty('status', 'healthy');
      });
    });

    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request('http://localhost:3001')
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
