/**
 * Runtime Hub - Comprehensive Node Library
 * Logic nodes for Windows PC applications and Python monitoring
 */

class NodeLibrary {
    constructor() {
        this.nodeTypes = new Map();
        this.categories = new Set();
        this.initializeNodeTypes();
    }

    initializeNodeTypes() {
        // === CONTROL FLOW NODES ===
        this.addNode({
            category: 'Control Flow',
            name: 'Start',
            icon: '🚀',
            color: '#00ff88',
            description: 'Entry point of the workflow',
            inputs: [],
            outputs: ['main'],
            config: {
                workflowName: '',
                description: ''
            }
        });

        this.addNode({
            category: 'Control Flow',
            name: 'End',
            icon: '🏁',
            color: '#ff4444',
            description: 'End point of the workflow',
            inputs: ['main'],
            outputs: [],
            config: {
                exitCode: 0,
                message: ''
            }
        });

        this.addNode({
            category: 'Control Flow',
            name: 'Condition',
            icon: '🔀',
            color: '#ffaa00',
            description: 'Conditional branching based on input',
            inputs: ['condition', 'true_path', 'false_path'],
            outputs: ['true', 'false'],
            config: {
                operator: 'equals',
                comparisonValue: ''
            }
        });

        this.addNode({
            category: 'Control Flow',
            name: 'Loop',
            icon: '🔄',
            color: '#00aaff',
            description: 'Iterate over items or repeat actions',
            inputs: ['input', 'loop_body'],
            outputs: ['item', 'loop_complete'],
            config: {
                loopType: 'foreach',
                maxIterations: 100
            }
        });

        // === PYTHON MONITORING NODES ===
        this.addNode({
            category: 'Python',
            name: 'Execute Python',
            icon: '🐍',
            color: '#3776ab',
            description: 'Execute Python code or function',
            inputs: ['code', 'args'],
            outputs: ['result', 'error'],
            config: {
                code: '',
                timeout: 30,
                captureOutput: true
            }
        });

        this.addNode({
            category: 'Python',
            name: 'Monitor Function',
            icon: '👁️',
            color: '#4b8bbe',
            description: 'Monitor Python function execution',
            inputs: ['function_name', 'trigger'],
            outputs: ['execution_data', 'error'],
            config: {
                functionName: '',
                trackParams: true,
                trackReturn: true
            }
        });

        this.addNode({
            category: 'Python',
            name: 'Import Module',
            icon: '📦',
            color: '#4584b6',
            description: 'Import Python module dynamically',
            inputs: ['module_name'],
            outputs: ['module', 'error'],
            config: {
                moduleName: '',
                alias: ''
            }
        });

        // === FILE SYSTEM NODES ===
        this.addNode({
            category: 'File System',
            name: 'Read File',
            icon: '📖',
            color: '#00bcd4',
            description: 'Read content from a file',
            inputs: ['file_path'],
            outputs: ['content', 'error'],
            config: {
                encoding: 'utf8',
                trimWhitespace: true
            }
        });

        this.addNode({
            category: 'File System',
            name: 'Write File',
            icon: '✏️',
            color: '#4caf50',
            description: 'Write content to a file',
            inputs: ['file_path', 'content'],
            outputs: ['success', 'error'],
            config: {
                encoding: 'utf8',
                append: false,
                createDirs: true
            }
        });

        this.addNode({
            category: 'File System',
            name: 'List Directory',
            icon: '📁',
            color: '#ff9800',
            description: 'List files and directories',
            inputs: ['directory_path'],
            outputs: ['files', 'directories', 'error'],
            config: {
                recursive: false,
                showHidden: false
            }
        });

        // === WINDOWS SYSTEM NODES ===
        this.addNode({
            category: 'Windows System',
            name: 'Run Command',
            icon: '⚡',
            color: '#f44336',
            description: 'Execute Windows command or PowerShell',
            inputs: ['command'],
            outputs: ['stdout', 'stderr', 'exit_code'],
            config: {
                shell: 'powershell',
                timeout: 30,
                workingDirectory: ''
            }
        });

        this.addNode({
            category: 'Windows System',
            name: 'Start Process',
            icon: '🚀',
            color: '#e91e63',
            description: 'Start Windows application or process',
            inputs: ['executable', 'args'],
            outputs: ['process_id', 'error'],
            config: {
                executable: '',
                args: '',
                workingDirectory: '',
                windowStyle: 'normal'
            }
        });

        this.addNode({
            category: 'Windows System',
            name: 'Kill Process',
            icon: '❌',
            color: '#9c27b0',
            description: 'Terminate Windows process',
            inputs: ['process_id', 'force'],
            outputs: ['success', 'error'],
            config: {
                processName: '',
                force: false,
                timeout: 10
            }
        });

        // === NETWORK NODES ===
        this.addNode({
            category: 'Network',
            name: 'HTTP Request',
            icon: '🌐',
            color: '#2196f3',
            description: 'Make HTTP request to API or website',
            inputs: ['url', 'method', 'body'],
            outputs: ['response', 'status_code', 'error'],
            config: {
                url: '',
                method: 'GET',
                headers: {},
                timeout: 30
            }
        });

        this.addNode({
            category: 'Network',
            name: 'Download File',
            icon: '⬇️',
            color: '#009688',
            description: 'Download file from URL',
            inputs: ['url', 'save_path'],
            outputs: ['file_path', 'size', 'error'],
            config: {
                url: '',
                savePath: '',
                resume: false,
                timeout: 300
            }
        });

        // === AUTO-CLICKER NODES ===
        this.addNode({
            category: 'Automation',
            name: 'Auto-Clicker Start',
            icon: '🖱️',
            color: '#ff6b6b',
            description: 'Start auto-clicker on specified coordinates',
            inputs: ['app_id', 'coordinates'],
            outputs: ['clicker_id', 'status'],
            config: {
                appId: '',
                x: 0,
                y: 0,
                clickType: 'left',
                interval: 1000
            }
        });

        this.addNode({
            category: 'Automation',
            name: 'Generate Random Location',
            icon: '🎯',
            color: '#4ecdc4',
            description: 'Generate random click coordinates for app',
            inputs: ['app_id', 'bounds'],
            outputs: ['x', 'y', 'coordinates'],
            config: {
                appId: '',
                minX: 100,
                minY: 100,
                maxX: 1900,
                maxY: 1000,
                avoidTaskbar: true
            }
        });

        this.addNode({
            category: 'Automation',
            name: 'Click Loop',
            icon: '🔄',
            color: '#45b7d1',
            description: 'Create infinite click loop with delay',
            inputs: ['clicker_id', 'interval'],
            outputs: ['loop_active', 'iteration'],
            config: {
                interval: 2000,
                maxIterations: -1, // -1 for infinite
                currentIteration: 0
            }
        });

        this.addNode({
            category: 'Automation',
            name: 'Stop Auto-Clicker',
            icon: '🛑',
            color: '#f39c12',
            description: 'Stop running auto-clicker',
            inputs: ['clicker_id'],
            outputs: ['stopped', 'final_status'],
            config: {
                clickerId: '',
                force: false
            }
        });

        this.addNode({
            category: 'Automation',
            name: 'Monitor Clicker Status',
            icon: '📊',
            color: '#9b59b6',
            description: 'Monitor auto-clicker status and health',
            inputs: ['clicker_id'],
            outputs: ['status', 'clicks_count', 'last_click_time'],
            config: {
                clickerId: '',
                checkInterval: 1000,
                timeout: 30000
            }
        });

        // === DATA PROCESSING NODES ===
        this.addNode({
            category: 'Data Processing',
            name: 'Transform JSON',
            icon: '🔄',
            color: '#795548',
            description: 'Transform or filter JSON data',
            inputs: ['data', 'transformation'],
            outputs: ['result', 'error'],
            config: {
                transformation: '',
                preserveOriginal: true
            }
        });

        this.addNode({
            category: 'Data Processing',
            name: 'Parse Text',
            icon: '📝',
            color: '#607d8b',
            description: 'Parse and extract text data',
            inputs: ['text', 'pattern'],
            outputs: ['matches', 'error'],
            config: {
                pattern: '',
                flags: 'g',
                dataType: 'string'
            }
        });

        // === DATABASE NODES ===
        this.addNode({
            category: 'Database',
            name: 'SQL Query',
            icon: '🗄️',
            color: '#3f51b5',
            description: 'Execute SQL query on database',
            inputs: ['query', 'parameters'],
            outputs: ['results', 'error'],
            config: {
                query: '',
                databaseType: 'sqlite',
                connectionString: '',
                timeout: 30
            }
        });

        // === NOTIFICATION NODES ===
        this.addNode({
            category: 'Notification',
            name: 'Show Message',
            icon: '💬',
            color: '#ff5722',
            description: 'Display desktop notification',
            inputs: ['title', 'message'],
            outputs: ['shown', 'error'],
            config: {
                title: '',
                message: '',
                icon: 'info',
                duration: 5000
            }
        });

        // === LOGGING NODES ===
        this.addNode({
            category: 'Logging',
            name: 'Write Log',
            icon: '📋',
            color: '#ffc107',
            description: 'Write entry to log file',
            inputs: ['level', 'message'],
            outputs: ['logged', 'error'],
            config: {
                level: 'info',
                logFile: 'runtime.log',
                timestamp: true
            }
        });

        // === AUTOMATION NODES ===
        this.addNode({
            category: 'Automation',
            name: 'Wait',
            icon: '⏱️',
            color: '#9e9e9e',
            description: 'Wait for specified duration',
            inputs: ['duration'],
            outputs: ['completed'],
            config: {
                duration: 1000,
                unit: 'milliseconds'
            }
        });

        this.addNode({
            category: 'Automation',
            name: 'Keyboard Input',
            icon: '⌨️',
            color: '#795548',
            description: 'Simulate keyboard input',
            inputs: ['keys', 'target'],
            outputs: ['sent', 'error'],
            config: {
                keys: '',
                target: 'active_window',
                delay: 100
            }
        });

        // === SECURITY NODES ===
        this.addNode({
            category: 'Security',
            name: 'Encrypt Data',
            icon: '🔐',
            color: '#4caf50',
            description: 'Encrypt sensitive data',
            inputs: ['data', 'key'],
            outputs: ['encrypted', 'error'],
            config: {
                algorithm: 'aes-256-gcm',
                keyLength: 32
            }
        });
    }

