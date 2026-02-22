/**
 * Global Test Teardown
 * Retro-fueled with 90s cleanup rituals
 */

// Jest global teardown function
module.exports = async () => {
  console.log('🛑 Stopping global test setup');
  
  // Stop mock server
  if (global.mockServer) {
    global.mockServer.stop();
    global.mockServer = null;
  }
  
  // Clean up globals
  global.testDb = null;
  global.testPort = null;
  
  // Clean up any remaining test artifacts
  const fs = require('fs');
  const path = require('path');
  
  // Clean up temporary directory
  const tempDir = path.join(__dirname, '..', 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('🗑️ Cleaned temporary directory');
  }
  
  // Clean up coverage reports
  const coverageDir = path.join(__dirname, '..', 'coverage');
  if (fs.existsSync(coverageDir)) {
    const files = fs.readdirSync(coverageDir);
    files.forEach(file => {
      if (file.endsWith('.lcov')) {
        fs.unlinkSync(path.join(coverageDir, file));
      }
    });
    console.log('📊 Cleaned coverage reports');
  }
  
  console.log('🧹 Global test teardown complete');
};