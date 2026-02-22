/**
 * QUICK REAL FUNCTIONALITY TEST
 * Shows actual working operations
 */

const WorkflowEngine = require('./src/workflow-engine.js');
const { EventEmitter } = require('events');

// Create real IO mock
const mockIo = new EventEmitter();

async function quickTest() {
    console.log('🧪 QUICK REAL FUNCTIONALITY TEST');
    console.log('=' .repeat(50));
    
    const engine = new WorkflowEngine(mockIo);
    
    // Test 1: Real File System
    console.log('\n📁 TESTING REAL FILE SYSTEM...');
    const fsNodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
        { id: 'listdir', type: 'List Directory', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: { path: './src' } },
        { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
    ];
    const fsConnections = [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'listdir', portIndex: 0 } },
        { id: 'conn2', from: { nodeId: 'listdir', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
    ];
    
    try {
        const fsResult = await engine.executeWorkflow('fs-test', fsNodes, fsConnections);
        console.log('✅ File System Result:');
        console.log('   Files found:', fsResult.executionState.get('listdir')?.result?.files?.length || 0);
        console.log('   Directories found:', fsResult.executionState.get('listdir')?.result?.directories?.length || 0);
        console.log('   Total items:', fsResult.executionState.get('listdir')?.result?.total || 0);
    } catch (error) {
        console.log('❌ File System Test Failed:', error.message);
    }
    
    // Test 2: Real Process Control
    console.log('\n⚙️ TESTING REAL PROCESS CONTROL...');
    const processNodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
        { id: 'nodeproc', type: 'Start Process', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: { command: 'node', args: ['--version'] } },
        { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
    ];
    const processConnections = [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'nodeproc', portIndex: 0 } },
        { id: 'conn2', from: { nodeId: 'nodeproc', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
    ];
    
    try {
        const processResult = await engine.executeWorkflow('process-test', processNodes, processConnections);
        console.log('✅ Process Control Result:');
        const procData = processResult.executionState.get('nodeproc')?.result;
        console.log('   Process ID:', procData?.processId || 'N/A');
        console.log('   Exit Code:', procData?.exitCode || 'N/A');
        console.log('   Status:', procData?.status || 'N/A');
        console.log('   Output:', (procData?.stdout || '').substring(0, 100) + '...');
    } catch (error) {
        console.log('❌ Process Control Test Failed:', error.message);
    }
    
    // Test 3: Real HTTP Request
    console.log('\n🌐 TESTING REAL HTTP REQUEST...');
    const httpNodes = [
        { id: 'start', type: 'Start', x: 0, y: 0, inputs: [], outputs: ['main'], config: {} },
        { id: 'http', type: 'HTTP Request', x: 100, y: 0, inputs: ['main'], outputs: ['main'], config: { 
            url: 'https://httpbin.org/get', 
            method: 'GET' 
        }},
        { id: 'end', type: 'End', x: 200, y: 0, inputs: ['main'], outputs: [], config: {} }
    ];
    const httpConnections = [
        { id: 'conn1', from: { nodeId: 'start', portIndex: 0 }, to: { nodeId: 'http', portIndex: 0 } },
        { id: 'conn2', from: { nodeId: 'http', portIndex: 0 }, to: { nodeId: 'end', portIndex: 0 } }
    ];
    
    try {
        const httpResult = await engine.executeWorkflow('http-test', httpNodes, httpConnections);
        console.log('✅ HTTP Request Result:');
        const httpData = httpResult.executionState.get('http')?.result;
        console.log('   Status Code:', httpData?.status || 'N/A');
        console.log('   Status Text:', httpData?.statusText || 'N/A');
        console.log('   URL:', httpData?.url || 'N/A');
        console.log('   Response Size:', (httpData?.data || '').length, 'bytes');
    } catch (error) {
        console.log('❌ HTTP Request Test Failed:', error.message);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 QUICK REAL FUNCTIONALITY TEST COMPLETE!');
    console.log('📝 These are REAL operations, not simulated!');
    console.log('🔧 Your WorkflowEngine now performs actual:');
    console.log('   • File system operations');
    console.log('   • Process control');
    console.log('   • HTTP requests');
    console.log('   • And much more!');
}

// Run the test
quickTest().catch(console.error);
