// Global teardown for Jest tests
// Ensures all database connections are properly closed

module.exports = async () => {
  // Close database connections if they exist
  try {
    const { closeDB } = require('../src/db');
    if (typeof closeDB === 'function') {
      await closeDB();
    }
  } catch (error) {
    console.warn('Warning: Could not close database connection:', error.message);
  }
  
  // Close any other resources here
  console.log('🧹 Global test teardown complete');
};
