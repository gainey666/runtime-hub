const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const WorkflowEngine = require('./workflow-engine-wrapper');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const net = require('net');
const PluginLoader = require('./engine/plugin-loader');

// Import configuration and error handling
const { getConfig, isDevelopment } = require('./config');
const {
  handleError,
  asyncErrorHandler,
  ValidationError,
  WorkflowError,
  validateRequired,
  validateType,
  validateObject,
  validateArray,
  generateRequestId
} = require('./utils/errorHandler');

// Get validated configuration
const config = getConfig();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Buffer to store recent logs (last 100)
const logBuffer = [];
const MAX_LOG_BUFFER = 100;

// Intercept io.emit for log_entry to buffer logs
const originalEmit = io.emit.bind(io);
io.emit = function(event, data) {
  if (event === 'log_entry') {
    // Add to buffer
    logBuffer.push({
      event,
      data,
      timestamp: new Date().toISOString()
    });
    // Keep only last MAX_LOG_BUFFER logs
    if (logBuffer.length > MAX_LOG_BUFFER) {
      logBuffer.shift();
    }
  }
  return originalEmit(event, data);
};

// Initialize workflow engine with config
const workflowEngine = new WorkflowEngine(io, config);

// Load plugins on startup (commented out for integration tests)
// workflowEngine.loadPlugins().catch(error => {
//   console.error('Failed to load plugins during startup:', error);
// });

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Request ID middleware
app.use((req, res, next) => {
  req.id = generateRequestId();
  next();
});

// Database setup with config
const dbPath = process.env.NODE_ENV === 'test' ? ':memory:' : config.database.path;
const db = new sqlite3.Database(dbPath);

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

// Python agent connections
const pythonAgents = new Map();

