/**
 * CommonJS Wrapper for TypeScript WorkflowEngine
 * Bridges the gap between TypeScript and CommonJS modules
 */

// Use the compiled TypeScript version
const WorkflowEngineTS = require('../dist/core/WorkflowEngine');

module.exports = WorkflowEngineTS;
