ok /**
 * Auto-Clicker API Server
 * Provides endpoints for React UI to control auto-clicking functionality
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

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

// Auto-clicker session state
let sessionState = {
  status: 'idle', // idle, running, paused, stopped
  startTime: null,
  config: null,
  eventCount: 0,
  events: []
};

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected to auto-clicker API');

  // Send current status
  socket.emit('session_status_update', { status: sessionState.status });

  socket.on('disconnect', () => {
    console.log('Client disconnected from auto-clicker API');
  });
});

// Broadcast event to all connected clients
function broadcastEvent(event) {
  sessionState.events.push(event);
  sessionState.eventCount++;

  // Keep only last 100 events
  if (sessionState.events.length > 100) {
    sessionState.events.shift();
  }

  io.emit('auto_clicker_event', event);
}

// Start auto-clicker session
app.post('/api/auto-clicker/start', (req, res) => {
  const { area, ocr, click, refreshRate, targetPattern } = req.body;

  if (sessionState.status === 'running') {
    return res.status(400).json({
      success: false,
      error: 'Session already running'
    });
  }

  sessionState.status = 'running';
  sessionState.startTime = Date.now();
  sessionState.config = { area, ocr, click, refreshRate, targetPattern };
  sessionState.eventCount = 0;
  sessionState.events = [];

  // Broadcast status update
  io.emit('session_status_update', { status: 'running' });

  // Simulate auto-clicker events
  startSimulation();

  res.json({
    success: true,
    message: 'Auto-clicker session started',
    sessionId: `session_${Date.now()}`,
    config: sessionState.config
  });
});

// Stop auto-clicker session
app.post('/api/auto-clicker/stop', (req, res) => {
  if (sessionState.status === 'idle' || sessionState.status === 'stopped') {
    return res.status(400).json({
      success: false,
      error: 'No active session to stop'
    });
  }

  sessionState.status = 'stopped';

  // Broadcast status update
  io.emit('session_status_update', { status: 'stopped' });

  // Stop simulation
  stopSimulation();

  res.json({
    success: true,
    message: 'Auto-clicker session stopped',
    duration: Date.now() - sessionState.startTime,
    eventCount: sessionState.eventCount
  });
});

// Pause auto-clicker session
app.post('/api/auto-clicker/pause', (req, res) => {
  if (sessionState.status !== 'running') {
    return res.status(400).json({
      success: false,
      error: 'No running session to pause'
    });
  }

  sessionState.status = 'paused';

  // Broadcast status update
  io.emit('session_status_update', { status: 'paused' });

  stopSimulation();

  res.json({
    success: true,
    message: 'Auto-clicker session paused'
  });
});

// Resume auto-clicker session
app.post('/api/auto-clicker/resume', (req, res) => {
  if (sessionState.status !== 'paused') {
    return res.status(400).json({
      success: false,
      error: 'No paused session to resume'
    });
  }

  sessionState.status = 'running';

  // Broadcast status update
  io.emit('session_status_update', { status: 'running' });

  startSimulation();

  res.json({
    success: true,
    message: 'Auto-clicker session resumed'
  });
});

// Get session status
app.get('/api/auto-clicker/status', (req, res) => {
  res.json({
    success: true,
    status: sessionState.status,
    startTime: sessionState.startTime,
    duration: sessionState.startTime ? Date.now() - sessionState.startTime : 0,
    eventCount: sessionState.eventCount,
    config: sessionState.config
  });
});

// Get recent events
app.get('/api/auto-clicker/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  res.json({
    success: true,
    events: sessionState.events.slice(-limit)
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auto-clicker-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    sessionStatus: sessionState.status
  });
});

// Simulation logic
let simulationInterval = null;

function startSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }

  const refreshRate = sessionState.config?.refreshRate || 500;

  simulationInterval = setInterval(() => {
    if (sessionState.status !== 'running') {
      stopSimulation();
      return;
    }

    // Simulate random events
    const eventTypes = ['capture', 'ocr', 'condition', 'click'];
    const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    const event = {
      type: randomType,
      timestamp: Date.now(),
      data: generateEventData(randomType)
    };

    broadcastEvent(event);
  }, refreshRate);
}

function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

function generateEventData(type) {
  switch (type) {
    case 'capture':
      return {
        area: sessionState.config?.area || { x: 0, y: 0, width: 800, height: 600 },
        timestamp: Date.now()
      };

    case 'ocr':
      const randomNumber = Math.floor(Math.random() * 100);
      return {
        text: randomNumber.toString(),
        confidence: 0.7 + Math.random() * 0.3,
        number: randomNumber
      };

    case 'condition':
      const number = Math.floor(Math.random() * 100);
      const passed = number > 42;
      return {
        value: number,
        condition: '> 42',
        passed: passed
      };

    case 'click':
      return {
        x: Math.floor(Math.random() * 800),
        y: Math.floor(Math.random() * 600),
        button: sessionState.config?.click?.button || 'left',
        timestamp: Date.now()
      };

    default:
      return {};
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down auto-clicker API');
  stopSimulation();
  server.close(() => {
    console.log('✅ Auto-clicker API server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down auto-clicker API');
  stopSimulation();
  server.close(() => {
    console.log('✅ Auto-clicker API server closed');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.AUTO_CLICKER_PORT || 3001;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
  console.log(`🖱️  Auto-Clicker API running on http://${HOST}:${PORT}`);
  console.log(`📊 Status endpoint: http://${HOST}:${PORT}/api/auto-clicker/status`);
  console.log(`🔗 WebSocket ready for real-time events`);
});

module.exports = { app, server, io };
