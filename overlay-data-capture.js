/**
 * OVERLAY DATA CAPTURE SYSTEM
 * Captures what your overlay does and converts it to workflow format
 */

class OverlayDataCapture {
  constructor() {
    this.capturedData = [];
    this.isCapturing = false;
  }

  // Start capturing overlay actions
  startCapture() {
    console.log('🎯 Starting overlay data capture...');
    this.isCapturing = true;
    this.capturedData = [];
    
    // Hook into overlay events (you'll add these in your overlay code)
    this.setupEventListeners();
  }

  // Stop capturing and generate workflow
  stopCapture() {
    console.log('🛑 Stopping capture and generating workflow...');
    this.isCapturing = false;
    
    const workflow = this.generateWorkflowFromCapture();
    this.saveWorkflowToFile(workflow);
    
    return workflow;
  }

  // Capture an action from your overlay
  captureAction(action) {
    if (!this.isCapturing) return;
    
    const capturedAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: this.detectActionType(action),
      data: action,
      position: action.position || { x: 0, y: 0 },
      config: action.config || {}
    };
    
    this.capturedData.push(capturedAction);
    console.log(`📝 Captured: ${capturedAction.type}`);
  }

  // Detect what type of action this is
  detectActionType(action) {
    if (action.type) return action.type;
    
    // Auto-detect based on data
    if (action.url) return 'HTTP Request';
    if (action.command) return 'Start Process';
    if (action.filePath) return 'File Operation';
    if (action.message) return 'Show Message';
    if (action.delay) return 'Delay';
    if (action.condition) return 'Condition';
    
    return 'Unknown Action';
  }

  // Generate workflow from captured data
  generateWorkflowFromCapture() {
    const workflow = {
      id: `overlay-workflow-${Date.now()}`,
      name: 'Overlay Generated Workflow',
      nodes: this.createNodesFromCapture(),
      connections: this.createConnectionsFromCapture(),
      metadata: {
        capturedAt: new Date().toISOString(),
        totalActions: this.capturedData.length,
        captureDuration: this.capturedData.length > 0 ? 
          this.capturedData[this.capturedData.length - 1].timestamp - this.capturedData[0].timestamp : 0
      }
    };
    
    return workflow;
  }

  // Convert captured actions to workflow nodes
  createNodesFromCapture() {
    const nodes = [
      // Always start with Start node
      {
        id: 'start',
        type: 'Start',
        x: 50,
        y: 100,
        inputs: [],
        outputs: ['main'],
        config: {}
      }
    ];

    // Add captured actions as nodes
    this.capturedData.forEach((action, index) => {
      const node = {
        id: action.id,
        type: action.type,
        x: 150 + (index * 120), // Space them out horizontally
        y: 100,
        inputs: ['main'],
        outputs: ['main'],
        config: action.config
      };
      
      nodes.push(node);
    });

    // Always end with End node
    nodes.push({
      id: 'end',
      type: 'End',
      x: 150 + (this.capturedData.length * 120) + 50,
      y: 100,
      inputs: ['main'],
      outputs: [],
      config: {}
    });

    return nodes;
  }

  // Create connections between nodes
  createConnectionsFromCapture() {
    const connections = [];
    
    // Connect all nodes in sequence
    for (let i = 0; i < this.capturedData.length + 1; i++) {
      connections.push({
        id: `conn-${i}`,
        from: { nodeId: i === 0 ? 'start' : this.capturedData[i - 1].id, portIndex: 0 },
        to: { nodeId: i === this.capturedData.length ? 'end' : this.capturedData[i].id, portIndex: 0 }
      });
    }
    
    return connections;
  }

  // Save workflow to file
  saveWorkflowToFile(workflow) {
    const fs = require('fs');
    const fileName = `overlay-workflow-${Date.now()}.json`;
    
    fs.writeFileSync(fileName, JSON.stringify(workflow, null, 2));
    console.log(`💾 Workflow saved to: ${fileName}`);
    
    return fileName;
  }

  // Setup event listeners (you'll customize this for your overlay)
  setupEventListeners() {
    // Example: Listen for HTTP requests in your overlay
    window.addEventListener('overlay-http-request', (event) => {
      this.captureAction({
        type: 'HTTP Request',
        url: event.detail.url,
        method: event.detail.method,
        headers: event.detail.headers,
        body: event.detail.body
      });
    });

    // Example: Listen for process execution
    window.addEventListener('overlay-process-start', (event) => {
      this.captureAction({
        type: 'Start Process',
        command: event.detail.command,
        args: event.detail.args
      });
    });

    // Example: Listen for file operations
    window.addEventListener('overlay-file-operation', (event) => {
      this.captureAction({
        type: 'File Operation',
        filePath: event.detail.filePath,
        operation: event.detail.operation,
        content: event.detail.content
      });
    });

    // Example: Listen for messages/notifications
    window.addEventListener('overlay-message', (event) => {
      this.captureAction({
        type: 'Show Message',
        title: event.detail.title,
        message: event.detail.message,
        type: event.detail.messageType
      });
    });
  }

  // Export captured data as API-friendly format
  exportData() {
    return {
      workflow: this.generateWorkflowFromCapture(),
      rawActions: this.capturedData,
      metadata: {
        exportTime: new Date().toISOString(),
        totalActions: this.capturedData.length
      }
    };
  }
}

// Export for use in your overlay
if (typeof window !== 'undefined') {
  window.OverlayDataCapture = OverlayDataCapture;
}

// Export for Node.js use
module.exports = OverlayDataCapture;
