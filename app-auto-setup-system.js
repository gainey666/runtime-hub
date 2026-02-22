/**
 * Universal Auto-Clicker Setup System
 * Automatically creates workflows for any app that connects
 */

class AppAutoSetupSystem {
    constructor() {
        this.activeWorkflows = new Map();
        this.appRegistry = new Map();
        this.workflowEngine = null;
    }

    // Initialize the system
    initialize(workflowEngine) {
        this.workflowEngine = workflowEngine;
        console.log('🚀 Universal Auto-Clicker Setup System initialized');
    }

    // Called when any app connects to the main system
    onAppConnection(appInfo) {
        console.log(`📱 New app connected: ${appInfo.name} (${appInfo.id})`);
        
        // Register the app
        this.appRegistry.set(appInfo.id, {
            ...appInfo,
            connectedAt: new Date(),
            autoClickerSetup: false
        });

        // Automatically create auto-clicker workflow
        this.createAutoClickerWorkflow(appInfo);
    }

    // Create auto-clicker workflow for the app
    async createAutoClickerWorkflow(appInfo) {
        console.log(`🔧 Creating auto-clicker workflow for ${appInfo.name}...`);

        // Generate random click location for this app
        const clickLocation = this.generateRandomLocation(appInfo.id);
        
        // Build the workflow
        const workflow = {
            id: `auto-clicker-${appInfo.id}`,
            name: `Auto-Clicker for ${appInfo.name}`,
            description: `Automatically generated auto-clicker workflow for ${appInfo.name}`,
            nodes: this.buildWorkflowNodes(appInfo, clickLocation),
            connections: this.buildWorkflowConnections(appInfo.id),
            variables: {
                appId: appInfo.id,
                appName: appInfo.name,
                clickLocation: clickLocation,
                loopInterval: appInfo.config?.loopInterval || 5000
            }
        };

        // Register the workflow
        this.activeWorkflows.set(appInfo.id, workflow);
        
        // Execute the workflow
        try {
            const result = await this.workflowEngine.executeWorkflow(workflow);
            console.log(`✅ Auto-clicker workflow started for ${appInfo.name}:`, result.workflowId);
            
            // Update app registry
            this.appRegistry.get(appInfo.id).autoClickerSetup = true;
            this.appRegistry.get(appInfo.id).workflowId = result.workflowId;
            
            return result;
        } catch (error) {
            console.error(`❌ Failed to start auto-clicker workflow for ${appInfo.name}:`, error);
            throw error;
        }
    }

    // Generate random click location for an app
    generateRandomLocation(appId) {
        // Use app ID as seed for consistent random location per app
        const seed = this.hashCode(appId);
        const random = this.seededRandom(seed);
        
        const screenBounds = {
            minX: 100,
            maxX: 1820,
            minY: 100,
            maxY: 980
        };

        const x = Math.floor(random() * (screenBounds.maxX - screenBounds.minX)) + screenBounds.minX;
        const y = Math.floor(random() * (screenBounds.maxY - screenBounds.minY)) + screenBounds.minY;

        const location = {
            x: x,
            y: y,
            width: 200,
            height: 50,
            centerX: x + 100,
            centerY: y + 25
        };

        console.log(`🎯 Generated random location for ${appId}: (${x}, ${y})`);
        return location;
    }

    // Build workflow nodes
    buildWorkflowNodes(appInfo, clickLocation) {
        const appId = appInfo.id;
        const appName = appInfo.name;
        const loopInterval = appInfo.config?.loopInterval || 5000;

        return [
            {
                id: `start-${appId}`,
                type: "Start",
                x: 50,
                y: 100,
                inputs: [],
                outputs: ["main"],
                config: {
                    workflowName: `Auto-Clicker for ${appName}`,
                    description: `Auto-generated workflow for ${appId}`,
                    appId: appId,
                    appName: appName
                }
            },
            {
                id: `generate-location-${appId}`,
                type: "JavaScript",
                x: 200,
                y: 100,
                inputs: ["main"],
                outputs: ["main"],
                config: {
                    code: `
// Generate random click location for ${appId}
const clickLocation = ${JSON.stringify(clickLocation)};

// Store for next nodes
workflowData.clickLocation = clickLocation;
workflowData.appId = '${appId}';
workflowData.appName = '${appName}';

return {
    success: true,
    clickLocation: clickLocation,
    message: 'Generated random location for ${appName}: (${clickLocation.x}, ${clickLocation.y})'
};
                    `
                }
            },
            {
                id: `start-clicker-${appId}`,
                type: "HTTP Request",
                x: 350,
                y: 100,
                inputs: ["main"],
                outputs: ["main"],
                config: {
                    url: "http://localhost:3001/api/auto-clicker/start",
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: {
                        area: {
                            x: "{{generate-location-" + appId + ".clickLocation.x}}",
                            y: "{{generate-location-" + appId + ".clickLocation.y}}",
                            width: "{{generate-location-" + appId + ".clickLocation.width}}",
                            height: "{{generate-location-" + appId + ".clickLocation.height}}"
                        },
                        targetPattern: "start|stop|ok|cancel|yes|no|click|button",
                        confidence: 0.7,
                        clickAction: "left",
                        refreshRate: loopInterval,
                        name: `auto-clicker-${appId}`,
                        appId: appId
                    }
                }
            },
            {
                id: `loop-delay-${appId}`,
                type: "Delay",
                x: 500,
                y: 100,
                inputs: ["main"],
                outputs: ["main"],
                config: {
                    duration: loopInterval,
                    unit: "ms"
                }
            },
            {
                id: `check-status-${appId}`,
                type: "HTTP Request",
                x: 650,
                y: 100,
                inputs: ["main"],
                outputs: ["main"],
                config: {
                    url: `http://localhost:3001/api/auto-clicker/status/{{start-clicker-${appId}.sessionId}}`,
                    method: "GET",
                    headers: { "Content-Type": "application/json" }
                }
            },
            {
                id: `loop-condition-${appId}`,
                type: "Condition",
                x: 800,
                y: 100,
                inputs: ["main"],
                outputs: ["true", "false"],
                config: {
                    condition: `{{check-status-${appId}.isRunning}} == true`,
                    trueLabel: "Continue Loop",
                    falseLabel: "Stop Loop"
                }
            },
            {
                id: `loop-back-${appId}`,
                type: "Loop Back",
                x: 950,
                y: 100,
                inputs: ["main"],
                outputs: ["main"],
                config: {
                    targetNodeId: `loop-delay-${appId}`,
                    loopCondition: "true"
                }
            },
            {
                id: `stop-clicker-${appId}`,
                type: "HTTP Request",
                x: 800,
                y: 200,
                inputs: ["main"],
                outputs: ["main"],
                config: {
                    url: `http://localhost:3001/api/auto-clicker/stop/{{start-clicker-${appId}.sessionId}}`,
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                }
            },
            {
                id: `end-${appId}`,
                type: "End",
                x: 950,
                y: 200,
                inputs: ["main"],
                outputs: [],
                config: {
                    exitCode: 0,
                    message: `Auto-clicker workflow for ${appName} completed`,
                    appId: appId
                }
            }
        ];
    }