// Single unified Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send buffered logs to new client
  logBuffer.forEach(bufferedLog => {
    socket.emit(bufferedLog.event, bufferedLog.data);
  });

  io.emit('log_entry', {
    source: 'Server',
    level: 'info',
    message: `Client connected: ${socket.id}`
  });

  // Registration - Python agents send { name, type: 'python' }, regular apps send { name }
  socket.on('register_app', (data) => {
    if (data && data.type === 'python') {
      // Python agent registration
      const appId = 'agent_' + uuidv4();
      pythonAgents.set(socket.id, {
        id: appId,
        name: data.name || 'Python Agent',
        socket: socket,
        connectedAt: new Date()
      });
      socket.emit('registered', { appId });
      console.log(`Python agent registered: ${data.name} (${appId})`);
      io.emit('agent_status', {
        type: 'connected',
        agentId: appId,
        agentName: data.name,
        timestamp: new Date().toISOString()
      });
    } else {
      // Regular application registration
      const appId = uuidv4();
      activeApplications.set(socket.id, { appId, ...data });
      db.run('INSERT INTO applications (id, name) VALUES (?, ?)', [appId, data.name]);
      socket.emit('registered', { appId });
      console.log(`Application registered: ${data.name} (${appId})`);
    }
  });

  // Forward Python agent messages to workflow engine
  socket.on('node_execution_update', (data) => {
    io.emit('node_execution_update', data);
  });

  socket.on('function_monitoring_data', (data) => {
    io.emit('function_monitoring_data', data);
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
      parameters,
      returnValue,
      error
    } = data;

    db.run(`INSERT INTO execution_logs
      (id, app_id, event_type, function_name, start_time, duration, parameters, return_value, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [logId, app.appId, type, functionName, timestamp, duration,
       JSON.stringify(parameters), JSON.stringify(returnValue), error]
    );

    io.emit('execution_log', {
      appId: app.appId,
      logId,
      type,
      functionName,
      timestamp,
      duration,
      parameters,
      returnValue,
      error
    });
  });

  // Receive node graph data
  socket.on('node_data', (data) => {
    const app = activeApplications.get(socket.id);
    if (!app) return;

    const { nodes, connections } = data;

    db.run('DELETE FROM connections WHERE app_id = ?', [app.appId]);
    db.run('DELETE FROM nodes WHERE app_id = ?', [app.appId]);

    nodes.forEach(node => {
      db.run(`INSERT INTO nodes (id, app_id, node_type, node_name, position_x, position_y, config)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [node.id, app.appId, node.type, node.name, node.x, node.y, JSON.stringify(node.config || {})]);
    });

    connections.forEach(conn => {
      db.run(`INSERT INTO connections (id, app_id, source_node_id, target_node_id)
        VALUES (?, ?, ?, ?)`,
        [uuidv4(), app.appId, conn.source, conn.target]);
    });

    console.log(`Node graph saved for ${app.name}: ${nodes.length} nodes, ${connections.length} connections`);
  });

  // Receive node updates
  socket.on('node_update', (data) => {
    const app = activeApplications.get(socket.id);
    if (!app) return;

    const {
      type,
      functionName,
      timestamp,
      duration,
      parameters,
      returnValue,
      error
    } = data;

    db.run(`INSERT INTO execution_logs
      (id, app_id, event_type, function_name, start_time, duration, parameters, return_value, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), app.appId, type, functionName, timestamp, duration,
       JSON.stringify(parameters), JSON.stringify(returnValue), error]
    );

    io.emit('node_update', {
      appId: app.appId,
      nodeId: data.nodeId,
      type,
      functionName,
      timestamp,
      duration,
      parameters,
      returnValue,
      error
    });
  });

  // Handle workflow definition
  socket.on('define_workflow', (data) => {
    const app = activeApplications.get(socket.id);
    if (!app) return;

    const { nodes, connections } = data;

    db.run('DELETE FROM connections WHERE app_id = ?', [app.appId]);
    db.run('DELETE FROM nodes WHERE app_id = ?', [app.appId]);

    nodes.forEach(node => {
      db.run(`INSERT INTO nodes (id, app_id, node_type, node_name, position_x, position_y, config)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [node.id, app.appId, node.type, node.name, node.x, node.y, JSON.stringify(node.config || {})]
      );
    });

    connections.forEach(conn => {
      db.run(`INSERT INTO connections (id, app_id, source_node_id, target_node_id)
        VALUES (?, ?, ?, ?)`,
        [uuidv4(), app.appId, conn.source, conn.target]
      );
    });

    io.emit('node_update', {
      appId: app.appId,
      nodes,
      connections
    });
  });

  socket.on('disconnect', () => {
    // Clean up Python agent if registered as one
    const agent = pythonAgents.get(socket.id);
    if (agent) {
      console.log(`Python agent disconnected: ${agent.name} (${agent.id})`);
      io.emit('agent_status', {
        type: 'disconnected',
        agentId: agent.id,
        agentName: agent.name,
        timestamp: new Date().toISOString()
      });
      pythonAgents.delete(socket.id);
    }

    // Clean up regular app if registered as one
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
  db.all('SELECT * FROM execution_logs WHERE app_id = ? ORDER BY rowid DESC LIMIT 100',
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

// ==================== WORKFLOW EXECUTION API ====================

// Export workflow to LLM
app.post('/api/workflows/export-llm', asyncErrorHandler(async (req, res) => {
  const fs = require('fs').promises;
  const { prompt, timestamp, nodeCount, connectionCount } = req.body;

  const logsDir = path.join(__dirname, '..', 'logs');
  await fs.mkdir(logsDir, { recursive: true });

  const filename = `workflow_export_${timestamp}.txt`;
  const filepath = path.join(logsDir, filename);

  await fs.writeFile(filepath, prompt, 'utf8');

  res.json({
    success: true,
    path: filepath,
    filename: filename
  });
}));

// Export logs
app.post('/api/logs/export', asyncErrorHandler(async (req, res) => {
  const fs = require('fs').promises;
  const { logs, timestamp } = req.body;

  const logsDir = path.join(__dirname, '..', 'logs');
  await fs.mkdir(logsDir, { recursive: true });

  const filename = `system_logs_${timestamp}.json`;
  const filepath = path.join(logsDir, filename);

  await fs.writeFile(filepath, JSON.stringify(logs, null, 2), 'utf8');

  res.json({
    success: true,
    path: filepath,
    filename: filename
  });
}));

// Export debug data
app.post('/api/logs/debug', asyncErrorHandler(async (req, res) => {
  const fs = require('fs').promises;
  const { debugData, timestamp } = req.body;

  const logsDir = path.join(__dirname, '..', 'logs');
  await fs.mkdir(logsDir, { recursive: true });

  const filename = `debug_${timestamp}.json`;
  const filepath = path.join(logsDir, filename);

  await fs.writeFile(filepath, JSON.stringify(debugData, null, 2), 'utf8');

  res.json({
    success: true,
    path: filepath,
    filename: filename
  });
}));

// Execute workflow
app.post('/api/workflows/execute', asyncErrorHandler(async (req, res) => {
  console.log('[DEBUG] POST /api/workflows/execute hit, body keys:', Object.keys(req.body || {}));
  
  // Validate request body
  validateRequired(req.body, 'request body');
  validateObject(req.body, 'request body', ['nodes', 'connections']);
  
  const { nodes, connections } = req.body;
  
  // Validate nodes
  validateArray(nodes, 'nodes', 1, config.nodeEditor.maxNodes);
  
  // Validate connections
  validateArray(connections, 'connections', 0, config.nodeEditor.maxConnections);
  
  // Validate node structure
  nodes.forEach((node, index) => {
    validateObject(node, `node[${index}]`, ['id', 'type', 'x', 'y']);
    validateRequired(node.id, `node[${index}].id`);
    validateRequired(node.type, `node[${index}].type`);
    validateType(node.x, 'number', `node[${index}].x`);
    validateType(node.y, 'number', `node[${index}].y`);
  });
  
  // Validate connection structure
  connections.forEach((connection, index) => {
    validateObject(connection, `connection[${index}]`, ['id', 'from', 'to']);
    validateRequired(connection.id, `connection[${index}].id`);
    validateObject(connection.from, `connection[${index}].from`, ['nodeId', 'portIndex']);
    validateObject(connection.to, `connection[${index}].to`, ['nodeId', 'portIndex']);
  });
  
  // Use client-provided ID if present (avoids socket event race conditions)
  const workflowId = req.body.workflowId || `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`🚀 Starting workflow execution: ${workflowId}`);
  
  // Execute workflow in background with timeout
  try {
    const executePromise = workflowEngine.executeWorkflow(workflowId, nodes, connections);
    
    // Handle case where executeWorkflow doesn't return a promise
    if (executePromise && typeof executePromise.then === 'function') {
      executePromise
        .then(result => {
          console.log(`✅ Workflow completed: ${workflowId}`);
        })
        .catch(error => {
          console.error(`❌ Workflow failed: ${workflowId} - ${error.message}`);
        });
    } else {
      console.log(`🚀 Workflow execution started: ${workflowId}`);
    }
  } catch (error) {
    console.error('Execute error:', error);
    throw error;
  }
  
  res.json({ 
    success: true, 
    workflowId: workflowId,
    message: 'Workflow execution started'
  });
}));

// Stop workflow
app.post('/api/workflows/:workflowId/stop', (req, res) => {
  try {
    const { workflowId } = req.params;
    const success = workflowEngine.stopWorkflow(workflowId);
    
    res.json({ 
      success: success,
      workflowId: workflowId,
      message: success ? 'Workflow stopped' : 'Workflow not found'
    });
    
  } catch (error) {
    console.error('Failed to stop workflow:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get workflow status
app.get('/api/workflows/:workflowId/status', (req, res) => {
  try {
    const { workflowId } = req.params;
    const workflow = workflowEngine.runningWorkflows.get(workflowId);
    
    if (workflow) {
      // Get completed nodes and failed node information
      const completedNodes = [];
      let failedNode = null;
      let error = workflow.error;
      
      for (const [nodeId, nodeState] of workflow.executionState.entries()) {
        if (nodeState.status === 'completed') {
          completedNodes.push(nodeId);
        } else if (nodeState.status === 'error' && !failedNode) {
          failedNode = nodeId;
          error = nodeState.error;
        }
      }
      
      const response = {
        success: true,
        workflow: {
          id: workflow.id,
          status: workflow.status,
          startTime: workflow.startTime,
          endTime: workflow.endTime,
          duration: workflow.duration,
          executionState: Object.fromEntries(workflow.executionState),
          error: error,
          failedNode: failedNode,
          completedNodes: completedNodes
        }
      };
      
      // If workflow failed, include the enhanced error information
      if (workflow.status === 'failed' || workflow.status === 'error') {
        response.workflow.status = 'failed';
        response.workflow.failedNode = failedNode;
        response.workflow.error = error;
        response.workflow.completedNodes = completedNodes;
      }
      
      res.json(response);
    } else {
      res.json({
        success: false,
        message: 'Workflow not found or completed'
      });
    }
    
  } catch (error) {
    console.error('Failed to get workflow status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete workflow history
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

// Get workflow history
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

// Get all running workflows
app.get('/api/workflows', (req, res) => {
  try {
    const workflows = Array.from(workflowEngine.runningWorkflows.values()).map(workflow => ({
      id: workflow.id,
      status: workflow.status,
      startTime: workflow.startTime,
      endTime: workflow.endTime,
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

// Node library endpoint
app.get('/api/node-library', (req, res) => {
  try {
    // Create a simple node library structure without browser dependencies
    const baseNodes = [
      // Control Flow nodes
      { category: 'Control Flow', name: 'Start', icon: '🚀', color: '#00ff88', description: 'Entry point of the workflow', inputs: [], outputs: ['main'] },
      { category: 'Control Flow', name: 'End', icon: '🏁', color: '#ff4444', description: 'End point of the workflow', inputs: ['main'], outputs: [] },
      { category: 'Control Flow', name: 'Condition', icon: '🔀', color: '#ffaa00', description: 'Conditional branching based on input', inputs: ['condition', 'true_path', 'false_path'], outputs: ['true', 'false'] },
      
      // Plugin nodes (manually added for now)
      { category: 'Utility', name: 'Logger', icon: '📝', color: '#00bfff', description: 'Logs workflow data with timestamps and configurable levels', inputs: ['data'], outputs: ['output'], plugin: 'logger-plugin' },
      { category: 'Utility', name: 'Data Transform', icon: '�', color: '#00bfff', description: 'Transforms string and number data with various operations', inputs: ['input'], outputs: ['output'], plugin: 'data-transform-plugin' },
      
      // Add more base nodes as needed...
    ];
    
    res.json({
      success: true,
      nodes: baseNodes,
      plugins: ['logger-plugin', 'data-transform-plugin'],
      totalNodes: baseNodes.length
    });
    
  } catch (error) {
    console.error('Failed to get node library:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', asyncErrorHandler(async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.isDevelopment ? 'development' : config.isProduction ? 'production' : 'test',
    services: {
      database: 'connected',
      workflowEngine: workflowEngine.runningWorkflows.size < config.workflow.maxConcurrentWorkflows ? 'healthy' : 'overloaded',
      pythonAgents: 'unknown' // Will be updated when pythonAgents is defined
    },
    metrics: {
      runningWorkflows: workflowEngine.runningWorkflows.size,
      maxConcurrentWorkflows: config.workflow.maxConcurrentWorkflows
    }
  };
  
  res.json(health);
}));

// Global error handler
app.use(handleError);

// Setup workflow event listeners for dashboard
workflowEngine.on('workflowStarted', (workflowId) => {
  io.emit('execution_update', {
    type: 'workflow_started',
    workflowId: workflowId,
    timestamp: new Date().toISOString()
  });
});

workflowEngine.on('workflowCompleted', (workflowId) => {
  io.emit('execution_update', {
    type: 'workflow_completed',
    workflowId: workflowId,
    timestamp: new Date().toISOString()
  });
});

workflowEngine.on('nodeStarted', (data) => {
  io.emit('node_update', {
    type: 'node_started',
    nodeId: data.nodeId,
    workflowId: data.workflowId,
    timestamp: new Date().toISOString()
  });
});

workflowEngine.on('nodeCompleted', (data) => {
  io.emit('node_update', {
    type: 'node_completed',
    nodeId: data.nodeId,
    workflowId: data.workflowId,
    timestamp: new Date().toISOString()
  });
});

// Port availability check
function checkPortInUse(port, host) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer()
      .once('error', err => {
        if (err.code === 'EADDRINUSE') {
          resolve(true); // Port in use
        } else {
          reject(err);
        }
      })
      .once('listening', () => {
        tester.close();
        resolve(false); // Port free
      })
      .listen(port, host);
  });
}

// Start server with port check (only when run directly, not when required by tests)
if (require.main === module) {
  checkPortInUse(config.server.port, config.server.host).then(inUse => {
  if (inUse) {
    const errorMsg = `❌ FATAL: Port ${config.server.port} already in use. Kill existing Runtime Hub process and restart.`;
    console.error(errorMsg);
    handleError(new Error(errorMsg), {
      level: 'error',
      message: errorMsg,
      code: 'EADDRINUSE'
    });
    process.exit(1);
  }

  // Initialize plugin loader
  const pluginLoader = new PluginLoader();
  pluginLoader.loadPlugins().then(() => {
    console.log('🔌 Plugin loading complete');
  }).catch(error => {
    console.error('❌ Plugin loading failed:', error);
  });

  server.listen(config.server.port, config.server.host, () => {
    console.log(`🚀 Runtime Logger server running on ${config.server.host}:${config.server.port}`);
    console.log(`📊 Environment: ${config.env}`);
    console.log(`🔗 Node Editor: http://${config.server.host}:${config.server.port}/node-editor`);
    console.log(`📈 Dashboard: http://${config.server.host}:${config.server.port}/`);

    // Emit startup logs to all connected clients
    io.emit('log_entry', {
      source: 'Server',
      level: 'success',
      message: `Runtime Hub server started on port ${config.server.port}`
    });

    server.setMaxListeners(20);

    io.emit('log_entry', {
      source: 'Server',
      level: 'info',
      message: `Environment: ${config.isDevelopment ? 'Development' : config.isProduction ? 'Production' : 'Test'}`
    });

    if (config.isDevelopment) {
      console.log(`🐛 Debug logging enabled`);
    }
  });

  // Signal handlers ONLY when running directly
  process.once('SIGTERM', () => {
    console.log('🔄 SIGTERM received, shutting down gracefully');
    io.close(() => {
      server.close(() => {
        db.close((err) => {
          process.exit(err ? 1 : 0);
        });
      });
    });
  });

  process.once('SIGINT', () => {
    console.log('🔄 SIGINT received, shutting down gracefully');
    io.close(() => {
      server.close(() => {
        db.close((err) => {
          process.exit(err ? 1 : 0);
        });
      });
    });
  });
}).catch(err => {
  console.error(`❌ Failed to check port availability:`, err);
  process.exit(1);
});
} // End of require.main === module check

// Export server instance for integration tests
module.exports = { app, server, io };
