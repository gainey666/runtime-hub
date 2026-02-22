/**
 * Auto-Clicker API Server
 * Provides endpoints for React UI to control auto-clicking functionality
 * INTEGRATED WITH REAL AUTO-CLICKER ENGINE
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Load real auto-clicker engine with portable path
const enginePath = path.join(__dirname, 'core', 'auto-clicker', 'auto-clicker-engine');
const { AutoClickerEngine } = require(enginePath);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize real auto-clicker engine
const engine = new AutoClickerEngine();

// API Server state
class AutoClickerAPIServer {
  constructor() {
    this.sessions = new Map(); // sessionId -> { clicker: engine instance, webhookUrl, actionCount, lastMinute }
    this.EMERGENCY_STOP = false;
    this.DRY_RUN = process.env.DRY_RUN === '1';
    this.MAX_ACTIONS_PER_MINUTE = 120;

    if (this.DRY_RUN) {
      console.log('⚠️  DRY_RUN MODE ENABLED - No actual OS events will be sent');
    }
  }

  // Per-session rate limiter
  allowAction(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { allowed: false, reason: 'Session not found' };
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Reset counter if we're in a new minute
    if (session.lastMinute < oneMinuteAgo) {
      session.actionCount = 0;
      session.lastMinute = now;
    }

    if (session.actionCount >= this.MAX_ACTIONS_PER_MINUTE) {
      return { allowed: false, reason: 'Rate limit exceeded' };
    }

    session.actionCount++;
    return { allowed: true };
  }

  // Validate config with proper checks
  validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('Config must be an object');
    }

    if (!config.area || typeof config.area !== 'object') {
      throw new Error('Config.area must be an object with x, y, width, height');
    }

    const { x, y, width, height } = config.area;
    if (typeof x !== 'number' || typeof y !== 'number' ||
        typeof width !== 'number' || typeof height !== 'number') {
      throw new Error('Config.area must have numeric x, y, width, height');
    }

    if (width <= 0 || height <= 0) {
      throw new Error('Config.area width and height must be positive');
    }

    if (!config.ocr || typeof config.ocr !== 'object') {
      throw new Error('Config.ocr must be an object');
    }

    if (!config.click || typeof config.click !== 'object') {
      throw new Error('Config.click must be an object');
    }
  }

  // Wrapper for OS events that respects DRY_RUN
  async executeAction(sessionId, actionFn, actionName = 'action') {
    if (this.DRY_RUN) {
      console.log(`[DRY_RUN] Would execute ${actionName} for session ${sessionId}`);
      return { success: true, dryRun: true };
    }

    if (this.EMERGENCY_STOP) {
      throw new Error('EMERGENCY_STOP is active - all actions blocked');
    }

    const rateCheck = this.allowAction(sessionId);
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit: ${rateCheck.reason}`);
    }

    return await actionFn();
  }

  // Setup event handlers for a specific session
  setupSessionEventHandlers(sessionId, clicker) {
    clicker.on('session_started', (data) => {
      console.log(`🚀 [${sessionId}] Session started`);
      io.emit('session_status_update', { sessionId, status: 'running', ...data });
      this.sendWebhook(sessionId, 'session_started', data);
    });

    clicker.on('session_stopped', (data) => {
      console.log(`🛑 [${sessionId}] Session stopped`);
      io.emit('session_status_update', { sessionId, status: 'stopped', ...data });
      this.sendWebhook(sessionId, 'session_stopped', data);
    });

    clicker.on('status_update', (data) => {
      console.log(`📊 [${sessionId}] Status: ${data.status}`);
      io.emit('session_status_update', { sessionId, ...data });
    });

    clicker.on('screen_captured', (data) => {
      io.emit('auto_clicker_event', {
        sessionId,
        type: 'capture',
        timestamp: Date.now(),
        ...data
      });
    });

    clicker.on('ocr_completed', (data) => {
      io.emit('auto_clicker_event', {
        sessionId,
        type: 'ocr',
        timestamp: Date.now(),
        ...data
      });
    });

    clicker.on('click_performed', (data) => {
      io.emit('auto_clicker_event', {
        sessionId,
        type: 'click',
        timestamp: Date.now(),
        ...data
      });
      this.sendWebhook(sessionId, 'click_performed', data);
    });

    clicker.on('error', (data) => {
      console.error(`❌ [${sessionId}] Error:`, data.error);
      io.emit('auto_clicker_event', {
        sessionId,
        type: 'error',
        timestamp: Date.now(),
        ...data
      });
      this.sendWebhook(sessionId, 'error', data);
    });
  }

  // Send webhook if configured for session
  async sendWebhook(sessionId, event, data) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.webhookUrl) {
      return;
    }

    try {
      const payload = {
        sessionId,
        event,
        timestamp: Date.now(),
        data
      };

      if (typeof fetch === 'undefined') {
        console.warn('⚠️  fetch not available - webhook not sent');
        return;
      }

      const response = await fetch(session.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`❌ Webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Webhook error for session ${sessionId}:`, error);
    }
  }
}

const apiServer = new AutoClickerAPIServer();

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected to auto-clicker API');

  // Send status of all sessions
  const sessions = Array.from(apiServer.sessions.entries()).map(([id, data]) => ({
    sessionId: id,
    status: engine.getSession(id)?.status || 'unknown'
  }));

  socket.emit('session_list', { sessions });

  socket.on('disconnect', () => {
    console.log('Client disconnected from auto-clicker API');
  });
});

// Start auto-clicker session
app.post('/api/auto-clicker/start', async (req, res) => {
  try {
    const { area, ocr, click, refreshRate, targetPattern } = req.body;

    // Validate config
    apiServer.validateConfig({ area, ocr, click, refreshRate: refreshRate || 500 });

    // Create config object
    const config = {
      area,
      ocr: ocr || { engine: 'simple', language: ['eng'], confidence: 0.5 },
      click: click || { button: 'left', x: 100, y: 100 },
      refreshRate: refreshRate || 500,
      targetPattern
    };

    // Start session using real engine
    const sessionId = await apiServer.executeAction('new-session', async () => {
      return await engine.start(config);
    }, 'start');

    // Store session data
    apiServer.sessions.set(sessionId, {
      clicker: engine,
      webhookUrl: null,
      actionCount: 0,
      lastMinute: Date.now()
    });

    // Setup event handlers for this session
    apiServer.setupSessionEventHandlers(sessionId, engine);

    res.json({
      success: true,
      message: 'Auto-clicker session started',
      sessionId,
      config,
      dryRun: apiServer.DRY_RUN
    });
  } catch (error) {
    console.error('❌ Failed to start session:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Stop specific session or all sessions
app.post('/api/auto-clicker/stop/:sessionId?', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (sessionId) {
      // Stop specific session
      if (!apiServer.sessions.has(sessionId)) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      await engine.stop(sessionId);
      apiServer.sessions.delete(sessionId);

      res.json({
        success: true,
        message: 'Session stopped',
        sessionId
      });
    } else {
      // Stop all sessions
      const results = [];
      for (const [sid, session] of apiServer.sessions.entries()) {
        try {
          await engine.stop(sid);
          results.push({ sessionId: sid, success: true });
        } catch (error) {
          results.push({ sessionId: sid, success: false, error: error.message });
        }
      }
      apiServer.sessions.clear();

      res.json({
        success: true,
        message: 'All sessions stopped',
        results
      });
    }
  } catch (error) {
    console.error('❌ Failed to stop session:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Pause session
app.post('/api/auto-clicker/pause/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!apiServer.sessions.has(sessionId)) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    await engine.pause(sessionId);

    res.json({
      success: true,
      message: 'Session paused',
      sessionId
    });
  } catch (error) {
    console.error('❌ Failed to pause session:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Resume session
app.post('/api/auto-clicker/resume/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!apiServer.sessions.has(sessionId)) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    await engine.resume(sessionId);

    res.json({
      success: true,
      message: 'Session resumed',
      sessionId
    });
  } catch (error) {
    console.error('❌ Failed to resume session:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Register webhook for session
app.post('/api/webhook/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { url } = req.body;

    if (!apiServer.sessions.has(sessionId)) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook URL - must be http:// or https://'
      });
    }

    const session = apiServer.sessions.get(sessionId);
    session.webhookUrl = url;

    res.json({
      success: true,
      message: 'Webhook registered',
      sessionId,
      webhookUrl: url
    });
  } catch (error) {
    console.error('❌ Failed to register webhook:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Emergency stop - stops all sessions immediately
app.post('/api/emergency-stop', async (req, res) => {
  try {
    console.log('🚨 EMERGENCY STOP ACTIVATED');
    apiServer.EMERGENCY_STOP = true;

    const results = [];
    for (const [sessionId, session] of apiServer.sessions.entries()) {
      try {
        await engine.stop(sessionId);
        results.push({ sessionId, stopped: true });
      } catch (error) {
        results.push({ sessionId, stopped: false, error: error.message });
      }
    }
    apiServer.sessions.clear();

    res.json({
      success: true,
      message: 'Emergency stop completed',
      sessionsStopped: results.length,
      results,
      emergencyStopActive: apiServer.EMERGENCY_STOP
    });
  } catch (error) {
    console.error('❌ Emergency stop failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get session status
app.get('/api/auto-clicker/status/:sessionId?', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (sessionId) {
      // Get specific session
      const session = engine.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        session
      });
    } else {
      // Get all sessions
      const status = await engine.getStatus();
      const sessions = engine.getAllSessions();

      res.json({
        success: true,
        ...status,
        sessions,
        emergencyStop: apiServer.EMERGENCY_STOP,
        dryRun: apiServer.DRY_RUN
      });
    }
  } catch (error) {
    console.error('❌ Failed to get status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const status = await engine.getStatus();
    res.json({
      status: 'healthy',
      service: 'auto-clicker-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      engine: status,
      emergencyStop: apiServer.EMERGENCY_STOP,
      dryRun: apiServer.DRY_RUN
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Graceful shutdown
async function shutdown() {
  console.log('🔄 Shutting down auto-clicker API');

  // Stop all sessions
  const sessions = Array.from(apiServer.sessions.keys());
  for (const sessionId of sessions) {
    try {
      await engine.stop(sessionId);
    } catch (error) {
      console.error(`❌ Failed to stop session ${sessionId}:`, error);
    }
  }

  server.close(() => {
    console.log('✅ Auto-clicker API server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server with retry logic
const PORT = process.env.AUTO_CLICKER_PORT || 3001;
const HOST = process.env.HOST || 'localhost';
const MAX_RETRIES = 3;

function tryListen(port, attempt = 1) {
  server.listen(port, HOST)
    .on('listening', () => {
      console.log(`🖱️  Auto-Clicker API running on http://${HOST}:${port}`);
      console.log(`📊 Status endpoint: http://${HOST}:${port}/api/auto-clicker/status`);
      console.log(`🔗 WebSocket ready for real-time events`);
      console.log(`🚨 Emergency stop: POST http://${HOST}:${port}/api/emergency-stop`);
      if (apiServer.DRY_RUN) {
        console.log(`⚠️  DRY_RUN MODE - No actual OS events will be sent`);
      }
    })
    .on('error', (error) => {
      if (error.code === 'EADDRINUSE' && attempt < MAX_RETRIES) {
        const nextPort = port + 1;
        console.log(`⚠️  Port ${port} in use, trying ${nextPort}...`);
        setTimeout(() => tryListen(nextPort, attempt + 1), 1000);
      } else {
        console.error(`❌ Failed to start server after ${attempt} attempts:`, error.message);
        process.exit(1);
      }
    });
}

tryListen(PORT);

module.exports = { app, server, io, engine, apiServer };
