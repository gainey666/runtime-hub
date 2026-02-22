/**
 * Test Database Setup
 * In-memory SQLite database for testing
 * Retro-fueled with 90s database simplicity
 */

const sqlite3 = require('sqlite3');
const path = require('path');

// Create in-memory database for testing
const testDb = new sqlite3.Database(':memory:');

// Initialize database schema
testDb.serialize(() => {
  // Applications table
  testDb.run(`CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Execution logs table
  testDb.run(`CREATE TABLE IF NOT EXISTS execution_logs (
    id TEXT PRIMARY KEY,
    app_id TEXT,
    function_name TEXT,
    start_time DATETIME,
    end_time DATETIME,
    duration INTEGER,
    success BOOLEAN,
    parameters TEXT,
    error_message TEXT,
    return_value TEXT
  )`);

  // Connections table
  testDb.run(`CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    app_id TEXT,
    source_node TEXT,
    target_node TEXT,
    connection_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Workflow history table
  testDb.run(`CREATE TABLE IF NOT EXISTS workflow_history (
    id TEXT PRIMARY KEY,
    status TEXT,
    duration INTEGER,
    node_count INTEGER,
    error TEXT,
    start_time DATETIME,
    end_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  console.log('🗄️ Test database initialized');
});

module.exports = testDb;
