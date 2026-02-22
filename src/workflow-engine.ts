/**
 * Runtime Hub - Workflow Execution Engine
 * Handles execution of visual workflows with node-based processing
 */

import { EventEmitter } from 'events';

interface WorkflowConfig {
  workflow: {
    maxConcurrentWorkflows: number;
    defaultTimeout: number;
    maxNodeExecutionTime: number;
    enableDebugLogging: boolean;
  };
  pythonAgent: {
    timeout: number;
    maxRetries: number;
  };
}

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  config?: Record<string, any>;
  x?: number;
  y?: number;
}

interface WorkflowConnection {
  source: string;
  target: string;
}

interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  status: 'pending' | 'running' | 'completed' | 'error' | 'stopped';
  startTime: number;
  endTime: number | undefined;
  duration: number | undefined;
  error: string | undefined;
  cancelled: boolean;
}

interface PerformanceMetrics {
  totalWorkflows: number;
  successfulWorkflows: number;
  failedWorkflows: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  nodeExecutions: number;
  errorsByType: Map<string, number>;
}

interface NodeExecutor {
  (node: WorkflowNode, workflow: Workflow, connections: WorkflowConnection[]): Promise<any>;
}

class WorkflowEngine extends EventEmitter {
  private io: any;
  private config: WorkflowConfig;
  private runningWorkflows: Map<string, Workflow>;
  private nodeExecutors: Map<string, NodeExecutor>;
  private executionQueue: Workflow[];
  private isProcessing: boolean;
  private performanceMetrics: PerformanceMetrics;
  private workflowHistory: Array<Workflow & { nodeCount: number; error: string | undefined }>;
  private maxHistorySize: number;

  constructor(io: any, config: WorkflowConfig | null = null) {
    super();
    this.io = io;
    this.config = config || {
      workflow: {
        maxConcurrentWorkflows: 5,
        defaultTimeout: 60000,
        maxNodeExecutionTime: 30000,
        enableDebugLogging: true
      },
      pythonAgent: {
        timeout: 30000,
        maxRetries: 3
      }
    };
    this.runningWorkflows = new Map();
    this.nodeExecutors = new Map();
    this.executionQueue = [];
    this.isProcessing = false;
    
    // Performance metrics
    this.performanceMetrics = {
      totalWorkflows: 0,
      successfulWorkflows: 0,
      failedWorkflows: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      nodeExecutions: 0,
      errorsByType: new Map()
    };
    
    // Workflow history for analytics
    this.workflowHistory = [];
    this.maxHistorySize = 1000;
    
    // Initialize node executors
    this.initializeNodeExecutors();
  }

  private initializeNodeExecutors(): void {
    this.nodeExecutors.set('Start', this.executeStart.bind(this));
    this.nodeExecutors.set('End', this.executeEnd.bind(this));
    this.nodeExecutors.set('Process', this.executeProcess.bind(this));
    this.nodeExecutors.set('Decision', this.executeDecision.bind(this));
    this.nodeExecutors.set('Delay', this.executeDelay.bind(this));
    this.nodeExecutors.set('Python', this.executePython.bind(this));
    this.nodeExecutors.set('Wait', this.executeDelay.bind(this));
    this.nodeExecutors.set('Monitor', this.executeMonitor.bind(this));
    this.nodeExecutors.set('API', this.executeAPI.bind(this));
    this.nodeExecutors.set('Database', this.executeDatabase.bind(this));
    this.nodeExecutors.set('Transform', this.executeTransform.bind(this));
    this.nodeExecutors.set('Filter', this.executeFilter.bind(this));
    this.nodeExecutors.set('Loop', this.executeLoop.bind(this));
    this.nodeExecutors.set('Function', this.executeFunction.bind(this));
    this.nodeExecutors.set('Webhook', this.executeWebhook.bind(this));
    this.nodeExecutors.set('Email', this.executeEmail.bind(this));
    this.nodeExecutors.set('File', this.executeFile.bind(this));
    this.nodeExecutors.set('Log', this.executeLog.bind(this));
    this.nodeExecutors.set('Error', this.executeError.bind(this));
    this.nodeExecutors.set('MonitorFunction', this.executeMonitorFunction.bind(this));
  }

  async executeWorkflow(workflowData: Omit<Workflow, 'status' | 'endTime' | 'duration'>): Promise<string> {
    const workflow: Workflow = {
      ...workflowData,
      status: 'pending',
      startTime: Date.now(),
      endTime: undefined,
      duration: undefined,
      cancelled: false
    };

    // Check concurrent workflow limit
    if (this.runningWorkflows.size >= this.config.workflow.maxConcurrentWorkflows) {
      this.executionQueue.push(workflow);
      this.emit('workflowQueued', workflow);
      return workflow.id;
    }

    return this.startWorkflow(workflow);
  }

