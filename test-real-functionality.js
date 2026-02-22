/**
 * REAL FUNCTIONALITY TESTS - NO FAKE DATA!
 * Tests actual WorkflowEngine functionality with real operations
 */

const WorkflowEngine = require('./src/workflow-engine.js');
const { EventEmitter } = require('events');

// Create real IO mock for testing
const mockIo = new EventEmitter();

async function testRealHTTPRequests() {
    console.log('🌐 TESTING REAL HTTP REQUESTS...');
    
    const engine = new WorkflowEngine(mockIo);
    
    // Test with real HTTP endpoint
    const nodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
        { id: 'http', type: 'HTTP Request', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: {
            url: 'https://httpbin.org/get',
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        }},
        { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
    ];
    const connections = [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'http', portIndex: 0 } },
        { id: 'conn2', from: { nodeId: 'http', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
    ];

    try {
        const result = await engine.executeWorkflow('real-http-test', nodes, connections);
        console.log('✅ Real HTTP Test Result:', JSON.stringify(result, null, 2));
        return result.status === 'completed';
    } catch (error) {
        console.error('❌ Real HTTP Test Failed:', error.message);
        return false;
    }
}

async function testRealFileSystem() {
    console.log('📁 TESTING REAL FILE SYSTEM OPERATIONS...');
    
    const engine = new WorkflowEngine(mockIo);
    
    // Test with real file operations
    const nodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
        { id: 'listdir', type: 'List Directory', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: {
            path: './'
        }},
        { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
    ];
    const connections = [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'listdir', portIndex: 0 } },
        { id: 'conn2', from: { nodeId: 'listdir', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
    ];

    try {
        const result = await engine.executeWorkflow('real-fs-test', nodes, connections);
        console.log('✅ Real File System Test Result:', JSON.stringify(result, null, 2));
        return result.status === 'completed';
    } catch (error) {
        console.error('❌ Real File System Test Failed:', error.message);
        return false;
    }
}

async function testRealProcessControl() {
    console.log('⚙️ TESTING REAL PROCESS CONTROL...');
    
    const engine = new WorkflowEngine(mockIo);
    
    // Test with real process operations
    const nodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
        { id: 'process', type: 'Start Process', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: {
            command: 'node',
            args: ['--version']
        }},
        { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
    ];
    const connections = [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'process', portIndex: 0 } },
        { id: 'conn2', from: { nodeId: 'process', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
    ];

    try {
        const result = await engine.executeWorkflow('real-process-test', nodes, connections);
        console.log('✅ Real Process Control Test Result:', JSON.stringify(result, null, 2));
        return result.status === 'completed';
    } catch (error) {
        console.error('❌ Real Process Control Test Failed:', error.message);
        return false;
    }
}

async function testRealDataProcessing() {
    console.log('🔧 TESTING REAL DATA PROCESSING...');
    
    const engine = new WorkflowEngine(mockIo);
    
    // Test with real data operations
    const nodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
        { id: 'condition', type: 'Condition', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: {
            condition: 'test',
            operator: 'equals',
            value: 'test'
        }},
        { id: 'encrypt', type: 'Encrypt Data', x: 200, y: 0, inputs: ['main'], outputs: ['main'], config: {
            data: 'real secret data',
            algorithm: 'AES-256'
        }},
        { id: 'end', type: 'End', x: 300, y: 0, inputs: ['main'], outputs: [], config: {} }
    ];
    const connections = [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'condition', portIndex: 0 } },
        { id: 'conn2', from: { nodeId: 'condition', portIndex: 0 }, to: { nodeId: 'encrypt', portIndex: 0 } },
        { id: 'conn3', from: { nodeId: 'encrypt', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
    ];

    try {
        const result = await engine.executeWorkflow('real-data-test', nodes, connections);
        console.log('✅ Real Data Processing Test Result:', JSON.stringify(result, null, 2));
        return result.status === 'completed';
    } catch (error) {
        console.error('❌ Real Data Processing Test Failed:', error.message);
        return false;
    }
}

