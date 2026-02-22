# Runtime Logger API Documentation

## Overview

The Runtime Logger provides a comprehensive REST API for managing visual workflows, monitoring execution, and integrating with Python agents.

## Base URL

```
http://localhost:3000
```

## Authentication

Currently no authentication is required (development mode).

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "timestamp": "2026-02-17T12:00:00.000Z"
  },
  "requestId": "req_1234567890_abc123"
}
```

## Endpoints

### Health Check

#### GET /health

Check the health status of the Runtime Logger service.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-17T12:00:00.000Z",
  "uptime": 3600.5,
  "memory": {
    "rss": 50331648,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  },
  "version": "1.0.0",
  "environment": "development",
  "services": {
    "database": "connected",
    "workflowEngine": "healthy",
    "pythonAgents": 2
  },
  "metrics": {
    "runningWorkflows": 1,
    "totalConnections": 5,
    "maxConcurrentWorkflows": 5
  }
}
```

### Workflow Management

#### POST /api/workflows/execute

Execute a visual workflow.

**Request Body:**
```json
{
  "nodes": [
    {
      "id": "node_1",
      "type": "Start",
      "category": "Control Flow",
      "x": 50,
      "y": 150,
      "inputs": [],
      "outputs": ["main"],
      "config": {}
    },
    {
      "id": "node_2",
      "type": "Execute Python",
      "category": "Python",
      "x": 200,
      "y": 150,
      "inputs": ["code", "args"],
      "outputs": ["result", "error"],
      "config": {
        "code": "print('Hello World!')\nresult = 42",
        "timeout": 30,
        "captureOutput": true
      }
    }
  ],
  "connections": [
    {
      "id": "connection_1",
      "from": { "nodeId": "node_1", "portIndex": 0 },
      "to": { "nodeId": "node_2", "portIndex": 0 }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "workflowId": "workflow_1708123456789_abc123",
  "message": "Workflow execution started"
}
```

**Error Responses:**
- `400` - Validation failed
- `500` - Server error

#### POST /api/workflows/:workflowId/stop

Stop a running workflow.

**Parameters:**
- `workflowId` (path) - ID of the workflow to stop

**Response:**
```json
{
  "success": true,
  "workflowId": "workflow_1708123456789_abc123",
  "message": "Workflow stopped successfully"
}
```

#### GET /api/workflows/:workflowId/status

Get the status of a specific workflow.

**Parameters:**
- `workflowId` (path) - ID of the workflow

**Response:**
```json
{
  "success": true,
  "workflow": {
    "id": "workflow_1708123456789_abc123",
    "status": "running",
    "startTime": "2026-02-17T12:00:00.000Z",
    "duration": 5000,
    "nodeCount": 3,
    "completedNodes": 1
  }
}
```

#### GET /api/workflows

Get all running workflows.

**Response:**
```json
{
  "success": true,
  "workflows": [
    {
      "id": "workflow_1708123456789_abc123",
      "status": "running",
      "startTime": "2026-02-17T12:00:00.000Z",
      "duration": 5000,
      "nodeCount": 3,
      "completedNodes": 1
    }
  ]
}
```

### Python Agent Management

#### POST /api/python-agents/connect

Connect a new Python agent.

**Request Body:**
```json
{
  "agentId": "python_agent_1",
  "config": {
    "timeout": 30000,
    "maxRetries": 3
  }
}
```

**Response:**
```json
{
  "success": true,
  "agentId": "python_agent_1",
  "message": "Python agent connected successfully"
}
```

#### POST /api/python-agents/:agentId/disconnect

Disconnect a Python agent.

**Parameters:**
- `agentId` (path) - ID of the agent to disconnect

**Response:**
```json
{
  "success": true,
  "agentId": "python_agent_1",
  "message": "Python agent disconnected successfully"
}
```

#### GET /api/python-agents

Get all connected Python agents.

**Response:**
```json
{
  "success": true,
  "agents": [
    {
      "id": "python_agent_1",
      "status": "connected",
      "connectedAt": "2026-02-17T12:00:00.000Z",
      "lastActivity": "2026-02-17T12:05:00.000Z"
    }
  ]
}
```

### Node Library Management

