const io = require('socket.io-client');

class RuntimeMonitorClient {
    constructor(appName) {
        this.appName = appName;
        this.socket = null;
        this.appId = null;
        this.nodes = [];
        this.connections = [];
    }

    async connect(serverUrl = 'http://localhost:3000') {
        this.socket = io(serverUrl);
        
        return new Promise((resolve, reject) => {
            this.socket.on('connect', () => {
                console.log('Connected to Runtime Monitor server');
                
                // Register the application
                this.socket.emit('register_app', { name: this.appName });
                
                this.socket.on('registered', (data) => {
                    this.appId = data.appId;
                    console.log(`Application registered with ID: ${this.appId}`);
                    resolve(this.appId);
                });
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from Runtime Monitor server');
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                reject(error);
            });
        });
    }

    // Define a node in the visual flow
    defineNode(id, name, type, config = {}) {
        const node = {
            id,
            name,
            type,
            x: Math.random() * 600 + 50,
            y: Math.random() * 400 + 50,
            config
        };
        
        this.nodes.push(node);
        return node;
    }

    // Define a connection between nodes
    defineConnection(sourceId, targetId) {
        const connection = {
            source: sourceId,
            target: targetId
        };
        
        this.connections.push(connection);
        return connection;
    }

    // Send the node graph to the server
    sendNodeGraph() {
        if (!this.socket || !this.appId) {
            console.error('Not connected to server');
            return;
        }

        this.socket.emit('node_data', {
            nodes: this.nodes,
            connections: this.connections
        });
    }

    // Track function execution
    trackFunction(functionName, fn) {
        return async (...args) => {
            const startTime = Date.now();
            let success = true;
            let errorMessage = null;
            let result = null;

            try {
                result = await fn(...args);
                return result;
            } catch (error) {
                success = false;
                errorMessage = error.message;
                throw error;
            } finally {
                const endTime = Date.now();
                const duration = endTime - startTime;

                // Send execution data to server
                if (this.socket && this.appId) {
                    this.socket.emit('execution_data', {
                        functionName,
                        startTime,
                        endTime,
                        duration,
                        success,
                        parameters: args,
                        errorMessage
                    });
                }

                console.log(`[MONITOR] ${functionName}: ${duration}ms - ${success ? 'SUCCESS' : 'ERROR'}`);
            }
        };
    }

    // Simple function for tracking without async
    trackSyncFunction(functionName, fn) {
        return (...args) => {
            const startTime = Date.now();
            let success = true;
            let errorMessage = null;
            let result = null;

            try {
                result = fn(...args);
                return result;
            } catch (error) {
                success = false;
                errorMessage = error.message;
                throw error;
            } finally {
                const endTime = Date.now();
                const duration = endTime - startTime;

                // Send execution data to server
                if (this.socket && this.appId) {
                    this.socket.emit('execution_data', {
                        functionName,
                        startTime,
                        endTime,
                        duration,
                        success,
                        parameters: args,
                        errorMessage
                    });
                }

                console.log(`[MONITOR] ${functionName}: ${duration}ms - ${success ? 'SUCCESS' : 'ERROR'}`);
            }
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Example usage
async function exampleApp() {
    const monitor = new RuntimeMonitorClient('Example Desktop App');
    
    try {
        // Connect to the monitor server
        await monitor.connect();
        
        // Define the application's node structure
        monitor.defineNode('init', 'Initialize', 'system');
        monitor.defineNode('load-data', 'Load Data', 'data');
        monitor.defineNode('process', 'Process Data', 'logic');
        monitor.defineNode('save-results', 'Save Results', 'storage');
        monitor.defineNode('cleanup', 'Cleanup', 'system');
        
        // Define the flow connections
        monitor.defineConnection('init', 'load-data');
        monitor.defineConnection('load-data', 'process');
        monitor.defineConnection('process', 'save-results');
        monitor.defineConnection('save-results', 'cleanup');
        
        // Send the node graph to the server
        monitor.sendNodeGraph();
        
        // Example functions with monitoring
        const initialize = monitor.trackSyncFunction('init', () => {
            console.log('Initializing application...');
            // Simulate work
            const start = Date.now();
            while (Date.now() - start < 100) {} // 100ms delay
            return { initialized: true };
        });

        const loadData = monitor.trackSyncFunction('load-data', () => {
            console.log('Loading data...');
            const start = Date.now();
            while (Date.now() - start < 200) {} // 200ms delay
            return { data: [1, 2, 3, 4, 5] };
        });

        const processData = monitor.trackSyncFunction('process', (data) => {
            console.log('Processing data...');
            const start = Date.now();
            while (Date.now() - start < 150) {} // 150ms delay
            return { processed: data.map(x => x * 2) };
        });

        const saveResults = monitor.trackSyncFunction('save-results', (results) => {
            console.log('Saving results...');
            const start = Date.now();
            while (Date.now() - start < 80) {} // 80ms delay
            return { saved: true };
        });

        const cleanup = monitor.trackSyncFunction('cleanup', () => {
            console.log('Cleaning up...');
            const start = Date.now();
            while (Date.now() - start < 50) {} // 50ms delay
            return { cleaned: true };
        });

        // Run the application flow
        console.log('Starting application flow...');
        
        const initResult = initialize();
        const dataResult = loadData();
        const processResult = processData(dataResult.data);
        const saveResult = saveResults(processResult.processed);
        const cleanupResult = cleanup();
        
        console.log('Application flow completed!');
        
        // Demonstrate error handling
        const errorFunction = monitor.trackSyncFunction('error-demo', () => {
            throw new Error('This is a demonstration error');
        });
        
        try {
            errorFunction();
        } catch (error) {
            console.log('Caught expected error:', error.message);
        }
        
        // Keep the client running to show real-time updates
        console.log('Client running... Press Ctrl+C to exit');
        
        // Simulate periodic work
        setInterval(() => {
            const periodicTask = monitor.trackSyncFunction('periodic-task', () => {
                const start = Date.now();
                while (Date.now() - start < 50) {} // 50ms work
                return { timestamp: Date.now() };
            });
            
            periodicTask();
        }, 5000);
        
    } catch (error) {
        console.error('Failed to start example app:', error);
    }
}

// Run the example if this file is executed directly
if (require.main === module) {
    exampleApp();
}

module.exports = RuntimeMonitorClient;