    // Build workflow connections
    buildWorkflowConnections(appId) {
        return [
            {
                id: `conn-start-${appId}`,
                from: { nodeId: `start-${appId}`, portIndex: 0 },
                to: { nodeId: `generate-location-${appId}`, portIndex: 0 }
            },
            {
                id: `conn-location-${appId}`,
                from: { nodeId: `generate-location-${appId}`, portIndex: 0 },
                to: { nodeId: `start-clicker-${appId}`, portIndex: 0 }
            },
            {
                id: `conn-start-clicker-${appId}`,
                from: { nodeId: `start-clicker-${appId}`, portIndex: 0 },
                to: { nodeId: `loop-delay-${appId}`, portIndex: 0 }
            },
            {
                id: `conn-delay-${appId}`,
                from: { nodeId: `loop-delay-${appId}`, portIndex: 0 },
                to: { nodeId: `check-status-${appId}`, portIndex: 0 }
            },
            {
                id: `conn-status-${appId}`,
                from: { nodeId: `check-status-${appId}`, portIndex: 0 },
                to: { nodeId: `loop-condition-${appId}`, portIndex: 0 }
            },
            {
                id: `conn-loop-true-${appId}`,
                from: { nodeId: `loop-condition-${appId}`, portIndex: 0 },
                to: { nodeId: `loop-back-${appId}`, portIndex: 0 }
            },
            {
                id: `conn-loop-back-${appId}`,
                from: { nodeId: `loop-back-${appId}`, portIndex: 0 },
                to: { nodeId: `loop-delay-${appId}`, portIndex: 0 }
            },
            {
                id: `conn-loop-false-${appId}`,
                from: { nodeId: `loop-condition-${appId}`, portIndex: 1 },
                to: { nodeId: `stop-clicker-${appId}`, portIndex: 0 }
            },
            {
                id: `conn-stop-${appId}`,
                from: { nodeId: `stop-clicker-${appId}`, portIndex: 0 },
                to: { nodeId: `end-${appId}`, portIndex: 0 }
            }
        ];
    }

    // Stop auto-clicker workflow for an app
    async stopAutoClickerWorkflow(appId) {
        console.log(`🛑 Stopping auto-clicker workflow for app: ${appId}`);
        
        const workflow = this.activeWorkflows.get(appId);
        if (workflow) {
            try {
                await this.workflowEngine.stopWorkflow(workflow.id);
                this.activeWorkflows.delete(appId);
                
                // Update app registry
                if (this.appRegistry.has(appId)) {
                    this.appRegistry.get(appId).autoClickerSetup = false;
                }
                
                console.log(`✅ Auto-clicker workflow stopped for ${appId}`);
                return true;
            } catch (error) {
                console.error(`❌ Failed to stop auto-clicker workflow for ${appId}:`, error);
                return false;
            }
        }
        
        return false;
    }

    // Get status of all auto-clicker workflows
    getAllWorkflowStatuses() {
        const statuses = {};
        
        for (const [appId, workflow] of this.activeWorkflows) {
            statuses[appId] = {
                workflowId: workflow.id,
                appName: workflow.name,
                status: 'running',
                clickLocation: workflow.variables.clickLocation,
                loopInterval: workflow.variables.loopInterval
            };
        }
        
        return statuses;
    }

    // Utility functions for consistent random generation
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    seededRandom(seed) {
        let m = 0x80000000; // 2**31
        let a = 1103515245;
        let c = 12345;
        let state = seed ? seed : Math.floor(Math.random() * (m - 1));
        
        return function() {
            state = (a * state + c) % m;
            return state / (m - 1);
        };
    }

    // Simulate app connection for testing
    simulateAppConnection(appName, config = {}) {
        const appInfo = {
            id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: appName,
            type: 'external-app',
            version: '1.0.0',
            config: {
                loopInterval: 5000,
                ...config
            },
            connectedAt: new Date()
        };

        this.onAppConnection(appInfo);
        return appInfo;
    }
}

module.exports = AppAutoSetupSystem;
