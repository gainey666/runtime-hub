# Testing Guide

## Overview

This guide covers the comprehensive testing infrastructure for the Runtime Logger project. We've built a retro-fueled testing system with 80s/90s tech vibes that ensures our code is bulletproof before it hits production.

## Testing Architecture

### Test Structure
```
tests/
├── unit/                    # Individual module tests
│   ├── config/              # Configuration system tests
│   ├── utils/                # Utility function tests
│   ├── workflow-engine/      # Workflow engine tests
│   └── server/               # Server API tests
├── integration/             # API and service integration tests
│   ├── api/                  # API endpoint tests
│   └── socket/               # Real-time communication tests
├── e2e/                     # End-to-end workflow tests
│   ├── workflow-execution.test.js
│   └── node-editor.test.js
├── security/               # Security and vulnerability tests
│   ├── input-validation.test.js
│   └── authentication.test.js
├── performance/            # Performance and load tests
│   ├── benchmarks.test.js
│   └── memory-leaks.test.js
├── fixtures/               # Test data and mocks
│   ├── sample-workflows.json
│   └── test-data.js
└── setup/                  # Test utilities and helpers
    ├── test-db.js          # In-memory database setup
    ├── mock-server.js      # Mock HTTP/Socket server
    ├── global-setup.js     # Global test setup
    └── global-teardown.js  # Global test cleanup
```

## Running Tests

### Prerequisites
- Node.js 16.0.0 or higher
- All dependencies installed: `npm install`

### Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:security      # Security tests only
npm run test:performance  # Performance tests only

# Watch mode for development
npm run test:watch

# Run tests with specific pattern
npm test -- --testNamePattern="workflow"
```

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:

```bash
# View coverage report
open coverage/lcov-report/index.html

