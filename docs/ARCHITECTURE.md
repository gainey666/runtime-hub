# Runtime Hub - Architecture Documentation

> *In a world where workflows run wild... one system brings order to the chaos.*

## Overview

Runtime Hub is a production-grade workflow execution engine built with TypeScript, designed for scalability, reliability, and developer experience. This document outlines the architectural decisions, patterns, and principles that guide the system.

## Auto-Clicker Architecture

### System Overview

The auto-clicker system is a modular, event-driven architecture that enables automated screen capture, OCR processing, and mouse clicking based on configurable conditions.

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Auto-Clicker System                        │
├─────────────────────────────────────────────────────────────┤
│  API Server (Port 3001)                                      │
│  ├── Health Endpoints                                        │
│  ├── Session Management                                       │
│  └── Real-time Events                                        │
├─────────────────────────────────────────────────────────────┤
│  Auto-Clicker Engine (JavaScript)                           │
│  ├── Session Management                                       │
│  ├── Event Emission                                          │
│  └── Workflow Orchestration                                   │
├─────────────────────────────────────────────────────────────┤
│  Core Modules (CommonJS)                                     │
│  ├── Screen Capture (PowerShell/Python)                      │
│  ├── OCR Engine (Simple/Regex)                                │
│  └── Mouse Control (PowerShell Win32)                         │
└─────────────────────────────────────────────────────────────┘
```

### Module System Architecture

#### **JavaScript Conversion Strategy**
- **Original**: TypeScript modules (.ts) with ES6 imports/exports
- **Converted**: CommonJS modules (.js) with module.exports
- **Reasoning**: Node.js runtime compatibility and simpler dependency management

#### **Module Dependencies**
```javascript
// Auto-Clicker Engine
const { WindowsScreenCapture } = require('./screen-capture/windows-capture');
const { OCREngine } = require('./screen-capture/ocr-engine');
const { MouseControl } = require('./click-automation/mouse-control');
```

### Cross-Project Communication

#### **API Integration**
```
Main Server (Port 3000) ←→ Auto-Clicker API (Port 3001)
     ↓                           ↓
  Node Editor              Auto-Clicker Engine
  Dashboard UI              Real-time Events
```

#### **Event Flow**
1. **User Action** → Main Server → API Server → Auto-Clicker Engine
2. **Auto-Clicker Events** → Socket.IO → Real-time UI Updates
3. **Session Management** → HTTP API → Status Updates

### Workflow Execution

#### **Core Workflow: Screen Capture → OCR → Number Check → Click**
```javascript
async function executeWorkflow(config) {
  // 1. Screen Capture
  const captureResult = await screenCapture.capture(config.area);
  
  // 2. OCR Processing
  const ocrResult = await ocrEngine.recognize(captureResult.imageData, config.ocr);
  
  // 3. Number Check (> 42)
  const numbers = ocrResult.text.match(/\d+/g);
  const hasValidNumber = numbers.some(n => parseInt(n) > 42);
  
  // 4. Mouse Click (if condition met)
  if (hasValidNumber) {
    await mouseControl.click(config.click);
  }
}
```

### Real-time Monitoring

#### **Event System**
```javascript
// Event Types
- session_started
- session_stopped
- screen_captured
- ocr_completed
- number_detected
- click_executed
- error_occurred
```

#### **UI Integration**
- **WebSocket Connection**: Socket.IO client in React components
- **Event Display**: Real-time event stream in monitoring dashboard
- **Status Indicators**: Color-coded session status
- **Performance Metrics**: Click count, timing, success rate

### Error Handling & Recovery

#### **Error Categories**
1. **Screen Capture Failures**: PowerShell/Python fallbacks
2. **OCR Errors**: Pattern matching fallbacks
3. **Mouse Control Issues**: Retry mechanisms
4. **Session Management**: Graceful degradation

#### **Recovery Strategies**
```javascript
// Fallback Chain
try {
  await primaryMethod();
} catch (error) {
  try {
    await fallbackMethod();
  } catch (fallbackError) {
    await simpleFallback();
  }
}
```

## Core Architecture

### System Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    Runtime Hub System                       │
├─────────────────────────────────────────────────────────────┤
│  API Layer (REST + Socket.IO)                              │
│  ├── Express Routes                                         │
│  ├── Socket.IO Handlers                                     │
│  └── Middleware Stack                                       │
├─────────────────────────────────────────────────────────────┤
│  Core Execution Engine                                      │
│  ├── WorkflowEngine                                         │
│  ├── Node Executors                                         │
│  └── Event System                                           │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── SQLite (Primary)                                      │
│  ├── Redis (Caching/PubSub)                                 │
│  └── In-Memory State                                        │
├─────────────────────────────────────────────────────────────┤
│  Configuration & Utilities                                  │
│  ├── Environment Config                                     │
│  ├── Error Handling                                         │
│  └── Monitoring                                             │
└─────────────────────────────────────────────────────────────┘
```

### Module Structure

```
src/
├── types/              # Shared TypeScript interfaces
│   └── index.ts       # Core type definitions
├── core/              # Business logic engines
│   └── WorkflowEngine.ts
├── api/               # REST/Socket handlers
├── config/            # Environment & settings
├── utils/             # Pure utilities
├── middleware/        # Express middleware
├── ui/                # User Interface Layer
│   ├── components/    # React components
│   │   ├── NodeEditor/
│   │   ├── Workflow/
│   │   └── Common/
│   ├── web/           # Web applications
│   ├── hooks/         # Custom React hooks
│   ├── stores/        # State management
│   ├── services/      # API services
│   ├── types/         # UI-specific types
│   └── utils/         # UI utilities
└── tests/             # Test suites
└── server.ts          # Application entry point
```

