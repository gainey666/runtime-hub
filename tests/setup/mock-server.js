/**
 * Mock Server Setup
 * 2000s web server simulation for testing
 * Retro-fueled with early 2000s web tech
 */

const { createServer } = require('http');
const { Server } = require('socket.io');

class MockServer {
  constructor() {
    this.server = null;
    this.io = null;
    this.port = null;
    this.app = null;
  }

  start() {
    // Create Express app
    const express = require('express');
    this.app = express();
    
    // Basic middleware
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      next();
    });
    
    // Mock endpoints
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 123.456,
        memory: { rss: 50000000, heapUsed: 25000000 },
        version: '1.0.0-test'
      });
    });
    
    this.app.post('/api/workflows/execute', (req, res) => {
      res.json({
        success: true,
        workflowId: 'test_workflow_' + Date.now(),
        message: 'Test workflow execution started'
      });
    });
    
    this.app.post('/api/workflows/:workflowId/stop', (req, res) => {
      res.json({
        success: true,
        workflowId: req.params.workflowId,
        message: 'Test workflow stopped'
      });
    });
    
    // Create HTTP server
    this.server = createServer(this.app);
    
    // Create Socket.IO server
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    // Start server
    this.server.listen(0, () => {
      this.port = this.server.address().port;
      console.log(`🌐 Mock server running on port ${this.port}`);
    });
    
    return this.port;
  }

  stop() {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    
    this.port = null;
    console.log('🛑 Mock server stopped');
  }

  // Emit mock events
  emitEvent(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  // Get Socket.IO instance
  getIO() {
    return this.io;
  }
}

module.exports = MockServer;