#### GET /api/nodes

Get all available node types.

**Response:**
```json
{
  "success": true,
  "nodes": [
    {
      "name": "Start",
      "category": "Control Flow",
      "description": "Start node for workflow execution",
      "inputs": [],
      "outputs": ["main"],
      "config": {}
    }
  ]
}
```

#### POST /api/nodes

Add a custom node type.

**Request Body:**
```json
{
  "name": "Custom Node",
  "category": "Custom",
  "description": "Custom node description",
  "inputs": ["input1"],
  "outputs": ["output1"],
  "config": {
    "customProperty": "value"
  }
}
```

#### DELETE /api/nodes/:nodeName

Remove a node type.

**Parameters:**
- `nodeName` (path) - Name of the node to remove

### Data Management

#### GET /api/applications

Get all registered applications.

**Response:**
```json
{
  "success": true,
  "applications": [
    {
      "id": "app_1",
      "name": "My Application",
      "createdAt": "2026-02-17T12:00:00.000Z"
    }
  ]
}
```

#### GET /api/applications/:appId/logs

Get execution logs for an application.

**Parameters:**
- `appId` (path) - ID of the application
- `limit` (query) - Maximum number of logs to return (default: 100)
- `offset` (query) - Number of logs to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "log_1",
      "appId": "app_1",
      "functionName": "my_function",
      "startTime": "2026-02-17T12:00:00.000Z",
      "endTime": "2026-02-17T12:00:01.000Z",
      "duration": 1000,
      "success": true,
      "parameters": "{\"arg1\": \"value1\"}",
      "returnValue": "{\"result\": \"success\"}"
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

## WebSocket Events

The Runtime Logger uses Socket.IO for real-time updates.

### Connection

```javascript
const socket = io('http://localhost:3000');
```

### Events

#### workflow_update

Emitted when workflow status changes.

```javascript
socket.on('workflow_update', (data) => {
  console.log('Workflow update:', data);
  // data: { workflowId, status, workflowData }
});
```

#### node_update

Emitted when a node execution status changes.

```javascript
socket.on('node_update', (data) => {
  console.log('Node update:', data);
  // data: { workflowId, nodeId, status, data }
});
```

#### notification

Emitted for system notifications.

```javascript
socket.on('notification', (data) => {
  console.log('Notification:', data);
  // data: { title, message, type }
});
```

#### python_data

Emitted when Python agent sends data.

```javascript
socket.on('python_data', (data) => {
  console.log('Python data:', data);
  // data: { agentId, type, payload }
});
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `WORKFLOW_ERROR` | Workflow execution failed |
| `PYTHON_AGENT_ERROR` | Python agent operation failed |
| `DATABASE_ERROR` | Database operation failed |
| `TIMEOUT` | Operation timed out |
| `CIRCUIT_BREAKER` | Circuit breaker is open |
| `MAX_RETRIES_EXCEEDED` | Maximum retry attempts exceeded |
| `NOT_FOUND` | Resource not found |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Access denied |
| `UNKNOWN_ERROR` | Unexpected error |

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Window**: 15 minutes
- **Max Requests**: 100 per window
- **Headers**: Rate limit headers are included in responses

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642465200
```

## Examples

### Execute a Simple Workflow

```javascript
const workflow = {
  nodes: [
    { id: 'start', type: 'Start', x: 50, y: 50, inputs: [], outputs: ['main'], config: {} },
    { id: 'python', type: 'Execute Python', x: 200, y: 50, inputs: ['code'], outputs: ['result'], config: { code: 'result = 2 + 2' } }
  ],
  connections: [
    { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'python', portIndex: 0 } }
  ]
};

fetch('/api/workflows/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(workflow)
})
.then(response => response.json())
.then(data => console.log(data));
```

### Monitor Workflow Execution

```javascript
const socket = io();

socket.on('workflow_update', (data) => {
  if (data.status === 'completed') {
    console.log('Workflow completed!');
  } else if (data.status === 'error') {
    console.error('Workflow failed:', data.workflowData.error);
  }
});

socket.on('node_update', (data) => {
  console.log(`Node ${data.nodeId} is ${data.status}`);
});
```

## SDK

JavaScript SDK coming soon!