# Coverage thresholds
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%
```

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual functions and modules in isolation.

**Examples**:
- Configuration validation
- Error handling utilities
- Workflow engine logic
- Validation helpers

**Running**: `npm run test:unit`

**Sample Test**:
```javascript
describe('Configuration System', () => {
  test('should validate port range', () => {
    expect(() => validatePort(70000)).toThrow('Invalid port');
    expect(validatePort(3000)).toBe(3000);
  });
});
```

### 2. Integration Tests

**Purpose**: Test how different modules work together.

**Examples**:
- API endpoints with real database
- Socket.IO communication
- Workflow execution with real services
- File operations

**Running**: `npm run test:integration`

**Sample Test**:
```javascript
describe('Workflow API Integration', () => {
  test('should execute complete workflow', async () => {
    const response = await request(app)
      .post('/api/workflows/execute')
      .send(workflowData);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### 3. End-to-End Tests

**Purpose**: Test complete user workflows.

**Examples**:
- Full workflow execution from start to finish
- Node editor UI interactions
- File import/export functionality
- Real-time updates

**Running**: `npm run test:e2e`

### 4. Security Tests

**Purpose**: Validate security measures and vulnerability prevention.

**Examples**:
- Input validation
- XSS protection
- SQL injection prevention
- File upload security
- Authentication/authorization

**Running**: `npm run test:security`

**Security Checks**:
```javascript
test('should reject XSS attempts', async () => {
  const maliciousData = { id: '<script>alert("xss")</script>' };
  const response = await request(app)
    .post('/api/workflows/execute')
    .send(maliciousData);
  
  expect(response.status).toBe(400);
  expect(response.body.error.code).toBe('SECURITY_VIOLATION');
});
```

### 5. Performance Tests

**Purpose**: Ensure performance standards are met.

**Examples**:
- Response time benchmarks
- Memory usage validation
- Concurrent user handling
- Database query performance

**Running**: `npm run test:performance`

## Test Environment Setup

### Database Tests
- Uses in-memory SQLite database
- Automatically creates schema for each test
- Isolated between test runs

### Mock Server
- HTTP server for API testing
- Socket.IO server for real-time testing
- Configurable ports and responses

### Global Setup
```javascript
// tests/setup/global-setup.js
beforeAll(async () => {
  // Start mock server
  // Initialize test database
  // Set up global variables
});

afterAll(async () => {
  // Stop mock server
  // Clean up test data
});
```

## Writing Tests

### Test Structure
```javascript
describe('Component/Feature Name', () => {
  // Setup before each test
  beforeEach(() => {
    // Initialize test data
  });

  // Cleanup after each test
  afterEach(() => {
    // Reset state
  });

  // Individual tests
  test('should do expected behavior', () => {
    // Test implementation
  });

  test('should handle edge cases', () => {
    // Edge case testing
  });
});
```

### Best Practices

1. **Descriptive Test Names**: Test names should clearly describe what's being tested
2. **Arrange-Act-Assert**: Structure tests in three parts
3. **Isolation**: Tests should not depend on each other
4. **Mock External Dependencies**: Use mocks for external services
5. **Test Error Cases**: Test both success and failure scenarios
6. **Use Test Helpers**: Reuse common test setup/teardown logic

### Example Test
```javascript
describe('Workflow Execution', () => {
  let mockWorkflowEngine;
  let testWorkflow;

  beforeEach(() => {
    mockWorkflowEngine = new MockWorkflowEngine();
    testWorkflow = {
      nodes: [
        { id: 'start', type: 'Start', x: 0, y: 0 },
        { id: 'end', type: 'End', x: 100, y: 0 }
      ],
      connections: [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
      ]
    };
  });

  test('should execute workflow successfully', async () => {
    // Arrange
    mockWorkflowEngine.executeWorkflow.mockResolvedValue({ status: 'completed' });

    // Act
    const result = await executeWorkflow('test_wf', testWorkflow.nodes, testWorkflow.connections);

    // Assert
    expect(result.status).toBe('completed');
    expect(mockWorkflowEngine.executeWorkflow).toHaveBeenCalledWith('test_wf', testWorkflow.nodes, testWorkflow.connections);
  });

  test('should handle workflow execution failure', async () => {
    // Arrange
    mockWorkflowEngine.executeWorkflow.mockRejectedValue(new Error('Execution failed'));

    // Act & Assert
    await expect(executeWorkflow('test_wf', testWorkflow.nodes, testWorkflow.connections))
      .rejects.toThrow('Execution failed');
  });
});
```

## Mock Strategy

### Database Mocks
```javascript
// tests/setup/test-db.js
const testDb = new sqlite3.Database(':memory');

// Initialize schema for each test
beforeEach(() => {
  testDb.run('DELETE FROM workflows');
  testDb.run('DELETE FROM nodes');
});
```

### Server Mocks
```javascript
// tests/setup/mock-server.js
class MockServer {
  start() {
    this.server = createServer(this.app);
    this.io = new Server(this.server);
    this.server.listen(0);
    return this.server.address().port;
  }
}
```

### Workflow Engine Mocks
```javascript
jest.mock('../../../src/workflow-engine');
const mockWorkflowEngine = {
  executeWorkflow: jest.fn(),
  stopWorkflow: jest.fn(),
  getMetrics: jest.fn()
};
```

## Continuous Integration

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

### Coverage Requirements
- Minimum 80% code coverage
- All critical paths covered
- Security tests must pass
- Performance tests must meet benchmarks

## Troubleshooting

### Common Issues

1. **Test Database Connection Errors**
   - Ensure test-db.js is properly initialized
   - Check if database schema is created

2. **Mock Server Port Conflicts**
   - Use port 0 for automatic port assignment
   - Clean up servers in teardown

3. **Test Timeout Issues**
   - Increase timeout in jest.config.js
   - Check for async/await usage

4. **Coverage Below Threshold**
   - Add tests for uncovered code paths
   - Check if tests are actually running

### Debugging Tests

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- tests/unit/config/index.test.js

# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Performance Benchmarks

### Response Time Targets
- API endpoints: < 200ms
- Database queries: < 100ms
- Workflow execution: < 5s for simple workflows

### Memory Usage Limits
- Test processes: < 512MB
- Database connections: < 10 per test
- Mock server memory: < 100MB

## Security Testing

### Automated Security Checks
- Input validation testing
- XSS prevention verification
- SQL injection protection
- File upload security
- Authentication/authorization testing

### Security Test Categories
1. **Input Validation**: All user inputs are validated
2. **Output Encoding**: Prevent XSS in responses
3. **Database Security**: Prevent SQL injection
4. **File Security**: Validate file uploads
5. **Access Control**: Test authentication/authorization

## Next Steps

1. **Add More Tests**: Increase coverage to 90%
2. **Performance Testing**: Add load testing scenarios
3. **Visual Testing**: Add screenshot comparison tests
4. **Accessibility Testing**: Add WCAG compliance tests
5. **Contract Testing**: Add API contract tests

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Node.js Testing Best Practices](https://github.com/goldberonyoni/nodebestpractices#testing)

---

**Remember**: In the 90s, we tested everything twice - once in development, once in production. With our retro-fueled testing infrastructure, you get the confidence of both phases in one go! 🎸