  private async startWorkflow(workflow: Workflow): Promise<string> {
    this.runningWorkflows.set(workflow.id, workflow);
    this.performanceMetrics.totalWorkflows++;
    
    this.emit('workflowStarted', workflow);
    this.broadcastWorkflowUpdate(workflow.id, 'running', workflow);

    try {
      workflow.status = 'running';
      
      // Execute all nodes in sequence
      for (const node of workflow.nodes) {
        if (workflow.cancelled) {
          throw new Error('Workflow cancelled');
        }
        
        await this.executeNode(node, workflow);
      }
      
      // Mark as completed
      workflow.status = 'completed';
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - workflow.startTime;
      
      this.performanceMetrics.successfulWorkflows++;
      this.updateMetrics(workflow);
      this.addToHistory(workflow);
      
      this.emit('workflowCompleted', workflow);
      this.broadcastWorkflowUpdate(workflow.id, 'completed', workflow);
      
      return workflow.id;
    } catch (error) {
      workflow.status = 'error';
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - workflow.startTime;
      workflow.error = error instanceof Error ? error.message : String(error);
      
      this.performanceMetrics.failedWorkflows++;
      this.updateMetrics(workflow);
      this.addToHistory(workflow);
      
      this.emit('workflowError', workflow, error);
      this.broadcastWorkflowUpdate(workflow.id, 'error', workflow);
      
      throw error;
    } finally {
      this.runningWorkflows.delete(workflow.id);
      this.processQueue();
    }
  }

  private async executeNode(node: WorkflowNode, workflow: Workflow): Promise<void> {
    // Instant kill switch for workflow cancellation
    if (workflow.cancelled) {
      throw new Error('Workflow cancelled');
    }

    const startTime = Date.now();
    this.performanceMetrics.nodeExecutions++;
    
    this.emit('nodeStarted', workflow.id, node);
    this.broadcastNodeUpdate(workflow.id, node.id, 'started', node);

    try {
      const executor = this.nodeExecutors.get(node.type);
      if (!executor) {
        throw new Error(`Unknown node type: ${node.type}`);
      }

      const connections = workflow.connections.filter(
        conn => conn.source === node.id || conn.target === node.id
      );

      await executor(node, workflow, connections);
      
      this.emit('nodeCompleted', workflow.id, node);
      this.broadcastNodeUpdate(workflow.id, node.id, 'completed', node);
      
    } catch (error) {
      this.emit('nodeError', workflow.id, node, error);
      this.broadcastNodeUpdate(workflow.id, node.id, 'error', node, error);
      throw error;
    } finally {
      const executionTime = Date.now() - startTime;
      this.emit('nodeExecutionTime', workflow.id, node, executionTime);
    }
  }

  private async executeStart(_node: WorkflowNode, workflow: Workflow): Promise<any> {
    if (this.config.workflow.enableDebugLogging) {
      console.log(`[${workflow.id}] Starting workflow: ${workflow.name}`);
    }
    return { completed: true };
  }

  private async executeEnd(_node: WorkflowNode, workflow: Workflow): Promise<any> {
    if (this.config.workflow.enableDebugLogging) {
      console.log(`[${workflow.id}] Ending workflow: ${workflow.name}`);
    }
    return { completed: true };
  }