    // Add new node type dynamically
    addNode(nodeDefinition) {
        // Validate node definition
        if (!this.validateNodeDefinition(nodeDefinition)) {
            throw new Error('Invalid node definition');
        }

        this.nodeTypes.set(nodeDefinition.name, nodeDefinition);
        this.categories.add(nodeDefinition.category);

        // Emit event for UI update
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('nodeAdded', {
                detail: { node: nodeDefinition }
            }));
        }
    }

    // Remove node type
    removeNode(nodeName) {
        if (this.nodeTypes.has(nodeName)) {
            const node = this.nodeTypes.get(nodeName);
            this.nodeTypes.delete(nodeName);
            
            // Remove category if empty
            const categoryNodes = Array.from(this.nodeTypes.values())
                .filter(n => n.category === node.category);
            if (categoryNodes.length === 0) {
                this.categories.delete(node.category);
            }
            
            // Emit event for UI update
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('nodeRemoved', {
                    detail: { nodeName, category: node.category }
                }));
            }
            
            return true;
        }
        return false;
    }

    // Get node definition
    getNode(nodeName) {
        return this.nodeTypes.get(nodeName);
    }

    // Get all nodes in category
    getCategoryNodes(category) {
        return Array.from(this.nodeTypes.values())
            .filter(node => node.category === category);
    }

    // Get all categories
    getCategories() {
        return Array.from(this.categories);
    }

    // Search nodes
    searchNodes(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.nodeTypes.values())
            .filter(node => 
                node.name.toLowerCase().includes(lowerQuery) ||
                node.description.toLowerCase().includes(lowerQuery) ||
                node.category.toLowerCase().includes(lowerQuery)
            );
    }

    // Validate node definition
    validateNodeDefinition(node) {
        const required = ['name', 'category', 'description', 'inputs', 'outputs'];
        return required.every(field => node.hasOwnProperty(field)) &&
               typeof node.name === 'string' &&
               typeof node.category === 'string' &&
               Array.isArray(node.inputs) &&
               Array.isArray(node.outputs);
    }

    // Export node definitions
    exportNodes() {
        return {
            nodes: Array.from(this.nodeTypes.values()),
            categories: Array.from(this.categories),
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
    }

    // Import node definitions
    importNodes(data) {
        if (!data.nodes || !Array.isArray(data.nodes)) {
            throw new Error('Invalid import data');
        }

        data.nodes.forEach(nodeDef => {
            try {
                this.addNode(nodeDef);
            } catch (error) {
                console.warn(`Failed to import node ${nodeDef.name}:`, error.message);
            }
        });

        return {
            imported: data.nodes.length,
            failed: data.nodes.length - this.nodeTypes.size
        };
    }

    // Create node instance for workflow
    createNodeInstance(nodeName, instanceId = null) {
        const nodeDef = this.getNode(nodeName);
        if (!nodeDef) {
            throw new Error(`Node type '${nodeName}' not found`);
        }

        return {
            id: instanceId || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: nodeDef.name,
            category: nodeDef.category,
            inputs: nodeDef.inputs.map(input => ({
                name: typeof input === 'string' ? input : input.name,
                type: typeof input === 'string' ? 'any' : (input.type || 'any'),
                value: null,
                connected: false
            })),
            outputs: nodeDef.outputs.map(output => ({
                name: typeof output === 'string' ? output : output.name,
                type: typeof output === 'string' ? 'any' : (output.type || 'any'),
                value: null,
                connected: false
            })),
            config: { ...nodeDef.config },
            position: { x: 0, y: 0 },
            state: 'idle'
        };
    }
}

// Export for use in the application
window.NodeLibrary = NodeLibrary;

// Also export as NODE_LIBRARY array for compatibility with node-editor.html
const nodeLibraryInstance = new NodeLibrary();
window.NODE_LIBRARY = Array.from(nodeLibraryInstance.nodeTypes.values());

console.log(`✅ Node Library loaded: ${window.NODE_LIBRARY.length} nodes available`);
