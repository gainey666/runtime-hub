# WorkflowEngine API Integration Guide

## 🌐 **COMPLETE API FEATURES & INTEGRATION GUIDE**

### **📋 CURRENT API ENDPOINTS**

#### **🔄 WORKFLOW EXECUTION API**
```javascript
// Execute a workflow
POST /api/workflows/execute
{
  "nodes": [...],
  "connections": [...],
  "workflowId": "my-workflow"
}

// Stop a workflow
POST /api/workflows/:workflowId/stop

// Get workflow status
GET /api/workflows/:workflowId/status

// Get all running workflows
GET /api/workflows

// Get workflow metrics
GET /api/metrics
```

#### **📊 MONITORING API**
```javascript
// Get application logs
GET /api/applications/:appId/logs

// Get application nodes
GET /api/applications/:appId/nodes

// Get all applications
GET /api/applications

// Health check
GET /health
```

---

## 🔧 **HOW TO INTEGRATE YOUR WORK-IN-PROGRESS TOOLS**

### **🎯 METHOD 1: REST API INTEGRATION**

#### **Step 1: Create API Client**
```javascript
// api-client.js
class WorkflowEngineClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async executeWorkflow(nodes, connections, workflowId) {
    const response = await fetch(`${this.baseUrl}/api/workflows/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodes,
        connections,
        workflowId
      })
    });
    return response.json();
  }

  async stopWorkflow(workflowId) {
    const response = await fetch(`${this.baseUrl}/api/workflows/${workflowId}/stop`, {
      method: 'POST'
    });
    return response.json();
  }

  async getWorkflowStatus(workflowId) {
    const response = await fetch(`${this.baseUrl}/api/workflows/${workflowId}/status`);
    return response.json();
  }

  async getMetrics() {
    const response = await fetch(`${this.baseUrl}/api/metrics`);
    return response.json();
  }
}
```

#### **Step 2: Integrate with Your Tool**
```javascript
// your-tool-integration.js
const WorkflowEngineClient = require('./api-client');

class YourToolIntegration {
  constructor() {
    this.client = new WorkflowEngineClient();
  }

  async runYourWorkflow() {
    // Define your workflow
    const nodes = [
      {
        id: 'start',
        type: 'Start',
        x: 0, y: 0,
        inputs: [],
        outputs: ['main'],
        config: {}
      },
      {
        id: 'http',
        type: 'HTTP Request',
        x: 100, y: 0,
        inputs: ['main'],
        outputs: ['main'],
        config: {
          url: 'https://your-api.com/data',
          method: 'GET',
          headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
        }
      },
      {
        id: 'process',
        type: 'Start Process',
        x: 200, y: 0,
        inputs: ['main'],
        outputs: ['main'],
        config: {
          command: 'node',
          args: ['your-script.js', '--data', '{{http.response}}']
        }
      },
      {
        id: 'end',
        type: 'End',
        x: 300, y: 0,
        inputs: ['main'],
        outputs: [],
        config: {}
      }
    ];

    const connections = [
      { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'http', portIndex: 0 } },
      { id: 'conn2', from: { nodeId: 'http', portIndex: 0 }, to: { nodeId: 'process', portIndex: 0 } },
      { id: 'conn3', from: { nodeId: 'process', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
    ];

    try {
      const result = await this.client.executeWorkflow(nodes, connections, 'your-workflow');
      console.log('Workflow executed:', result);
      return result;
    } catch (error) {
      console.error('Workflow failed:', error);
      throw error;
    }
  }
}
```

---

### **🔌 METHOD 2: WEBSOCKET REAL-TIME INTEGRATION**

#### **Step 1: WebSocket Client**
```javascript
// websocket-client.js
const io = require('socket.io-client');

class WorkflowEngineWebSocket {
  constructor(url = 'http://localhost:3000') {
    this.socket = io(url);
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen to workflow updates
    this.socket.on('workflow_update', (data) => {
      console.log('Workflow update:', data);
      this.handleWorkflowUpdate(data);
    });

    // Listen to node updates
    this.socket.on('node_update', (data) => {
      console.log('Node update:', data);
      this.handleNodeUpdate(data);
    });

    // Listen to notifications
    this.socket.on('notification', (data) => {
      console.log('Notification:', data);
      this.handleNotification(data);
    });
  }

  handleWorkflowUpdate(data) {
    // Update your UI or trigger actions
    if (data.status === 'completed') {
      console.log(`Workflow ${data.workflowId} completed!`);
      // Trigger your next step
    }
  }

  handleNodeUpdate(data) {
    // Update node status in your UI
    console.log(`Node ${data.nodeId} is ${data.status}`);
  }

  handleNotification(data) {
    // Show notifications to users
    console.log(`Notification: ${data.title} - ${data.message}`);
  }
}
```

#### **Step 2: Real-Time Integration**
```javascript
// real-time-integration.js
const WorkflowEngineWebSocket = require('./websocket-client');

class RealTimeToolIntegration {
  constructor() {
    this.ws = new WorkflowEngineWebSocket();
    this.setupRealTimeHandlers();
  }