  private async executeProcess(_node: WorkflowNode, _workflow: Workflow): Promise<any> {
    const { process } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const command = _node.config?.command || 'echo "No command specified"';
      
      const child = process.spawn(command, {
        shell: true,
        stdio: 'pipe',
        timeout: this.config.workflow.maxNodeExecutionTime
      });

      let output = '';
      child.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve({ output, exitCode: code });
        } else {
          reject(new Error(`Process exited with code ${code}: ${output}`));
        }
      });

      child.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  private async executeDecision(node: WorkflowNode, workflow: Workflow): Promise<any> {
    const condition = node.config?.condition;
    if (!condition) {
      throw new Error('Decision node requires a condition');
    }

    // Simple condition evaluation (in production, use a proper expression parser)
    const result = this.evaluateCondition(condition, workflow);
    
    return { 
      result,
      path: result ? 'true' : 'false'
    };
  }

  private evaluateCondition(condition: string, _workflow: Workflow): boolean {
    // This is a simplified implementation
    // In production, use a proper expression parser like expr-eval
    try {
      // Very basic evaluation - replace with proper parser
      return condition.includes('true') || !condition.includes('false');
    } catch {
      return false;
    }
  }

  private async executeDelay(_node: WorkflowNode, _workflow: Workflow): Promise<any> {
    const { cancellableDelay } = require('./utils/cancellableDelay');
    const delay = _node.config?.delay || 1000;
    
    await cancellableDelay(delay);
    
    return { completed: true, delay };
  }

  private async executePython(_node: WorkflowNode, _workflow: Workflow): Promise<any> {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const script = _node.config?.script;
      if (!script) {
        reject(new Error('Python node requires a script'));
        return;
      }

      const python = spawn('python', [script], {
        stdio: 'pipe',
        timeout: this.config.pythonAgent.timeout
      });

      let output = '';
      python.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      python.stderr?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      python.on('close', (code: number | null) => {
        if (code === 0) {
          resolve({ output, exitCode: code });
        } else {
          reject(new Error(`Python script exited with code ${code}: ${output}`));
        }
      });

      python.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  private async executeMonitor(node: WorkflowNode, workflow: Workflow): Promise<any> {
    const metrics = {
      workflowId: workflow.id,
      nodeId: node.id,
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };

    this.emit('monitoringData', metrics);
    this.broadcastNodeUpdate(workflow.id, node.id, 'monitoring', node, metrics);

    return { completed: true, metrics };
  }

  private async executeAPI(_node: WorkflowNode, _workflow: Workflow): Promise<any> {
    // Placeholder for API execution
    const url = _node.config?.url;
    const method = _node.config?.method || 'GET';
    
    if (!url) {
      throw new Error('API node requires a URL');
    }

    // In production, use axios or fetch
    return { 
      completed: true,
      url,
      method,
      timestamp: Date.now()
    };
  }

  private async executeDatabase(_node: WorkflowNode, _workflow: Workflow): Promise<any> {
    // Placeholder for database operations
    const operation = _node.config?.operation || 'select';
    const table = _node.config?.table;
    
    if (!table) {
      throw new Error('Database node requires a table');
    }

    return { 
      completed: true,
      operation,
      table,
      timestamp: Date.now()
    };
  }

  private async executeTransform(_node: WorkflowNode, _workflow: Workflow): Promise<any> {
    // Placeholder for data transformation
    const transform = _node.config?.transform;
    
    return { 
      completed: true,
      transform,
      timestamp: Date.now()
    };
  }

  private async executeFilter(_node: WorkflowNode, _workflow: Workflow): Promise<any> {
    // Placeholder for data filtering
    const filter = _node.config?.filter;
    
    return { 
      completed: true,
      filter,
      timestamp: Date.now()
    };
  }

  private async executeLoop(_node: WorkflowNode, _workflow: Workflow): Promise<any> {
    // Placeholder for loop execution
    const iterations = _node.config?.iterations || 1;
    
    return { 
      completed: true,
      iterations,
      timestamp: Date.now()
    };
  }

  private async executeFunction(_node: WorkflowNode, _workflow: Workflow): Promise<any> {
    // Placeholder for function execution
    const functionName = _node.config?.function;
    
    return { 
      completed: true,
      functionName,
      timestamp: Date.now()
    };
  }

  private async executeWebhook(_node: WorkflowNode, _workflow: Workflow): Promise<any> {
    // Placeholder for webhook execution
    const url = _node.config?.url;
    
    if (!url) {
      throw new Error('Webhook node requires a URL');
    }

    return { 
      completed: true,
      url,
      timestamp: Date.now()
    };
  }

  private async executeEmail(_node: WorkflowNode, _workflow: Workflow): Promise<any> {
    // Placeholder for email sending
    const to = _node.config?.to;
    const subject = _node.config?.subject;
    
    if (!to || !subject) {
      throw new Error('Email node requires recipient and subject');
    }

    return { 
      completed: true,
      to,
      subject,
      timestamp: Date.now()
    };
  }

  private async executeFile(_node: WorkflowNode, _workflow: Workflow): Promise<any> {
    // Placeholder for file operations
    const operation = _node.config?.operation || 'read';
    const path = _node.config?.path;
    
    return { 
      completed: true,
      operation,
      path,
      timestamp: Date.now()
    };
  }

  private async executeLog(node: WorkflowNode, workflow: Workflow): Promise<any> {
    const message = node.config?.message || 'Log message';
    const level = node.config?.level || 'info';
    
    console.log(`[${workflow.id}][${level.toUpperCase()}] ${message}`);
    
    return { 
      completed: true,
      message,
      level,
      timestamp: Date.now()
    };
  }

  private async executeError(_node: WorkflowNode, _workflow: Workflow): Promise<any> {
    const message = _node.config?.message || 'Error occurred';
    
    throw new Error(message);
  }

  private async executeMonitorFunction(node: WorkflowNode, workflow: Workflow): Promise<any> {
    const functionName = node.config?.functionName;
    
    if (!functionName) {
      throw new Error('MonitorFunction node requires a functionName');
    }

    const startTime = Date.now();
    let success = true;
    let errorMessage: string | null = null;
    let result: any;

    try {
      // In production, this would actually execute the function
      result = { mockResult: 'function executed' };
      return result;
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const metrics = {
        functionName,
        startTime,
        endTime,
        duration,
        success,
        errorMessage,
        timestamp: Date.now()
      };

      this.emit('functionMonitoringData', metrics);
      this.broadcastNodeUpdate(workflow.id, node.id, 'monitoring', node, metrics);
    }
  }

  stopWorkflow(workflowId: string): boolean {
    const workflow = this.runningWorkflows.get(workflowId);
    if (!workflow) return false;
    
    workflow.cancelled = true;
    workflow.status = 'stopped';
    workflow.endTime = Date.now();
    workflow.duration = workflow.endTime - (workflow.startTime || Date.now());
    
    this.addToHistory(workflow);
    this.runningWorkflows.delete(workflowId);
    
    this.emit('workflowStopped', workflow);
    this.broadcastWorkflowUpdate(workflowId, 'stopped', workflow);
    
    return true;
  }

  private processQueue(): void {
    if (this.isProcessing || this.executionQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    while (this.executionQueue.length > 0 && 
           this.runningWorkflows.size < this.config.workflow.maxConcurrentWorkflows) {
      const workflow = this.executionQueue.shift();
      if (workflow) {
        this.startWorkflow(workflow);
      }
    }
    
    this.isProcessing = false;
  }

  private broadcastWorkflowUpdate(workflowId: string, status: string, workflow: Workflow): void {
    if (this.io) {
      this.io.emit('workflowUpdate', {
        workflowId,
        status,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          status: workflow.status,
          startTime: workflow.startTime,
          endTime: workflow.endTime,
          duration: workflow.duration,
          error: workflow.error
        },
        timestamp: Date.now()
      });
    }
  }

  private broadcastNodeUpdate(workflowId: string, nodeId: string, status: string, node: WorkflowNode, data?: any): void {
    if (this.io) {
      this.io.emit('nodeUpdate', {
        workflowId,
        nodeId,
        status,
        node: {
          id: node.id,
          type: node.type,
          name: node.name,
          config: node.config
        },
        data,
        timestamp: Date.now()
      });
    }
  }

  private updateMetrics(workflow: Workflow): void {
    this.performanceMetrics.totalExecutionTime += workflow.duration || 0;
    
    if (this.performanceMetrics.totalWorkflows > 0) {
      this.performanceMetrics.averageExecutionTime = 
        this.performanceMetrics.totalExecutionTime / this.performanceMetrics.totalWorkflows;
    }

    if (workflow.error) {
      const errorType = workflow.error.split(':')[0];
      if (errorType) {
        const count = this.performanceMetrics.errorsByType.get(errorType) || 0;
        this.performanceMetrics.errorsByType.set(errorType, count + 1);
      }
    }
  }

  private addToHistory(workflow: Workflow): void {
    const historyEntry = {
      ...workflow,
      nodeCount: workflow.nodes.length,
      error: workflow.error || undefined
    };

    this.workflowHistory.push(historyEntry);

    // Limit history size
    if (this.workflowHistory.length > this.maxHistorySize) {
      this.workflowHistory.shift();
    }
  }

  getMetrics(): any {
    return {
      total: this.performanceMetrics.totalWorkflows,
      successful: this.performanceMetrics.successfulWorkflows,
      failed: this.performanceMetrics.failedWorkflows,
      successRate: this.performanceMetrics.totalWorkflows > 0 
        ? ((this.performanceMetrics.successfulWorkflows / this.performanceMetrics.totalWorkflows) * 100).toFixed(2) + '%'
        : '0.00%',
      averageExecutionTime: Math.round(this.performanceMetrics.averageExecutionTime),
      nodeExecutions: this.performanceMetrics.nodeExecutions,
      errorsByType: Object.fromEntries(this.performanceMetrics.errorsByType)
    };
  }

  getHistory(limit?: number): Array<Workflow & { nodeCount: number; error: string | undefined }> {
    if (limit && limit > 0) {
      return this.workflowHistory.slice(-limit);
    }
    return this.workflowHistory;
  }

  getRunningWorkflows(): Workflow[] {
    return Array.from(this.runningWorkflows.values());
  }

  getWorkflowStatus(workflowId: string): Workflow | null {
    return this.runningWorkflows.get(workflowId) || null;
  }
}

module.exports = WorkflowEngine;
