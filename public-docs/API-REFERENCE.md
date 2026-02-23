# Runtime Hub API Reference

This document describes all REST API endpoints available in Runtime Hub.

## Base URL

```
http://localhost:3000
```

## Authentication

Currently, no authentication is required for API endpoints.

## Response Format

All endpoints return JSON responses with the following structure:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## Endpoints

### Health Check

#### GET /health

Check if the server is running and healthy.

**Description:** Returns server health status and metrics

**Request:** None

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-23T06:17:24.645Z",
  "uptime": 155.7773398,
  "memory": {
    "rss": 65384448,
    "heapTotal": 12820480,
    "heapUsed": 10908936,
    "external": 2446808,
    "arrayBuffers": 23851
  },
  "version": "1.0.0",
  "environment": "test",
  "services": {
    "database": "connected",
    "workflowEngine": "healthy",
    "pythonAgents": "unknown"
  },
  "metrics": {
    "runningWorkflows": 0,
    "maxConcurrentWorkflows": 5
  }
}
```

**Error Responses:**
- `500 Internal Server Error` - Server error

---

### Workflow Management

#### GET /api/workflows

Get all currently running workflows.

**Description:** Returns list of active workflows with their status

**Request:** None

**Response:**
```json
[
  {
    "id": "workflow-123",
    "status": "running",
    "startTime": "2026-02-23T06:15:00.000Z",
    "endTime": null,
    "duration": 120.5,
    "nodeCount": 5,
    "completedNodes": 3,
    "progress": 60
  }
]
```

**Error Responses:**
- `500 Internal Server Error` - Failed to retrieve workflows

---

#### POST /api/workflows/execute

Execute a workflow.

**Description:** Starts execution of a new workflow

**Request Body:**
```json
{
  "nodes": [
    {
      "id": "start-1",
      "type": "Start",
      "position": { "x": 100, "y": 100 },
      "config": {
        "workflowName": "Test Workflow",
        "description": "A test workflow"
      }
    },
    {
      "id": "end-1",
      "type": "End",
      "position": { "x": 300, "y": 100 },
      "config": {
        "exitCode": 0,
        "message": "Workflow completed"
      }
    }
  ],
  "connections": [
    {
      "source": "start-1",
      "target": "end-1",
      "sourcePort": "main",
      "targetPort": "main"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "workflowId": "workflow-123",
  "status": "running",
  "message": "Workflow started successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request body
- `500 Internal Server Error` - Failed to start workflow

---

#### POST /api/workflows/:workflowId/stop

Stop a running workflow.

**Description:** Stops execution of the specified workflow

**URL Parameters:**
- `workflowId` (string, required) - ID of the workflow to stop

**Request:** None

**Response:**
```json
{
  "success": true,
  "message": "Workflow stopped successfully"
}
```

**Error Responses:**
- `404 Not Found` - Workflow not found
- `500 Internal Server Error` - Failed to stop workflow

---

#### GET /api/workflows/:workflowId/status

Get status of a specific workflow.

**Description:** Returns detailed status and progress of a workflow

**URL Parameters:**
- `workflowId` (string, required) - ID of the workflow

**Request:** None

**Response:**
```json
{
  "success": true,
  "workflow": {
    "id": "workflow-123",
    "status": "running",
    "startTime": "2026-02-23T06:15:00.000Z",
    "endTime": null,
    "duration": 120.5,
    "nodeCount": 5,
    "completedNodes": 3,
    "progress": 60,
    "currentNode": "node-4",
    "logs": [
      {
        "timestamp": "2026-02-23T06:15:05.000Z",
        "level": "info",
        "message": "Node Start executed successfully"
      }
    ]
  }
}
```

**Error Responses:**
- `404 Not Found` - Workflow not found
- `500 Internal Server Error` - Failed to get workflow status

---

### Application Management

#### GET /api/applications

Get all applications.

**Description:** Returns list of all applications in the database

**Request:** None

**Response:**
```json
[
  {
    "id": 1,
    "name": "Test Application",
    "description": "A test application",
    "created_at": "2026-02-23T06:15:00.000Z",
    "updated_at": "2026-02-23T06:15:00.000Z"
  }
]
```

**Error Responses:**
- `500 Internal Server Error` - Database error

---

#### GET /api/applications/:appId/logs

Get logs for a specific application.

**Description:** Returns execution logs for the specified application

**URL Parameters:**
- `appId` (string, required) - ID of the application

**Request:** None

**Response:**
```json
[
  {
    "id": 1,
    "app_id": 1,
    "timestamp": "2026-02-23T06:15:00.000Z",
    "level": "info",
    "message": "Application started",
    "data": {}
  }
]
```

**Error Responses:**
- `404 Not Found` - Application not found
- `500 Internal Server Error` - Database error

---

#### GET /api/applications/:appId/nodes

Get nodes for a specific application.

**Description:** Returns node definitions for the specified application

**URL Parameters:**
- `appId` (string, required) - ID of the application

**Request:** None

**Response:**
```json
[
  {
    "id": 1,
    "app_id": 1,
    "node_type": "Start",
    "node_config": {
      "workflowName": "Test Workflow"
    },
    "position": { "x": 100, "y": 100 },
    "created_at": "2026-02-23T06:15:00.000Z"
  }
]
```

**Error Responses:**
- `404 Not Found` - Application not found
- `500 Internal Server Error` - Database error

---

### Export Endpoints

#### POST /api/workflows/export-llm

Export workflow data for LLM processing.

**Description:** Exports workflow data in a format suitable for LLM analysis

**Request Body:**
```json
{
  "prompt": "Analyze this workflow",
  "timestamp": "2026-02-23T06:15:00.000Z",
  "nodeCount": 5,
  "connectionCount": 4
}
```

**Response:**
```json
{
  "success": true,
  "exportId": "export-123",
  "message": "Workflow exported successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request body
- `500 Internal Server Error` - Export failed

---

#### POST /api/logs/export

Export logs data.

**Description:** Exports execution logs to a file

**Request Body:**
```json
{
  "logs": [
    {
      "timestamp": "2026-02-23T06:15:00.000Z",
      "level": "info",
      "message": "Workflow started"
    }
  ],
  "timestamp": "2026-02-23T06:15:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "exportId": "logs-123",
  "message": "Logs exported successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request body
- `500 Internal Server Error` - Export failed

---

#### POST /api/logs/debug

Export debug data.

**Description:** Exports debug information for troubleshooting

**Request Body:**
```json
{
  "debugData": {
    "workflowId": "workflow-123",
    "error": "Node execution failed",
    "stackTrace": "Error: Node execution failed\n    at executeNode ..."
  },
  "timestamp": "2026-02-23T06:15:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "exportId": "debug-123",
  "message": "Debug data exported successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request body
- `500 Internal Server Error` - Export failed

---

### Static Content

#### GET /

Serve the enhanced dashboard.

**Description:** Returns the main dashboard HTML page

**Request:** None

**Response:** HTML dashboard page

---

#### GET /node-editor

Serve the node editor.

**Description:** Returns the node editor HTML page

**Request:** None

**Response:** HTML node editor page

---

## Data Types

### Common Data Types

#### Node Position
```json
{
  "x": 100,
  "y": 200
}
```

#### Node Configuration
```json
{
  "setting1": "value1",
  "setting2": 42,
  "setting3": true
}
```

#### Connection
```json
{
  "source": "node-1",
  "target": "node-2",
  "sourcePort": "output",
  "targetPort": "input"
}
```

#### Log Entry
```json
{
  "timestamp": "2026-02-23T06:15:00.000Z",
  "level": "info|warn|error",
  "message": "Log message",
  "data": {}
}
```

### Workflow Status Values

- `running` - Workflow is currently executing
- `completed` - Workflow finished successfully
- `failed` - Workflow failed with an error
- `stopped` - Workflow was stopped by user
- `paused` - Workflow is paused

### Log Levels

- `info` - Informational messages
- `warn` - Warning messages
- `error` - Error messages
- `debug` - Debug messages

## Error Handling

### HTTP Status Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `WORKFLOW_NOT_FOUND` - Workflow ID not found
- `EXECUTION_FAILED` - Workflow execution failed
- `DATABASE_ERROR` - Database operation failed
- `PLUGIN_ERROR` - Plugin execution failed

## Rate Limiting

Currently, no rate limiting is implemented.

## WebSocket API

Runtime Hub also provides WebSocket connections for real-time updates:

### Connection

```
ws://localhost:3000
```

### Events

#### workflow_started
```json
{
  "type": "workflow_started",
  "data": {
    "workflowId": "workflow-123",
    "timestamp": "2026-02-23T06:15:00.000Z"
  }
}
```

#### workflow_completed
```json
{
  "type": "workflow_completed",
  "data": {
    "workflowId": "workflow-123",
    "timestamp": "2026-02-23T06:15:30.000Z",
    "duration": 30.5
  }
}
```

#### node_executed
```json
{
  "type": "node_executed",
  "data": {
    "workflowId": "workflow-123",
    "nodeId": "node-1",
    "timestamp": "2026-02-23T06:15:05.000Z",
    "result": {}
  }
}
```

#### log_entry
```json
{
  "type": "log_entry",
  "data": {
    "timestamp": "2026-02-23T06:15:00.000Z",
    "level": "info",
    "message": "Workflow started",
    "source": "WorkflowEngine"
  }
}
```

## Examples

### Execute a Simple Workflow

```bash
curl -X POST http://localhost:3000/api/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {
        "id": "start-1",
        "type": "Start",
        "position": { "x": 100, "y": 100 },
        "config": { "workflowName": "Test" }
      },
      {
        "id": "end-1",
        "type": "End",
        "position": { "x": 300, "y": 100 },
        "config": { "exitCode": 0 }
      }
    ],
    "connections": [
      {
        "source": "start-1",
        "target": "end-1",
        "sourcePort": "main",
        "targetPort": "main"
      }
    ]
  }'
```

### Get Workflow Status

```bash
curl http://localhost:3000/api/workflows/workflow-123/status
```

### Stop a Workflow

```bash
curl -X POST http://localhost:3000/api/workflows/workflow-123/stop
```

### Check Server Health

```bash
curl http://localhost:3000/health
```

## Versioning

API versioning follows semantic versioning:

- Current version: `v1`
- Breaking changes will increment the major version
- New endpoints will increment the minor version
- Bug fixes will increment the patch version

## Support

For API support:

1. **Check this documentation** for endpoint details
2. **Review error messages** for troubleshooting
3. **Check server logs** for additional context
4. **Test with curl** or Postman for debugging
5. **Create an issue** for API-related problems

## Changelog

### v1.0.0
- Initial API release
- Basic workflow management endpoints
- Health check endpoint
- Export endpoints
- Application management endpoints
- WebSocket support for real-time updates
