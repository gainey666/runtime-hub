const { performance } = require('perf_hooks');

// Performance Test Script for Phase 3A Part 4
async function measurePerformance() {
    console.log('🚀 Starting Performance Tests...\n');

    // Test 1: API Response Time
    console.log('📊 Test 1: API Response Time');
    const apiStart = performance.now();
    const response = await fetch('http://localhost:3000/api/workflows');
    const apiEnd = performance.now();
    const apiTime = apiEnd - apiStart;
    console.log(`   API Response Time: ${apiTime.toFixed(2)}ms`);
    console.log(`   Target: <20ms, Status: ${apiTime < 20 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Test 2: Workflow Execution Time (simulate 5-node workflow)
    console.log('📊 Test 2: Workflow Execution Time');
    const WorkflowEngine = require('./src/workflow-engine.js');
    const { EventEmitter } = require('events');
    
    const mockIo = new EventEmitter();
    const engine = new WorkflowEngine(mockIo, {
        workflow: {
            maxConcurrentWorkflows: 5,
            defaultTimeout: 60000,
            maxNodeExecutionTime: 5000,
            enableDebugLogging: false
        }
    });

    // Create a 5-node workflow
    const workflow = {
        id: 'perf-test',
        cancelled: false,
        nodes: [
            { id: 'start', type: 'Start', config: {} },
            { id: 'cond', type: 'Condition', config: { expression: 'true' } },
            { id: 'transform', type: 'Transform JSON', config: { operation: 'get', path: 'test' } },
            { id: 'delay', type: 'Wait', config: { duration: 1 } },
            { id: 'end', type: 'End', config: {} }
        ],
        connections: [
            { from: 'start', to: 'cond', fromPort: 'out', toPort: 'in' },
            { from: 'cond', to: 'transform', fromPort: 'true', toPort: 'in' },
            { from: 'transform', to: 'delay', fromPort: 'out', toPort: 'in' },
            { from: 'delay', to: 'end', fromPort: 'out', toPort: 'in' }
        ],
        io: mockIo,
        emitFn: (event, data) => {},
        context: {
            runId: 'perf-test',
            variables: {},
            values: {},
            assetsDir: './test'
        },
        executionState: new Map()
    };

    const workflowStart = performance.now();
    const result = await engine.executeWorkflow(workflow);
    const workflowEnd = performance.now();
    const workflowTime = workflowEnd - workflowStart;
    
    console.log(`   Workflow Execution Time: ${workflowTime.toFixed(2)}ms`);
    console.log(`   Target: <30ms, Status: ${workflowTime < 30 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Test 3: Node Adapter Performance
    console.log('📊 Test 3: Node Adapter Performance');
    const adapters = require('./src/engine/node-adapters.js');
    
    const node = {
        id: 'test',
        type: 'Condition',
        config: { expression: 'true' }
    };
    
    const adapterStart = performance.now();
    await adapters.executeCondition(node, workflow, []);
    const adapterEnd = performance.now();
    const adapterTime = adapterEnd - adapterStart;
    
    console.log(`   Node Adapter Time: ${adapterTime.toFixed(2)}ms`);
    console.log(`   Target: <5ms, Status: ${adapterTime < 5 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Test 4: Memory Usage
    console.log('📊 Test 4: Memory Usage');
    const memoryUsage = process.memoryUsage();
    const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
    
    console.log(`   Memory Usage: ${memoryMB.toFixed(2)}MB`);
    console.log(`   Target: <150MB, Status: ${memoryMB < 150 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Cleanup
    await engine.stop(workflow.id);

    // Summary
    console.log('📋 Performance Summary:');
    console.log(`   API Response Time: ${apiTime.toFixed(2)}ms ${apiTime < 20 ? '✅' : '❌'}`);
    console.log(`   Workflow Execution: ${workflowTime.toFixed(2)}ms ${workflowTime < 30 ? '✅' : '❌'}`);
    console.log(`   Node Adapter: ${adapterTime.toFixed(2)}ms ${adapterTime < 5 ? '✅' : '❌'}`);
    console.log(`   Memory Usage: ${memoryMB.toFixed(2)}MB ${memoryMB < 150 ? '✅' : '❌'}`);
    
    const allPassed = apiTime < 20 && workflowTime < 30 && adapterTime < 5 && memoryMB < 150;
    console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
}

measurePerformance().catch(console.error);
