/**
 * Global Test Setup
 * Retro-fueled with 90s testing rituals
 */

const testDb = require('./test-db');
const MockServer = require('./mock-server');

// Global test server instance
let mockServer = null;

// Jest global setup function
module.exports = async () => {
  console.log('🚀 Starting global test setup');
  
  // Start mock server
  mockServer = new MockServer();
  const port = mockServer.start();
  
  // Set global variables for tests
  global.testDb = testDb;
  global.mockServer = mockServer;
  global.testPort = port;
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
};