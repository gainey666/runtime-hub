#!/usr/bin/env node
/**
 * Comprehensive Test Script for Runtime Hub
 * Tests all major functionality
 */

const http = require('http');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// ========== TESTS ==========

test('Main server health check', async () => {
  const res = await makeRequest({ hostname: 'localhost', port: 3000, path: '/health' });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (res.body.status !== 'healthy') throw new Error('Server not healthy');
});

test('Auto-clicker API health check', async () => {
  const res = await makeRequest({ hostname: 'localhost', port: 3001, path: '/health' });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (res.body.status !== 'healthy') throw new Error('API not healthy');
});

test('Auto-clicker status endpoint', async () => {
  const res = await makeRequest({ hostname: 'localhost', port: 3001, path: '/api/auto-clicker/status' });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body.success) throw new Error('Status request failed');
});

test('Workflow execution endpoint', async () => {
  const workflow = {
    nodes: [
      { id: 'node_1', type: 'Start', x: 50, y: 200, inputs: [], outputs: [{ name: 'main', type: 'flow' }], config: {} }
    ],
    connections: []
  };

  const res = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/workflows/execute',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, workflow);

  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body.success) throw new Error('Workflow execution failed');
  if (!res.body.workflowId) throw new Error('No workflowId returned');
});

test('Auto-clicker start endpoint', async () => {
  const config = {
    interval: 1000,
    clickCount: 1,
    target: { x: 500, y: 500 }
  };

  const res = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auto-clicker/start',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, config);

  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body.success) throw new Error('Start failed');
  if (!res.body.sessionId) throw new Error('No sessionId returned');
});

test('Auto-clicker stop endpoint', async () => {
  const res = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auto-clicker/stop',
    method: 'POST'
  });

  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body.success) throw new Error('Stop failed');
});

test('Node editor page loads', async () => {
  const res = await makeRequest({ hostname: 'localhost', port: 3000, path: '/node-editor' });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (typeof res.body !== 'string') throw new Error('No HTML returned');
  if (!res.body.includes('Node Editor')) throw new Error('HTML doesnt contain Node Editor');
});

test('Auto-clicker test page loads', async () => {
  const res = await makeRequest({ hostname: 'localhost', port: 3000, path: '/auto-clicker-test.html' });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (typeof res.body !== 'string') throw new Error('No HTML returned');
});

test('Static files serve correctly', async () => {
  const res = await makeRequest({ hostname: 'localhost', port: 3000, path: '/node-library.js' });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
});

test('Error logger loads', async () => {
  const res = await makeRequest({ hostname: 'localhost', port: 3000, path: '/error-logger.js' });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
});

// ========== RUN TESTS ==========

async function runTests() {
  console.log('🧪 Runtime Hub - Comprehensive Test Suite');
  console.log('=' .repeat(50));
  console.log(`Running ${tests.length} tests...\n`);

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      console.log(`✅ ${name}`);
    } catch (error) {
      failed++;
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}\n`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