async function testRealConcurrency() {
    console.log('🚀 TESTING REAL CONCURRENCY CONTROL...');
    
    const engine = new WorkflowEngine(mockIo);
    
    // Test multiple concurrent workflows
    const nodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
        { id: 'delay', type: 'Delay', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: {
            duration: 2000,
            unit: 'ms'
        }},
        { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
    ];
    const connections = [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'delay', portIndex: 0 } },
        { id: 'conn2', from: { nodeId: 'delay', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
    ];

    try {
        // Start multiple workflows concurrently
        const workflows = [];
        for (let i = 0; i < 3; i++) {
            workflows.push(engine.executeWorkflow(`concurrent-test-${i}`, nodes, connections));
        }
        
        // Try to start one more (should fail due to concurrency limit)
        const overflowResult = await engine.executeWorkflow('overflow-test', nodes, connections);
        
        console.log('✅ Real Concurrency Test - Overflow Result:', JSON.stringify(overflowResult, null, 2));
        
        // Wait for workflows to complete
        const results = await Promise.all(workflows);
        
        console.log('✅ Real Concurrency Test Results:', results.map(r => ({ id: r.id, status: r.status })));
        
        return overflowResult.status === 'error' && results.every(r => r.status === 'completed');
    } catch (error) {
        console.error('❌ Real Concurrency Test Failed:', error.message);
        return false;
    }
}

async function testRealErrorHandling() {
    console.log('⚠️ TESTING REAL ERROR HANDLING...');
    
    const engine = new WorkflowEngine(mockIo);
    
    // Test with invalid configuration (should fail gracefully)
    const nodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
        { id: 'unknown', type: 'UnknownNode', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: {} },
        { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
    ];
    const connections = [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'unknown', portIndex: 0 } },
        { id: 'conn2', from: { nodeId: 'unknown', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
    ];

    try {
        const result = await engine.executeWorkflow('error-test', nodes, connections);
        console.log('✅ Real Error Handling Test Result:', JSON.stringify(result, null, 2));
        return result.status === 'error' && result.error.includes('Unknown node type');
    } catch (error) {
        console.error('❌ Real Error Handling Test Failed:', error.message);
        return false;
    }
}

// Main test runner
async function runRealTests() {
    console.log('🧪 STARTING REAL FUNCTIONALITY TESTS - NO FAKE DATA!');
    console.log('=' .repeat(60));
    
    const tests = [
        { name: 'HTTP Requests', fn: testRealHTTPRequests },
        { name: 'File System', fn: testRealFileSystem },
        { name: 'Process Control', fn: testRealProcessControl },
        { name: 'Data Processing', fn: testRealDataProcessing },
        { name: 'Concurrency Control', fn: testRealConcurrency },
        { name: 'Error Handling', fn: testRealErrorHandling }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        console.log(`\n🔍 Running: ${test.name}`);
        try {
            const result = await test.fn();
            if (result) {
                console.log(`✅ ${test.name}: PASSED`);
                passed++;
            } else {
                console.log(`❌ ${test.name}: FAILED`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${test.name}: ERROR - ${error.message}`);
            failed++;
        }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log(`📊 FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`🎯 SUCCESS RATE: ${Math.round((passed / tests.length) * 100)}%`);
    
    if (failed === 0) {
        console.log('🎉 ALL REAL FUNCTIONALITY TESTS PASSED!');
    } else {
        console.log('⚠️ SOME TESTS FAILED - CHECK IMPLEMENTATION');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runRealTests().catch(console.error);
}

module.exports = {
    runRealTests,
    testRealHTTPRequests,
    testRealFileSystem,
    testRealProcessControl,
    testRealDataProcessing,
    testRealConcurrency,
    testRealErrorHandling
};
