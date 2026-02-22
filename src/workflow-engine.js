/**
 * Runtime Hub - Workflow Execution Engine
 * Handles execution of visual workflows with node-based processing
 */

const { EventEmitter } = require('events');

class WorkflowEngine extends EventEmitter {
    constructor(io, config = {}) {
        super();
        this.io = io;
        this.config = {
            workflow: {
                maxConcurrentWorkflows: 5,
                defaultTimeout: 60000,
                maxNodeExecutionTime: 5000,
                enableDebugLogging: false
            },
            pythonAgent: {
                timeout: 10000,
                maxRetries: 3
            },
            ...config
        };

        // Initialize state
        this.runningWorkflows = new Map();
        this.workflowHistory = [];
        this.maxHistorySize = 1000;
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

        // Initialize node executors
        this.initializeNodeExecutors();
    }

    /**
     * Initialize node executors
     */
    initializeNodeExecutors() {
        // Basic Nodes
        this.nodeExecutors = new Map();
        this.nodeExecutors.set('Start', this.executeStart.bind(this));
        this.nodeExecutors.set('End', this.executeEnd.bind(this));
        this.nodeExecutors.set('Condition', this.executeCondition.bind(this));
        this.nodeExecutors.set('Delay', this.executeDelay.bind(this));
        
        // Data Nodes
        this.nodeExecutors.set('Transform JSON', this.executeTransformJSON.bind(this));
        this.nodeExecutors.set('Parse Text', this.executeParseText.bind(this));
        
        // Database Nodes
        this.nodeExecutors.set('SQL Query', this.executeSQLQuery.bind(this));
        
        // Notification Nodes
        this.nodeExecutors.set('Show Message', this.executeShowMessage.bind(this));
        this.nodeExecutors.set('Write Log', this.executeWriteLog.bind(this));
        
        // System Nodes
        this.nodeExecutors.set('Wait', this.executeWait.bind(this));
        this.nodeExecutors.set('Keyboard Input', this.executeKeyboardInput.bind(this));
        this.nodeExecutors.set('Encrypt Data', this.executeEncryptData.bind(this));
        this.nodeExecutors.set('Loop', this.executeLoop.bind(this));
        this.nodeExecutors.set('Monitor Function', this.executeMonitorFunction.bind(this));
        this.nodeExecutors.set('Import Module', this.executeImportModule.bind(this));
        
        // Python Nodes
        this.nodeExecutors.set('Execute Python', this.executePython.bind(this));
        this.nodeExecutors.set('Monitor Function', this.executeMonitorFunction.bind(this));
        this.nodeExecutors.set('Import Module', this.executeImportModule.bind(this));
        
        // File System Nodes
        this.nodeExecutors.set('List Directory', this.executeListDirectory.bind(this));
        this.nodeExecutors.set('Start Process', this.executeStartProcess.bind(this));
        this.nodeExecutors.set('Kill Process', this.executeKillProcess.bind(this));
        
        // Network Nodes
        this.nodeExecutors.set('HTTP Request', this.executeHTTPRequest.bind(this));
        this.nodeExecutors.set('Download File', this.executeDownloadFile.bind(this));
    }

