/**
 * CommonJS Wrapper for TypeScript WorkflowEngine
 * Bridges the gap between TypeScript and CommonJS modules
 */

// For now, we'll use the JavaScript version directly
// Once TypeScript is compiled, we'll switch to: require('../dist/core/WorkflowEngine')

const WorkflowEngineJS = require('./workflow-engine');

module.exports = WorkflowEngineJS;
