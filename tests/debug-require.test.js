// Simple test to see if exports work in Jest context
process.env.NODE_ENV = 'test';
process.env.DISABLE_PLUGINS = 'true';

describe('Debug Exports', () => {
  test('should export app and io correctly', () => {
    console.log('BEFORE WORKFLOW ENGINE');
    const WorkflowEngine = require('../src/workflow-engine-wrapper');
    console.log('WORKFLOW ENGINE TYPE:', typeof WorkflowEngine);
    
    console.log('BEFORE REQUIRE');
    const { app, io } = require('../src/server');
    console.log('AFTER REQUIRE');
    console.log('app type:', typeof app);
    console.log('io type:', typeof io);
    
    expect(typeof app).toBe('function');
    expect(typeof io).toBe('object');
  });
});
