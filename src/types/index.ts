// Runtime Hub - Core Type Definitions
// Architect: Scalable type system for production workflows

export interface WorkflowNode {
  id: string;
  type: string;
  config: Record<string, any>;
  position?: { x: number; y: number };
}

export interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
  startTime?: number;
  endTime?: number;
  duration?: number;
  cancelled?: boolean;
  error?: string;
}

export interface Application {
  appId: string;
  name: string;
  socketId: string;
  status: 'active' | 'inactive';
  lastSeen: number;
}

export interface ExecutionData {
  workflowId: string;
  nodeId: string;
  status: string;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface NodeData {
  workflowId: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

export interface PerformanceMetrics {
  totalWorkflows: number;
  successfulWorkflows: number;
  failedWorkflows: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  nodeExecutions: number;
  errorsByType: Map<string, number>;
}

export interface WorkflowConfig {
  workflow: {
    maxConcurrentWorkflows: number;
    maxNodeExecutionTime: number;
    enableDebugLogging: boolean;
  };
  pythonAgent: {
    timeout: number;
    maxRetries: number;
  };
}

export interface PythonAgent {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'error';
  lastActivity: number;
  capabilities: string[];
}

export type NodeExecutor = (
  node: WorkflowNode,
  workflow: Workflow,
  connections: WorkflowConnection[]
) => Promise<any>;

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  timestamp: number;
  services: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected' | 'disabled';
    socketio: 'active' | 'inactive';
  };
}

// Error Types
export class WorkflowError extends Error {
  constructor(
    message: string,
    public workflowId: string,
    public nodeId?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public configPath?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public query?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}
