const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Database setup
const db = new sqlite3.Database('./runtime_monitor.db');

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS execution_logs (
    id TEXT PRIMARY KEY,
    app_id TEXT,
    function_name TEXT,
    start_time DATETIME,
    end_time DATETIME,
    duration INTEGER,
    success BOOLEAN,
    parameters TEXT,
    error_message TEXT,
    return_value TEXT,
    call_id TEXT,
    event_type TEXT,
    FOREIGN KEY (app_id) REFERENCES applications (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    app_id TEXT,
    node_type TEXT,
    node_name TEXT,
    position_x INTEGER,
    position_y INTEGER,
    config TEXT,
    FOREIGN KEY (app_id) REFERENCES applications (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    app_id TEXT,
    source_node_id TEXT,
    target_node_id TEXT,
    FOREIGN KEY (app_id) REFERENCES applications (id)
  )`);
});

// Store active connections
const activeApplications = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Register new application
  socket.on('register_app', (data) => {
    const appId = uuidv4();
    activeApplications.set(socket.id, { appId, ...data });
    
    // Save to database
    db.run('INSERT INTO applications (id, name) VALUES (?, ?)', [appId, data.name]);
    
    socket.emit('registered', { appId });
    console.log(`Application registered: ${data.name} (${appId})`);
  });

  // Receive execution data
  socket.on('execution_data', (data) => {
    const app = activeApplications.get(socket.id);
    if (!app) return;

    const logId = uuidv4();
    const { 
      type, 
      functionName, 
      timestamp, 
      duration, 
      success, 
      parameters, 
      returnValue, 
      error, 
      stackTrace,
      callId 
    } = data;

    // Save to database
    db.run(`INSERT INTO execution_logs 
      (id, app_id, function_name, start_time, end_time, duration, success, parameters, error_message, return_value, call_id, event_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId, 
        app.appId, 
        functionName, 
        type === 'call_enter' ? timestamp : null,
        type === 'call_exit' ? timestamp : null,
        duration || null,
        success !== undefined ? success : null,
        JSON.stringify(parameters || {}),
        error || null,
        JSON.stringify(returnValue || {}),
        callId || null,
        type
      ]
    );

    // Broadcast to dashboard
    io.emit('execution_update', {
      appId: app.appId,
      appName: app.name,
      functionName,
      duration,
      success,
      timestamp,
      type,
      parameters,
      returnValue,
      error,
      callId
    });
  });

  // Receive node data
  socket.on('node_data', (data) => {
    const app = activeApplications.get(socket.id);
    if (!app) return;

    const { nodes, connections } = data;

    // Clear existing nodes/connections for this app
    db.run('DELETE FROM nodes WHERE app_id = ?', [app.appId]);
    db.run('DELETE FROM connections WHERE app_id = ?', [app.appId]);

    // Save new nodes
    nodes.forEach(node => {
      db.run(`INSERT INTO nodes (id, app_id, node_type, node_name, position_x, position_y, config)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [node.id, app.appId, node.type, node.name, node.x, node.y, JSON.stringify(node.config)]
      );
    });

    // Save connections
    connections.forEach(conn => {
      db.run(`INSERT INTO connections (id, app_id, source_node_id, target_node_id)
        VALUES (?, ?, ?, ?)`,
        [uuidv4(), app.appId, conn.source, conn.target]
      );
    });

    // Broadcast to dashboard
    io.emit('node_update', {
      appId: app.appId,
      nodes,
      connections
    });
  });

  socket.on('disconnect', () => {
    const app = activeApplications.get(socket.id);
    if (app) {
      console.log(`Application disconnected: ${app.name}`);
      activeApplications.delete(socket.id);
    }
  });
});

// REST API endpoints
app.get('/api/applications', (req, res) => {
  db.all('SELECT * FROM applications ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/applications/:appId/logs', (req, res) => {
  const { appId } = req.params;
  db.all('SELECT * FROM execution_logs WHERE app_id = ? ORDER BY start_time DESC LIMIT 100', 
    [appId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/applications/:appId/nodes', (req, res) => {
  const { appId } = req.params;
  
  db.all('SELECT * FROM nodes WHERE app_id = ?', [appId], (err, nodes) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    db.all('SELECT * FROM connections WHERE app_id = ?', [appId], (err, connections) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({ nodes, connections });
    });
  });
});

// Serve the dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'enhanced-dashboard.html'));
});

// Serve the node editor
app.get('/node-editor', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'node-editor.html'));
});

server.listen(PORT, () => {
  console.log(`Visual Runtime Monitor server running on port ${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}`);
});
