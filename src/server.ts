/**
 * Runtime Hub Server
 * Express server with Socket.IO for real-time communication
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

interface Application {
  appId: string;
  name: string;
  socketId: string;
}

interface PythonAgent {
  id: string;
  name: string;
  socketId: string;
  status: 'connected' | 'disconnected';
}

interface ExecutionData {
  functionName: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  parameters?: any[];
  errorMessage?: string;
  returnValue?: any;
  type?: string;
  timestamp?: number;
  error?: string;
}

interface NodeData {
  nodes: Array<{
    id: string;
    type: string;
    name: string;
    x: number;
    y: number;
    config: Record<string, any>;
  }>;
  connections: Array<{
    source: string;
    target: string;
  }>;
}

class RuntimeHubServer {
  private app: express.Application;
  private server: any;
  private io!: SocketIOServer;
  private db!: sqlite3.Database;
  private activeApplications: Map<string, Application>;
  private pythonAgents: Map<string, PythonAgent>;
  private redisClient: any;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.activeApplications = new Map();
    this.pythonAgents = new Map();
    
    this.setupDatabase();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
  }

  private setupDatabase(): void {
    this.db = new sqlite3.Database('./runtime_monitor.db');
    
    this.db.serialize(() => {
      // Create tables if they don't exist
      this.db.run(`
        CREATE TABLE IF NOT EXISTS applications (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS nodes (
          id TEXT PRIMARY KEY,
          app_id TEXT NOT NULL,
          type TEXT NOT NULL,
          name TEXT NOT NULL,
          x REAL NOT NULL,
          y REAL NOT NULL,
          config TEXT,
          FOREIGN KEY (app_id) REFERENCES applications (id)
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS connections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          app_id TEXT NOT NULL,
          source_id TEXT NOT NULL,
          target_id TEXT NOT NULL,
          FOREIGN KEY (app_id) REFERENCES applications (id)
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS execution_logs (
          id TEXT PRIMARY KEY,
          app_id TEXT NOT NULL,
          function_name TEXT NOT NULL,
          start_time INTEGER NOT NULL,
          end_time INTEGER NOT NULL,
          duration INTEGER NOT NULL,
          success BOOLEAN NOT NULL,
          parameters TEXT,
          return_value TEXT,
          error_message TEXT,
          type TEXT,
          timestamp INTEGER NOT NULL,
          FOREIGN KEY (app_id) REFERENCES applications (id)
        )
      `);
    });
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: express.Request, res: express.Response) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        activeApplications: this.activeApplications.size,
        pythonAgents: this.pythonAgents.size
      });
    });

    // Get all applications
    this.app.get('/api/applications', (_req: express.Request, res: express.Response) => {
      const applications = Array.from(this.activeApplications.values());
      res.json(applications);
    });

    // Get application by ID
    this.app.get('/api/applications/:id', (req: express.Request, res: express.Response) => {
      const { id } = req.params;
      const app = Array.from(this.activeApplications.values()).find(app => app.appId === id);
      
      if (!app) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      return res.json(app);
    });

    // Get execution logs for an application
    this.app.get('/api/applications/:id/logs', (req: express.Request, res: express.Response) => {
      const { id } = req.params;
      const { limit = 100, offset = 0 } = req.query;
      
      this.db.all(
        'SELECT * FROM execution_logs WHERE app_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [id, limit, offset],
        (err: Error | null, rows: any[]) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          return res.json(rows);
        }
      );
    });

    // Get nodes for an application
    this.app.get('/api/applications/:id/nodes', (req: express.Request, res: express.Response) => {
      const { id } = req.params;
      
      this.db.all(
        'SELECT * FROM nodes WHERE app_id = ?',
        [id],
        (err: Error | null, nodes: any[]) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Parse config JSON
          const parsedNodes = nodes.map(node => ({
            ...node,
            config: node.config ? JSON.parse(node.config) : {}
          }));
          
          return res.json(parsedNodes);
        }
      );
    });

    // Get connections for an application
    this.app.get('/api/applications/:id/connections', (req: express.Request, res: express.Response) => {
      const { id } = req.params;
      
      this.db.all(
        'SELECT * FROM connections WHERE app_id = ?',
        [id],
        (err: Error | null, connections: any[]) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          return res.json(connections);
        }
      );
    });
  }

  private async setupSocketIO(): Promise<void> {
    // Setup Redis adapter for scaling
    try {
      const pubClient = createClient();
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      
      const redisAdapter = createAdapter(pubClient, subClient);
      this.redisClient = pubClient;
      this.io = new SocketIOServer(this.server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        },
        adapter: redisAdapter
      });
    } catch (error) {
      console.warn('Redis not available, using default adapter:', error);
      this.io = new SocketIOServer(this.server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });
    }

    this.io.on('connection', (socket: any) => {
      console.log('Client connected:', socket.id);
      
      // Handle Python agent registration
      socket.on('register_app', (data: { name: string }) => {
        console.log('Python agent registering:', data);
        const appId = 'agent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const agent: PythonAgent = {
          id: appId,
          name: data.name,
          socketId: socket.id,
          status: 'connected'
        };
        
        this.pythonAgents.set(socket.id, agent);
        
        socket.emit('registered', { appId });
        socket.broadcast.emit('agent_connected', agent);
        
        console.log(`Python agent registered: ${agent.name} (${agent.id})`);
      });
      
      // Handle Python agent disconnection
      socket.on('disconnect', () => {
        const agent = this.pythonAgents.get(socket.id);
        if (agent) {
          console.log(`Python agent disconnected: ${agent.name} (${agent.id})`);
          agent.status = 'disconnected';
          this.pythonAgents.delete(socket.id);
          socket.broadcast.emit('agent_disconnected', agent);
        }
      });
      
      // Forward Python agent messages to workflow engine
      socket.on('node_execution_update', (data: any) => {
        // Forward to any listening workflow engine
        this.io.emit('node_execution_update', data);
      });
      
      socket.on('function_monitoring_data', (data: any) => {
        // Forward to any listening workflow engine
        this.io.emit('function_monitoring_data', data);
      });
    });

    // Handle application clients (separate namespace)
    const appNamespace = this.io.of('/app');
    
    appNamespace.on('connection', (socket: any) => {
      console.log('Application client connected:', socket.id);

      // Register new application
      socket.on('register_app', (data: { name: string }) => {
        const appId = uuidv4();
        const app: Application = {
          appId,
          name: data.name,
          socketId: socket.id
        };
        
        this.activeApplications.set(socket.id, app);
        
        // Save to database
        this.db.run('INSERT INTO applications (id, name) VALUES (?, ?)', [appId, data.name]);
        
        socket.emit('registered', { appId });
        console.log(`Application registered: ${data.name} (${appId})`);
      });

      // Receive execution data
      socket.on('execution_data', (data: ExecutionData) => {
        const app = this.activeApplications.get(socket.id);
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

        this.db.run(`
          INSERT INTO execution_logs (
            id, app_id, function_name, start_time, end_time, duration, 
            success, parameters, return_value, error, type, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          logId,
          app.appId,
          functionName,
          timestamp || Date.now() - duration,
          timestamp || Date.now(),
          duration,
          error ? 0 : 1,
          parameters ? JSON.stringify(parameters) : null,
          returnValue ? JSON.stringify(returnValue) : null,
          error || null,
          type || 'function',
          timestamp || Date.now()
        ]);

        // Broadcast to connected clients
        appNamespace.emit('execution_update', {
          appId: app.appId,
          functionName,
          duration,
          success: !error,
          error,
          timestamp: timestamp || Date.now()
        });
      });

      // Receive node updates
      socket.on('node_update', (data: any) => {
        const app = this.activeApplications.get(socket.id);
        if (!app) return;

        const nodeId = data.nodeId;
        const { 
          type, 
          functionName, 
          timestamp, 
          duration, 
          parameters, 
          returnValue, 
          error 
        } = data;

        this.db.run(`
          INSERT INTO execution_logs (
            id, app_id, function_name, start_time, end_time, duration, 
            success, parameters, return_value, error, type, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          uuidv4(),
          app.appId,
          functionName || nodeId,
          timestamp || Date.now() - (duration || 0),
          timestamp || Date.now(),
          duration || 0,
          error ? 0 : 1,
          parameters ? JSON.stringify(parameters) : null,
          returnValue ? JSON.stringify(returnValue) : null,
          error || null,
          type || 'node',
          timestamp || Date.now()
        ]);

        // Broadcast to connected clients
        appNamespace.emit('node_update', {
          appId: app.appId,
          nodeId,
          type,
          functionName,
          duration,
          success: !error,
          error,
          timestamp: timestamp || Date.now()
        });
      });

      // Handle workflow definition
      socket.on('define_workflow', (data: NodeData) => {
        const app = this.activeApplications.get(socket.id);
        if (!app) return;

        const { nodes, connections } = data;
        
        // Clear existing data
        this.db.run('DELETE FROM connections WHERE app_id = ?', [app.appId]);
        this.db.run('DELETE FROM nodes WHERE app_id = ?', [app.appId]);

        // Save nodes
        nodes.forEach(node => {
          this.db.run(`
            INSERT INTO nodes (id, app_id, type, name, x, y, config)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            node.id, 
            app.appId, 
            node.type, 
            node.name, 
            node.x, 
            node.y, 
            JSON.stringify(node.config || {})
          ]);
        });

        // Save connections
        connections.forEach(conn => {
          this.db.run(`
            INSERT INTO connections (app_id, source_id, target_id)
            VALUES (?, ?, ?)
          `, [app.appId, conn.source, conn.target]);
        });

        console.log(`Workflow saved for ${app.name}: ${nodes.length} nodes, ${connections.length} connections`);
      });

      socket.on('disconnect', () => {
        const app = this.activeApplications.get(socket.id);
        if (app) {
          console.log(`Application disconnected: ${app.name} (${app.appId})`);
          this.activeApplications.delete(socket.id);
        }
      });
    });
  }

  public start(port: number = 3000): void {
    this.server.listen(port, () => {
      console.log(`Runtime Hub server running on port ${port}`);
      console.log('Socket.IO server ready for connections');
    });
  }

  public stop(): void {
    this.server.close(() => {
      console.log('Runtime Hub server stopped');
      this.db.close();
      if (this.redisClient) {
        this.redisClient.quit();
      }
    });
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new RuntimeHubServer();
  const port = parseInt(process.env.PORT || '3000', 10);
  server.start(port);
}

export default RuntimeHubServer;
