/**
 * Runtime Hub - Workflow Execution Engine
 * Orchestrates graph traversal, context management, and metrics.
 *
 * Node executor functions live in ./engine/node-adapters.js
 * Port definitions live in ./engine/ports.js
 */

const { EventEmitter } = require('events');
const { NODE_PORT_MAP, CONTROL_FLOW_OUTPUT_PORTS } = require('./engine/ports');
const adapters = require('./engine/node-adapters');

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

        this.runningWorkflows = new Map();
        this.workflowHistory = [];
        this.maxHistorySize = 1000;
        this.executionQueue = [];
        this.isProcessing = false;

        this.performanceMetrics = {
            totalWorkflows: 0,
            successfulWorkflows: 0,
            failedWorkflows: 0,
            averageExecutionTime: 0,
            totalExecutionTime: 0,
            nodeExecutions: 0,
            errorsByType: new Map()
        };

        this.initializeNodeExecutors();
    }

    initializeNodeExecutors() {
        this.nodeExecutors = new Map([
            ['Start',            adapters.executeStart],
            ['End',              adapters.executeEnd],
            ['Condition',        adapters.executeCondition],
            ['Delay',            adapters.executeDelay],
            ['Wait',             adapters.executeWait],
            ['Loop',             adapters.executeLoop],
            ['Show Message',     adapters.executeShowMessage],
            ['Write Log',        adapters.executeWriteLog],
            ['Keyboard Input',   adapters.executeKeyboardInput],
            ['Encrypt Data',     adapters.executeEncryptData],
            ['Execute Python',   adapters.executePython],
            ['Monitor Function', adapters.executeMonitorFunction],
            ['Import Module',    adapters.executeImportModule],
            ['List Directory',   adapters.executeListDirectory],
            ['Start Process',    adapters.executeStartProcess],
            ['Kill Process',     adapters.executeKillProcess],
            ['HTTP Request',     adapters.executeHTTPRequest],
            ['Download File',    adapters.executeDownloadFile],
            ['Transform JSON',   adapters.executeTransformJSON],
            ['Parse Text',       adapters.executeParseText],
            ['SQL Query',        adapters.executeSQLQuery],
            ['Screenshot',       adapters.executeScreenshot],
            ['HTML Snapshot',    adapters.executeHTMLSnapshot],
            ['CSS Inject',       adapters.executeCSSInject],
            ['Image Resize',     adapters.executeImageResize],
            ['Color Picker',     adapters.executeColorPicker],
        ]);
    }

    // ─── WORKFLOW LIFECYCLE ───────────────────────────────────────────────────

    async executeWorkflow(workflowId, nodes, connections) {
        let workflow = null;

        try {
            if (this.runningWorkflows.size >= this.config.workflow.maxConcurrentWorkflows) {
                throw new Error(`Maximum concurrent workflows (${this.config.workflow.maxConcurrentWorkflows}) reached`);
            }

            const startNode = nodes.find(node => node.type === 'Start');
            if (!startNode) {
                throw new Error('No Start node found in workflow');
            }

            // Initialize workflow and reserve slot BEFORE any awaits
            workflow = {
                id: workflowId,
                nodes,
                connections,
                executionState: new Map(),
                startTime: Date.now(),
                status: 'running',
                cancelled: false
            };
            this.runningWorkflows.set(workflowId, workflow);

            // Attach helpers node-adapters need
            workflow.io = this.io;
            workflow.emitFn = (event, data) => this.emit(event, data);

            // Create per-run workspace for temp files
            const assetsDir = await this.createRunWorkspace(workflowId);
            workflow.context = {
                runId: workflowId,
                variables: {},
                values: {},
                assetsDir
            };

            // traverseNode allows Loop adapter to recurse without coupling to `this`
            workflow.traverseNode = (targetNode, conns) =>
                this.executeNode(workflow, targetNode, conns || connections);

            await Promise.race([
                this.executeNode(workflow, startNode, connections),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Workflow execution timeout')), this.config.workflow.defaultTimeout)
                )
            ]);

            workflow.status = 'completed';
            workflow.endTime = Date.now();
            workflow.duration = workflow.endTime - workflow.startTime;
            this.runningWorkflows.delete(workflowId);

            if (this.config.workflow.enableDebugLogging) {
                console.log(`✅ Workflow completed: ${workflowId} (${workflow.duration}ms)`);
            }
            this.broadcastWorkflowUpdate(workflowId, 'completed', workflow);

        } catch (error) {
            if (workflow) {
                workflow.status = 'error';
                workflow.error = error.message;
                workflow.endTime = Date.now();
                workflow.duration = workflow.endTime - (workflow.startTime || Date.now());
                this.runningWorkflows.delete(workflowId);
                this.broadcastWorkflowUpdate(workflowId, 'error', { error: error.message });
            } else {
                // Error before workflow initialised (limit reached, no Start node)
                workflow = {
                    id: workflowId,
                    status: 'error',
                    error: error.message,
                    startTime: Date.now(),
                    endTime: Date.now(),
                    duration: 0,
                    nodes,
                    connections
                };
            }
        }

        this.updateMetrics(workflow);
        this.addToHistory(workflow);
        return workflow;
    }

    // ─── NODE TRAVERSAL ───────────────────────────────────────────────────────

    async executeNode(workflow, node, connections) {
        if (workflow.cancelled) throw new Error('Workflow cancelled');

        const nodeId = node.id;
        const nodeType = node.type;

        console.log(`⚡ Executing node: ${nodeType} (${nodeId})`);

        this.io.emit('log_entry', {
            source: 'WorkflowEngine',
            level: 'info',
            message: `Executing node: ${nodeType}`,
            data: { nodeId, workflowId: workflow.id }
        });

        const nodeState = workflow.executionState.get(nodeId) || { status: 'idle', data: {} };
        nodeState.status = 'running';
        nodeState.startTime = Date.now();
        workflow.executionState.set(nodeId, nodeState);
        this.broadcastNodeUpdate(workflow.id, nodeId, 'running', {});

        try {
            const executor = this.nodeExecutors.get(nodeType);
            if (!executor) throw new Error(`No executor found for node type: ${nodeType}`);

            const inputs = this.resolveInputs(node, workflow, connections);
            const result = await executor(node, workflow, connections, inputs);

            if (workflow.context) {
                workflow.context.values[nodeId] = result;
            }

            nodeState.status = 'completed';
            nodeState.endTime = Date.now();
            nodeState.result = result;
            nodeState.duration = nodeState.endTime - nodeState.startTime;
            workflow.executionState.set(nodeId, nodeState);

            this.io.emit('log_entry', {
                source: 'WorkflowEngine',
                level: 'success',
                message: `Node completed: ${nodeType} (${nodeState.duration}ms)`,
                data: { nodeId, result, duration: nodeState.duration }
            });

            this.broadcastNodeUpdate(workflow.id, nodeId, 'completed', result);

            if (!result || !result._skipAutoTraverse) {
                await this.executeConnectedNodes(workflow, node, connections, result);
            }

        } catch (error) {
            nodeState.status = 'error';
            nodeState.error = error.message;
            nodeState.endTime = Date.now();
            nodeState.duration = nodeState.endTime - nodeState.startTime;
            workflow.executionState.set(nodeId, nodeState);

            this.io.emit('log_entry', {
                source: 'WorkflowEngine',
                level: 'error',
                message: `Node failed: ${nodeType} - ${error.message}`,
                data: { nodeId, error: error.message, duration: nodeState.duration }
            });

            this.broadcastNodeUpdate(workflow.id, nodeId, 'error', { error: error.message });
            throw error;
        }
    }

    /**
     * Execute connected nodes — serial, with optional port-based branching.
     * @param {object} result - upstream node result (may contain _nextPort)
     */
    async executeConnectedNodes(workflow, node, connections, result) {
        const portMap = NODE_PORT_MAP[node.type];
        const nextPort = result && result._nextPort !== undefined ? result._nextPort : null;

        const outgoingConns = connections.filter(conn => {
            if (conn.from.nodeId !== node.id) return false;
            if (nextPort !== null && portMap) {
                return portMap.outputs[conn.from.portIndex] === nextPort;
            }
            return true;
        });

        const connectedNodes = outgoingConns
            .map(conn => workflow.nodes.find(n => n.id === conn.to.nodeId))
            .filter(Boolean);

        for (const connectedNode of connectedNodes) {
            await this.executeNode(workflow, connectedNode, connections);
        }
    }

    /**
     * Build a named inputs{} object for a node from upstream context.values.
     * Control-flow-only output ports (main, completed, etc.) are skipped.
     */
    resolveInputs(node, workflow, connections) {
        const inputs = {};
        if (!workflow.context) return inputs;

        const incomingConns = connections.filter(c => c.to.nodeId === node.id);
        if (incomingConns.length === 0) return inputs;

        const portMap = NODE_PORT_MAP[node.type];

        for (const conn of incomingConns) {
            const upstreamResult = workflow.context.values[conn.from.nodeId];
            if (upstreamResult === undefined) continue;

            const inputPortName = portMap
                ? (portMap.inputs[conn.to.portIndex] || `input_${conn.to.portIndex}`)
                : `input_${conn.to.portIndex}`;

            const fromNode = workflow.nodes.find(n => n.id === conn.from.nodeId);
            const fromPortMap = fromNode ? NODE_PORT_MAP[fromNode.type] : null;
            const outputPortName = fromPortMap
                ? (fromPortMap.outputs[conn.from.portIndex] || null)
                : null;

            if (outputPortName && CONTROL_FLOW_OUTPUT_PORTS.has(outputPortName)) continue;

            let value;
            if (outputPortName && upstreamResult[outputPortName] !== undefined) {
                value = upstreamResult[outputPortName];
            } else {
                value = upstreamResult;
            }

            inputs[inputPortName] = value;
        }

        return inputs;
    }

    async createRunWorkspace(runId) {
        const path = require('path');
        const fs = require('fs').promises;
        const dir = path.join(process.cwd(), 'runs', runId);
        await fs.mkdir(dir, { recursive: true });
        return dir;
    }

    // ─── WORKFLOW CONTROL ─────────────────────────────────────────────────────

    stopWorkflow(workflowId) {
        const workflow = this.runningWorkflows.get(workflowId);
        if (!workflow) return false;

        workflow.cancelled = true;
        workflow.status = 'stopped';
        workflow.endTime = Date.now();
        workflow.duration = workflow.endTime - workflow.startTime;

        this.addToHistory(workflow);
        this.runningWorkflows.delete(workflowId);

        if (this.io && this.io.emit) {
            this.io.emit('workflowStopped', workflow);
        }
        return true;
    }

    // ─── METRICS & HISTORY ────────────────────────────────────────────────────

    updateMetrics(workflow) {
        if (!workflow) return;
        this.performanceMetrics.totalWorkflows++;

        if (workflow.status === 'completed') {
            this.performanceMetrics.successfulWorkflows++;
        } else if (workflow.status === 'error') {
            this.performanceMetrics.failedWorkflows++;
            const errorType = workflow.error || 'Unknown';
            const currentCount = this.performanceMetrics.errorsByType.get(errorType) || 0;
            this.performanceMetrics.errorsByType.set(errorType, currentCount + 1);
        }

        this.performanceMetrics.totalExecutionTime += workflow.duration;
        this.performanceMetrics.averageExecutionTime =
            this.performanceMetrics.totalExecutionTime / this.performanceMetrics.totalWorkflows;
    }

    addToHistory(workflow) {
        if (!workflow) return;
        this.workflowHistory.push({
            id: workflow.id,
            status: workflow.status,
            duration: workflow.duration,
            startTime: workflow.startTime,
            endTime: workflow.endTime,
            nodeCount: workflow.nodes ? workflow.nodes.length : 0
        });

        if (this.workflowHistory.length > this.maxHistorySize) {
            this.workflowHistory.shift();
        }
    }

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

    getHistory(limit = 50) {
        return this.workflowHistory.slice(-limit);
    }

    // ─── BROADCASTING ─────────────────────────────────────────────────────────

    broadcastWorkflowUpdate(workflowId, status, data) {
        if (this.io && this.io.emit) {
            this.io.emit('workflow_update', { workflowId, status, data, timestamp: Date.now() });
        }
    }

    broadcastNodeUpdate(workflowId, nodeId, status, data) {
        if (this.io && this.io.emit) {
            this.io.emit('node_update', { workflowId, nodeId, status, data, timestamp: Date.now() });
        }
    }

    // ─── QUEUE ────────────────────────────────────────────────────────────────

    processQueue() {
        if (this.isProcessing || this.executionQueue.length === 0) return;
        this.isProcessing = true;

        while (this.executionQueue.length > 0 &&
               this.runningWorkflows.size < this.config.workflow.maxConcurrentWorkflows) {
            const workflow = this.executionQueue.shift();
            if (workflow) this.startWorkflow(workflow);
        }

        this.isProcessing = false;
    }
}

module.exports = WorkflowEngine;