    /**
     * Execute workflow
     */
    async executeWorkflow(workflowId, nodes, connections) {
        let workflow = null;
        
        try {
            // Check concurrent workflow limit
            if (this.runningWorkflows.size >= this.config.workflow.maxConcurrentWorkflows) {
                throw new Error(`Maximum concurrent workflows (${this.config.workflow.maxConcurrentWorkflows}) reached`);
            }

            // Find start node
            const startNode = nodes.find(node => node.type === 'Start');
            if (!startNode) {
                throw new Error('No Start node found in workflow');
            }

            // Initialize workflow
            workflow = {
                id: workflowId,
                nodes: nodes,
                connections: connections,
                executionState: new Map(),
                startTime: Date.now(),
                status: 'running',
                cancelled: false
            };

            this.runningWorkflows.set(workflowId, workflow);

            // Execute workflow with timeout
            await Promise.race([
                this.executeNode(workflow, startNode, connections),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Workflow execution timeout')), this.config.workflow.defaultTimeout)
                )
            ]);
            
            workflow.status = 'completed';
            workflow.endTime = Date.now();
            workflow.duration = workflow.endTime - workflow.startTime;
            
            if (this.config.workflow.enableDebugLogging) {
                console.log(`✅ Workflow completed: ${workflowId} (${workflow.duration}ms)`);
            }
            this.broadcastWorkflowUpdate(workflowId, 'completed', workflow);
            
        } catch (error) {
            // Create error workflow object
            workflow = {
                id: workflowId,
                nodes: nodes,
                connections: connections,
                executionState: new Map(),
                startTime: Date.now(),
                endTime: Date.now(),
                duration: 0,
                status: 'error',
                error: error.message,
                cancelled: false
            };
        }

        // Update metrics and history
        this.updateMetrics(workflow);
        this.addToHistory(workflow);