  setupRealTimeHandlers() {
    this.ws.socket.on('workflow_update', (data) => {
      if (data.status === 'completed') {
        this.onWorkflowCompleted(data);
      } else if (data.status === 'error') {
        this.onWorkflowError(data);
      }
    });

    this.ws.socket.on('node_update', (data) => {
      this.onNodeProgress(data);
    });
  }

  onWorkflowCompleted(data) {
    console.log(`✅ Workflow ${data.workflowId} completed!`);
    // Trigger your next automation step
    this.triggerNextStep(data.data);
  }

  onWorkflowError(data) {
    console.log(`❌ Workflow ${data.workflowId} failed!`);
    // Handle error recovery
    this.handleErrorRecovery(data.data);
  }

  onNodeProgress(data) {
    console.log(`🔄 Node ${data.nodeId}: ${data.status}`);
    // Update progress indicators
    this.updateProgress(data);
  }

  triggerNextStep(workflowData) {
    // Your custom logic for next steps
    console.log('Triggering next automation step...');
  }

  handleErrorRecovery(workflowData) {
    // Your custom error recovery logic
    console.log('Initiating error recovery...');
  }

  updateProgress(nodeData) {
    // Update your UI progress bars
    console.log(`Progress: ${nodeData.status}`);
  }
}
```

---

### **🔗 METHOD 3: DIRECT ENGINE INTEGRATION**

#### **Step 1: Import Engine Directly**
```javascript
// direct-integration.js
const WorkflowEngine = require('./src/workflow-engine');
const { EventEmitter } = require('events');

class DirectEngineIntegration {
  constructor() {
    this.io = new EventEmitter();
    this.engine = new WorkflowEngine(this.io);
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('workflow_update', (data) => {
      console.log('Workflow update:', data);
    });

    this.io.on('node_update', (data) => {
      console.log('Node update:', data);
    });
  }

  async runCustomWorkflow(yourData) {
    // Create custom workflow based on your data
    const nodes = this.createNodesFromData(yourData);
    const connections = this.createConnectionsFromData(yourData);

    try {
      const result = await this.engine.executeWorkflow(
        `custom-${Date.now()}`,
        nodes,
        connections
      );
      return result;
    } catch (error) {
      console.error('Custom workflow failed:', error);
      throw error;
    }
  }

  createNodesFromData(data) {
    // Convert your data to workflow nodes
    return [
      {
        id: 'start',
        type: 'Start',
        x: 0, y: 0,
        inputs: [],
        outputs: ['main'],
        config: {}
      },
      {
        id: 'process',
        type: 'Start Process',
        x: 100, y: 0,
        inputs: ['main'],
        outputs: ['main'],
        config: {
          command: data.command,
          args: data.args || []
        }
      },
      {
        id: 'http',
        type: 'HTTP Request',
        x: 200, y: 0,
        inputs: ['main'],
        outputs: ['main'],
        config: {
          url: data.apiUrl,
          method: data.method || 'POST',
          headers: data.headers || {},
          body: JSON.stringify(data.payload)
        }
      },
      {
        id: 'end',
        type: 'End',
        x: 300, y: 0,
        inputs: ['main'],
        outputs: [],
        config: {}
      }
    ];
  }

  createConnectionsFromData(data) {
    return [
      { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'process', portIndex: 0 } },
      { id: 'conn2', from: { nodeId: 'process', portIndex: 0 }, to: { nodeId: 'http', portIndex: 0 } },
      { id: 'conn3', from: { nodeId: 'http', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
    ];
  }
}
```

---

## 🎯 **SPECIFIC INTEGRATION EXAMPLES**

### **📱 WEB APP INTEGRATION**
```javascript
// web-app-integration.js
class WebAppIntegration {
  constructor() {
    this.client = new WorkflowEngineClient();
    this.setupWebHooks();
  }

