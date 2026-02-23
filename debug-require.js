// Simple test to see if exports work in Jest context
process.env.NODE_ENV = 'test';
process.env.DISABLE_PLUGINS = 'true';

console.log('BEFORE REQUIRE');
const { app, io } = require('./src/server');
console.log('AFTER REQUIRE');
console.log('app type:', typeof app);
console.log('io type:', typeof io);