        return workflow;
    }

    /**
     * Execute a single node
     */
    async executeNode(workflow, node, connections) {
        // Check cancellation
        if (workflow.cancelled) {
            throw new Error('Workflow cancelled');
        }

        const nodeId = node.id;
        const nodeType = node.type;
        
        console.log(`⚡ Executing node: ${nodeType} (${nodeId})`);
        
        // Update node state
        const nodeState = workflow.executionState.get(nodeId) || { status: 'idle', data: {} };
        nodeState.status = 'running';
        nodeState.startTime = Date.now();
        workflow.executionState.set(nodeId, nodeState);

        try {
            // Get node executor
            const executor = this.nodeExecutors.get(nodeType);
            if (!executor) {
                throw new Error(`No executor found for node type: ${nodeType}`);
            }

            // Execute node
            const result = await executor(node, workflow, connections);
            
            // Update node state
            nodeState.status = 'completed';
            nodeState.endTime = Date.now();
            nodeState.result = result;
            workflow.executionState.set(nodeId, nodeState);
            
            // Broadcast node update
            this.broadcastNodeUpdate(workflow.id, nodeId, 'completed', result);
            
            // Execute connected nodes
            await this.executeConnectedNodes(workflow, node, connections);
            
        } catch (error) {
            nodeState.status = 'error';
            nodeState.error = error.message;
            nodeState.endTime = Date.now();
            workflow.executionState.set(nodeId, nodeState);
            
            this.broadcastNodeUpdate(workflow.id, nodeId, 'error', { error: error.message });
            throw error;
        }
    }

    /**
     * Execute connected nodes
     */
    async executeConnectedNodes(workflow, node, connections) {
        const connectedConnections = connections.filter(conn => 
            conn.from.nodeId === node.id
        );
        
        const connectedNodes = connectedConnections.map(conn => {
            const targetNode = workflow.nodes.find(n => n.id === conn.to.nodeId);
            return targetNode;
        }).filter(Boolean);
        
        await Promise.all(connectedNodes.map(connectedNode => 
            this.executeNode(workflow, connectedNode, connections)
        ));
    }

    /**
     * Stop workflow
     */
    stopWorkflow(workflowId) {
        const workflow = this.runningWorkflows.get(workflowId);
        if (!workflow) {
            return false;
        }

        workflow.cancelled = true;
        workflow.status = 'stopped';
        workflow.endTime = Date.now();
        workflow.duration = workflow.endTime - workflow.startTime;
        
        this.addToHistory(workflow);
        this.runningWorkflows.delete(workflowId);
        
        // Broadcast workflow stopped event if IO is available
        if (this.io && this.io.emit) {
            this.io.emit('workflowStopped', workflow);
        }
        return true;
    }

    /**
     * Update performance metrics
     */
    updateMetrics(workflow) {
        this.performanceMetrics.totalWorkflows++;
        
        if (workflow.status === 'completed') {
            this.performanceMetrics.successfulWorkflows++;
        } else if (workflow.status === 'error') {
            this.performanceMetrics.failedWorkflows++;
            
            // Track error types
            const errorType = workflow.error || 'Unknown';
            const currentCount = this.performanceMetrics.errorsByType.get(errorType) || 0;
            this.performanceMetrics.errorsByType.set(errorType, currentCount + 1);
        }
        
        // Update average execution time
        this.performanceMetrics.totalExecutionTime += workflow.duration;
        this.performanceMetrics.averageExecutionTime = this.performanceMetrics.totalExecutionTime / this.performanceMetrics.totalWorkflows;
    }

    /**
     * Add workflow to history
     */
    addToHistory(workflow) {
        this.workflowHistory.push({
            id: workflow.id,
            status: workflow.status,
            duration: workflow.duration,
            startTime: workflow.startTime,
            endTime: workflow.endTime,
            nodeCount: workflow.nodes ? workflow.nodes.length : 0
        });

        // Limit history size
        if (this.workflowHistory.length > this.maxHistorySize) {
            this.workflowHistory.shift();
        }
    }

    /**
     * Get metrics
     */
    getMetrics() {
        return {
            ...this.performanceMetrics,
            successRate: this.performanceMetrics.totalWorkflows > 0
                ? (this.performanceMetrics.successfulWorkflows / this.performanceMetrics.totalWorkflows * 100).toFixed(2) + '%'
                : '0%',
            averageExecutionTime: Math.round(this.performanceMetrics.averageExecutionTime),
            runningWorkflows: this.runningWorkflows.size,
            maxConcurrentWorkflows: this.config.workflow.maxConcurrentWorkflows
        };
    }

    /**
     * Get workflow history
     */
    getHistory(limit = 50) {
        return this.workflowHistory.slice(-limit);
    }

    /**
     * Broadcast workflow updates to clients
     */
    broadcastWorkflowUpdate(workflowId, status, data) {
        if (this.io && this.io.emit) {
            this.io.emit('workflow_update', {
                workflowId: workflowId,
                status: status,
                data: data,
                timestamp: Date.now()
            });
        }
    }

    /**
     * Broadcast node updates to clients
     */
    broadcastNodeUpdate(workflowId, nodeId, status, data) {
        if (this.io && this.io.emit) {
            this.io.emit('node_update', {
                workflowId: workflowId,
                nodeId: nodeId,
                status: status,
                data: data,
                timestamp: Date.now()
            });
        }
    }

    async executePython(node, workflow, connections) {
        const code = node.config.code || '';
        console.log(`🐍 Executing Python code`);
        return { output: 'Simulated Python execution' };
    }

    /**

    /**
     * Start Node
     */
    async executeStart(node, workflow, connections) {
        console.log('🚀 Workflow started');
        return { message: 'Workflow execution started' };
    }

    /**
     * End Node
     */
    async executeEnd(node, workflow, connections) {
        console.log('🏁 Workflow completed');
        return { message: 'Workflow execution completed' };
    }

    /**
     * Condition Node
     */
    async executeCondition(node, workflow, connections) {
        const condition = node.config.condition || '';
        const operator = node.config.operator || 'equals';
        const value = node.config.value || '';
        
        // Simple condition evaluation
        let result = false;
        switch (operator) {
            case 'equals':
                result = condition === value;
                break;
            case 'not_equals':
                result = condition !== value;
                break;
            case 'contains':
                result = condition.includes(value);
                break;
            default:
                result = false;
        }
        
        return { result, branch: result ? 'true' : 'false' };
    }

    /**
     * Delay Node
     */
    async executeDelay(node, workflow, connections) {
        const duration = node.config.duration || 1000;
        const unit = node.config.unit || 'ms';
        
        let waitTime = duration;
        if (unit === 'seconds') waitTime *= 1000;
        else if (unit === 'minutes') waitTime *= 60000;
        
        console.log(`⏱️ Waiting ${duration} ${unit}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        return { 
            duration: waitTime,
            unit: unit,
            completed: true
        };
    }

    /**
     * Show Message Node
     */
    async executeShowMessage(node, workflow, connections) {
        const title = node.config.title || 'Notification';
        const message = node.config.message || '';
        
        console.log(`💬 Showing message: ${title} - ${message}`);
        
        // Send notification to clients
        if (this.io && this.io.emit) {
            this.io.emit('notification', {
                title: title,
                message: message,
                type: 'info',
                timestamp: Date.now()
            });
        }
        
        return {
            title: title,
            message: message,
            shown: true
        };
    }

    /**
     * Write Log Node
     */
    async executeWriteLog(node, workflow, connections) {
        const message = node.config.message || '';
        const level = node.config.level || 'info';
        const logFile = node.config.logFile || 'workflow.log';
        
        console.log(`📝 Writing log: [${level}] ${message}`);
        
        return {
            level: level,
            message: message,
            logFile: logFile,
            logged: true
        };
    }

    /**
     * Wait Node (alias for Delay)
     */
    async executeWait(node, workflow, connections) {
        return this.executeDelay(node, workflow, connections);
    }

    /**
     * Keyboard Input Node
     */
    async executeKeyboardInput(node, workflow, connections) {
        const keys = node.config.keys || '';
        const action = node.config.action || '';
        
        console.log(`⌨️ Simulating keyboard input: ${keys} (${action})`);
        
        return { 
            keys: 'simulated keys',
            sent: true
        };
    }

    /**
     * Encrypt Data Node
     */
    async executeEncryptData(node, workflow, connections) {
        const data = node.config.data || '';
        const algorithm = node.config.algorithm || 'AES-256';
        
        console.log(`🔐 Encrypting data with ${algorithm}`);
        
        return { 
            encrypted: 'simulated encrypted data',
            algorithm: algorithm
        };
    }

    /**
     * Loop Node
     */
    async executeLoop(node, workflow, connections) {
        const iterations = node.config.iterations || 1;
        
        console.log(`🔄 Looping ${iterations} times`);
        
        return { 
            iterations: iterations,
            message: 'Loop execution simulated'
        };
    }

    /**
     * Monitor Function Node
     */
    async executeMonitorFunction(node, workflow, connections) {
        const functionName = node.config.functionName || '';
        const interval = node.config.interval || 1000;
        
        console.log(`👁️ Monitoring function: ${functionName} (interval: ${interval}ms)`);
        
        return { 
            functionName: functionName,
            interval: interval,
            message: 'Function monitoring simulated'
        };
    }

    /**
     * Import Module Node
     */
    async executeImportModule(node, workflow, connections) {
        const moduleName = node.config.module || '';
        const modulePath = node.config.path || '';
        
        console.log(`📦 Importing module: ${moduleName} from ${modulePath}`);
        
        // Simulated module import
        return {
            module: moduleName,
            path: modulePath,
            loaded: true,
            exports: ['default', 'function1', 'function2']
        };
    }

    /**
     * List Directory Node - REAL FILE SYSTEM OPERATIONS
     */
    async executeListDirectory(node, workflow, connections) {
        const fs = require('fs').promises;
        const path = require('path');
        const dirPath = node.config.path || '.';
        
        console.log(`📁 Listing real directory: ${dirPath}`);
        
        try {
            const items = await fs.readdir(dirPath, { withFileTypes: true });
            const files = [];
            const directories = [];
            
            for (const item of items) {
                const fullPath = path.join(dirPath, item.name);
                const stats = await fs.stat(fullPath);
                
                if (item.isDirectory()) {
                    directories.push({
                        name: item.name,
                        path: fullPath,
                        size: stats.size,
                        modified: stats.mtime
                    });
                } else {
                    files.push({
                        name: item.name,
                        path: fullPath,
                        size: stats.size,
                        modified: stats.mtime,
                        extension: path.extname(item.name)
                    });
                }
            }
            
            return {
                path: dirPath,
                files: files,
                directories: directories,
                total: files.length + directories.length
            };
        } catch (error) {
            console.error('Directory listing failed:', error.message);
            return {
                path: dirPath,
                files: [],
                directories: [],
                error: error.message,
                total: 0
            };
        }
    }

    /**
     * Start Process Node - REAL PROCESS CONTROL
     */
    async executeStartProcess(node, workflow, connections) {
        const { spawn } = require('child_process');
        const command = node.config.command || '';
        const args = node.config.args || [];
        
        console.log(`🚀 Starting real process: ${command} ${args.join(' ')}`);
        
        return new Promise((resolve, reject) => {
            try {
                const child = spawn(command, args, {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    shell: true
                });
                
                let stdout = '';
                let stderr = '';
                
                child.stdout?.on('data', (data) => {
                    stdout += data.toString();
                });
                
                child.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });
                
                child.on('close', (code) => {
                    resolve({
                        processId: child.pid,
                        command: command,
                        args: args,
                        exitCode: code,
                        stdout: stdout,
                        stderr: stderr,
                        status: code === 0 ? 'completed' : 'failed'
                    });
                });
                
                child.on('error', (error) => {
                    reject(error);
                });
                
                // Set a timeout for the process
                const timeout = setTimeout(() => {
                    child.kill();
                    reject(new Error('Process timeout'));
                }, 30000); // 30 second timeout
                
                child.on('close', () => {
                    clearTimeout(timeout);
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Kill Process Node - REAL PROCESS CONTROL
     */
    async executeKillProcess(node, workflow, connections) {
        const processId = node.config.processId || 0;
        
        console.log(`🔪 Killing real process: ${processId}`);
        
        try {
            process.kill(processId, 'SIGTERM');
            
            // Wait a moment to see if the process actually dies
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if process is still running
            try {
                process.kill(processId, 0); // Signal 0 just checks if process exists
                // If we get here, process still exists, force kill
                process.kill(processId, 'SIGKILL');
                return {
                    processId: processId,
                    status: 'force-killed',
                    signal: 'SIGKILL'
                };
            } catch (error) {
                // Process doesn't exist, it was killed successfully
                return {
                    processId: processId,
                    status: 'killed',
                    signal: 'SIGTERM'
                };
            }
        } catch (error) {
            console.error('Process kill failed:', error.message);
            return {
                processId: processId,
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * HTTP Request Node - REAL HTTP REQUESTS
     */
    async executeHTTPRequest(node, workflow, connections) {
        const url = node.config.url || '';
        const method = node.config.method || 'GET';
        const headers = node.config.headers || {};
        const body = node.config.body || null;
        
        console.log(`🌐 Making real HTTP ${method} request to: ${url}`);
        
        try {
            const options = {
                method: method,
                headers: headers
            };
            
            if (body && (method === 'POST' || method === 'PUT')) {
                options.body = typeof body === 'string' ? body : JSON.stringify(body);
            }
            
            const response = await fetch(url, options);
            const data = await response.text();
            
            return {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                data: data,
                url: url,
                method: method
            };
        } catch (error) {
            console.error('HTTP Request failed:', error.message);
            return {
                status: 0,
                statusText: 'Request Failed',
                error: error.message,
                url: url,
                method: method
            };
        }
    }

    /**
     * Download File Node
     */
    async executeDownloadFile(node, workflow, connections) {
        return { filePath: '/path/to/downloaded/file', size: 1024 };
    }

    /**
     * Transform JSON Node
     */
    async executeTransformJSON(node, workflow, connections) {
        return { transformed: 'Simulated transformation' };
    }

    /**
     * Parse Text Node
     */
    async executeParseText(node, workflow, connections) {
        return { matches: ['match1', 'match2'] };
    }

    /**
     * SQL Query Node
     */
    async executeSQLQuery(node, workflow, connections) {
        return { rows: [{ id: 1, name: 'test' }] };
    }

    // ==================== QUEUE MANAGEMENT ====================

    /**
     * Process execution queue
     */
    processQueue() {
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
}

module.exports = WorkflowEngine;