  setupWebHooks() {
    // Express.js webhook endpoint
    app.post('/webhook/trigger-workflow', async (req, res) => {
      try {
        const result = await this.client.executeWorkflow(
          req.body.nodes,
          req.body.connections,
          req.body.workflowId
        );
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  async triggerWorkflowFromWebEvent(eventData) {
    const workflowNodes = this.createWorkflowFromEvent(eventData);
    const result = await this.client.executeWorkflow(
      workflowNodes.nodes,
      workflowNodes.connections,
      `web-event-${Date.now()}`
    );
    return result;
  }
}
```

### **🤖 AUTOMATION TOOL INTEGRATION**
```javascript
// automation-integration.js
class AutomationToolIntegration {
  constructor() {
    this.engine = new WorkflowEngine(new EventEmitter());
  }

  async runAutomationPipeline(tasks) {
    const workflowNodes = tasks.map((task, index) => ({
      id: `task-${index}`,
      type: task.type,
      x: index * 100,
      y: 0,
      inputs: index === 0 ? [] : ['main'],
      outputs: index === tasks.length - 1 ? [] : ['main'],
      config: task.config
    }));

    const connections = workflowNodes
      .slice(0, -1)
      .map((node, index) => ({
        id: `conn-${index}`,
        from: { nodeId: node.id, portIndex: 0 },
        to: { nodeId: workflowNodes[index + 1].id, portIndex: 0 }
      }));

    return await this.engine.executeWorkflow(
      `automation-${Date.now()}`,
      workflowNodes,
      connections
    );
  }
}
```

### **📊 DATA PROCESSING INTEGRATION**
```javascript
// data-processing-integration.js
class DataProcessingIntegration {
  constructor() {
    this.client = new WorkflowEngineClient();
  }

  async processDataPipeline(data) {
    const workflow = {
      nodes: [
        {
          id: 'start',
          type: 'Start',
          x: 0, y: 0,
          inputs: [],
          outputs: ['main'],
          config: {}
        },
        {
          id: 'validate',
          type: 'Condition',
          x: 100, y: 0,
          inputs: ['main'],
          outputs: ['main'],
          config: {
            condition: data.type,
            operator: 'equals',
            value: 'valid'
          }
        },
        {
          id: 'transform',
          type: 'Transform JSON',
          x: 200, y: 0,
          inputs: ['main'],
          outputs: ['main'],
          config: {
            transformation: JSON.stringify(data.transformation)
          }
        },
        {
          id: 'store',
          type: 'HTTP Request',
          x: 300, y: 0,
          inputs: ['main'],
          outputs: ['main'],
          config: {
            url: 'https://your-api.com/data',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{{transform.result}}'
          }
        },
        {
          id: 'end',
          type: 'End',
          x: 400, y: 0,
          inputs: ['main'],
          outputs: [],
          config: {}
        }
      ],
      connections: [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'validate', portIndex: 0 } },
        { id: 'conn2', from: { nodeId: 'validate', portIndex: 0 }, to: { nodeId: 'transform', portIndex: 0 } },
        { id: 'conn3', from: { nodeId: 'transform', portIndex: 0 }, to: { nodeId: 'store', portIndex: 0 } },
        { id: 'conn4', from: { nodeId: 'store', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
      ]
    };

    return await this.client.executeWorkflow(
      workflow.nodes,
      workflow.connections,
      `data-processing-${Date.now()}`
    );
  }
}
```

---

## 🔧 **ADVANCED FEATURES**

### **🔐 AUTHENTICATION & SECURITY**
```javascript
// secure-integration.js
class SecureIntegration {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.client = new WorkflowEngineClient();
  }

  async executeSecureWorkflow(nodes, connections) {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-API-Version': 'v1'
    };

    const response = await fetch(`${this.client.baseUrl}/api/workflows/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ nodes, connections })
    });

    return response.json();
  }
}
```

### **📈 MONITORING & LOGGING**
```javascript
// monitoring-integration.js
class MonitoringIntegration {
  constructor() {
    this.client = new WorkflowEngineClient();
    this.setupMonitoring();
  }

  setupMonitoring() {
    // Monitor workflow metrics
    setInterval(async () => {
      const metrics = await this.client.getMetrics();
      console.log('Workflow metrics:', metrics);
      
      // Alert on high error rates
      if (metrics.failedWorkflows > 0) {
        this.sendAlert(`High error rate: ${metrics.failedWorkflows} failed workflows`);
      }
    }, 30000); // Every 30 seconds
  }

  sendAlert(message) {
    // Your alert system integration
    console.log('ALERT:', message);
    // Send to Slack, email, etc.
  }
}
```

---

## 🎯 **QUICK START INTEGRATION**

### **Step 1: Choose Integration Method**
- **REST API**: Simple HTTP requests
- **WebSocket**: Real-time updates
- **Direct Engine**: Full control

### **Step 2: Install Dependencies**
```bash
npm install socket.io-client node-fetch
```

### **Step 3: Create Integration**
```javascript
const WorkflowEngineClient = require('./api-client');

const client = new WorkflowEngineClient();
// Start integrating!
```

---

## 🚀 **PRODUCTION READY FEATURES**

✅ **Real HTTP requests** to any API  
✅ **Real file system** operations  
✅ **Real process control** and automation  
✅ **Real-time WebSocket** updates  
✅ **Error handling** and recovery  
✅ **Metrics tracking** and monitoring  
✅ **Authentication** and security  
✅ **Scalable architecture**  

---

**🏛️ ARCHITECT - "YOUR WORKFLOWENGINE IS A COMPLETE API PLATFORM! CONNECT ANY TOOL, AUTOMATE ANY PROCESS, AND MONITOR EVERYTHING IN REAL-TIME!"**