## Design Principles

### 1. Type Safety First

All code is written in strict TypeScript with:
- No `any` types allowed
- Explicit interfaces for all data structures
- Compile-time error checking
- Null safety throughout

### 2. Event-Driven Architecture

The system uses an event-driven pattern for loose coupling:

```typescript
interface WorkflowEvent {
  type: 'node_start' | 'node_complete' | 'workflow_start' | 'workflow_complete';
  data: any;
  timestamp: Date;
}
```

### 3. Separation of Concerns

- **Types**: Pure interface definitions
- **Core**: Business logic without external dependencies
- **API**: HTTP and WebSocket handling
- **Utils**: Pure utility functions

### 4. Scalability Patterns

- **Queue Management**: Workflows queued when concurrency limits reached
- **Resource Pooling**: Database connections managed efficiently
- **Horizontal Scaling**: Redis adapter for multi-instance deployment

## Core Components

### WorkflowEngine

The heart of the system, responsible for:
- Workflow execution lifecycle
- Node execution orchestration
- Error handling and recovery
- Metrics collection
- Event emission

**Key Features:**
- Concurrent workflow execution with configurable limits
- Cancellation support with kill switch
- Comprehensive error handling
- Performance metrics tracking
- Event-driven updates

### Type System

Comprehensive TypeScript interfaces for:
- Workflow definitions
- Node configurations
- API responses
- Error types
- Performance metrics

### Node Executors

Modular execution system supporting:
- Process execution
- Python script execution
- API calls
- Database operations
- Data transformation
- Conditional logic
- Delay operations
- File operations
- Email sending
- Webhook calls

## Data Flow

### Workflow Execution Flow

```
1. Workflow Submission
   ↓
2. Validation & Queuing
   ↓
3. Sequential Node Execution
   ↓
4. Event Emission
   ↓
5. Result Broadcasting
   ↓
6. History & Metrics Update
```

### Error Handling Flow

```
Error Occurrence
   ↓
WorkflowError Creation
   ↓
Event Emission (error)
   ↓
Workflow Status Update (failed)
   ↓
Metrics Update
   ↓
Broadcast to Clients
```

## Configuration

### Environment-Based Configuration

```typescript
interface WorkflowConfig {
  workflow: {
    maxConcurrentWorkflows: number;
    maxNodeExecutionTime: number;
    enableDebugLogging: boolean;
  };
  pythonAgent: {
    timeout: number;
    maxRetries: number;
  };
}
```

### Feature Flags

- Debug logging
- Performance monitoring
- Error tracking
- Metrics collection

## Security Considerations

### Input Validation

- All workflow configurations validated
- Node execution parameters sanitized
- SQL injection prevention
- Path traversal protection

### Resource Limits

- Execution timeouts
- Memory usage monitoring
- Concurrent execution limits
- File size restrictions

### Error Information

- Sanitized error messages
- No stack traces in production
- Limited system information exposure

## Performance Optimization

### Concurrency Management

- Configurable workflow limits
- Queue-based overflow handling
- Resource pooling
- Graceful degradation

### Memory Management

- Automatic history cleanup
- Metrics aggregation
- Event listener cleanup
- Connection pooling

### Caching Strategy

- Redis for distributed caching
- In-memory for hot data
- TTL-based expiration
- Cache invalidation

## Monitoring & Observability

### Metrics Collection

- Workflow execution counts
- Success/failure rates
- Average execution times
- Node execution counts
- Error type distribution

### Event Logging

- Structured event emission
- Correlation IDs
- Timestamp tracking
- Performance metrics

### Health Checks

- Database connectivity
- Redis availability
- Socket.IO status
- System resources

## Deployment Architecture

### Single Instance

```
Client → Load Balancer → Runtime Hub Instance
                              ├── SQLite
                              └── Redis (optional)
```

### Multi-Instance

```
Client → Load Balancer → Runtime Hub Instances
                              ├── Shared Database
                              └── Redis Cluster
```

## Development Workflow

### Type-First Development

1. Define interfaces in `types/`
2. Implement core logic in `core/`
3. Add API layer
4. Write comprehensive tests
5. Documentation updates

### Testing Strategy

- Unit tests for core logic
- Integration tests for APIs
- End-to-end workflow tests
- Performance benchmarks
- Error scenario testing

## Future Enhancements

### Planned Features

- Visual workflow designer
- Advanced node types
- Workflow templates
- Version control
- A/B testing
- Advanced monitoring

### Scalability Improvements

- Microservice decomposition
- Event sourcing
- CQRS pattern
- Distributed tracing
- Auto-scaling

## Conclusion

Runtime Hub represents a production-ready approach to workflow execution, combining the reliability of TypeScript with the flexibility of event-driven architecture. The modular design ensures maintainability while the comprehensive type system provides compile-time safety.

The system is built to scale from single-instance deployments to distributed clusters, maintaining performance and reliability throughout.

---

*"In the end, it's not about the code we write. It's about the workflows we enable and the problems we solve."*
