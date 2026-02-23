/**
 * Logger Plugin
 * Logs workflow data with timestamps and configurable levels
 */

// Global log storage (accessible via API)
const logStorage = [];

/**
 * Execute Logger node
 * @param {Object} node - The node configuration
 * @param {Object} workflow - The workflow context
 * @param {Array} connections - Node connections
 * @param {Object} inputs - Input data
 * @returns {Object} Execution result
 */
async function executeLogger(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const level = config.level || 'info';
    const prefix = config.prefix || '';
    
    // Get input data
    const inputData = inputs.data !== undefined ? inputs.data : (config.defaultData || null);
    
    // Create timestamp
    const timestamp = new Date().toISOString();
    
    // Format log entry
    const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        prefix: prefix ? `[${prefix}]` : '',
        workflowId: workflow.id || 'unknown',
        nodeId: node.id || 'unknown',
        data: inputData,
        message: `${prefix ? `[${prefix}]` : ''}${JSON.stringify(inputData)}`
    };
    
    // Add to log storage
    logStorage.push(logEntry);
    
    // Keep only last 1000 entries to prevent memory issues
    if (logStorage.length > 1000) {
        logStorage.splice(0, logStorage.length - 1000);
    }
    
    // Log to console with appropriate level
    const logMessage = `[${timestamp}] ${logEntry.level} ${logEntry.prefix}${logEntry.message}`;
    switch (level) {
        case 'error':
            console.error(logMessage);
            break;
        case 'warn':
            console.warn(logMessage);
            break;
        case 'info':
        default:
            console.log(logMessage);
            break;
    }
    
    // Return passthrough output (same as input)
    return {
        output: inputData,
        logged: true,
        timestamp,
        level,
        entry: logEntry
    };
}

/**
 * Get log entries (for API access)
 * @param {Object} options - Query options
 * @returns {Array} Log entries
 */
function getLogs(options = {}) {
    const { level, limit = 100, workflowId, nodeId } = options;
    
    let filteredLogs = [...logStorage];
    
    // Apply filters
    if (level) {
        filteredLogs = filteredLogs.filter(log => log.level.toLowerCase() === level.toLowerCase());
    }
    
    if (workflowId) {
        filteredLogs = filteredLogs.filter(log => log.workflowId === workflowId);
    }
    
    if (nodeId) {
        filteredLogs = filteredLogs.filter(log => log.nodeId === nodeId);
    }
    
    // Return most recent entries
    return filteredLogs.slice(-limit);
}

/**
 * Clear log entries
 * @param {Object} options - Clear options
 */
function clearLogs(options = {}) {
    const { level, workflowId, nodeId } = options;
    
    if (!level && !workflowId && !nodeId) {
        // Clear all logs
        logStorage.length = 0;
        return;
    }
    
    // Filter out logs to remove
    const toRemove = logStorage.filter(log => {
        if (level && log.level.toLowerCase() !== level.toLowerCase()) return false;
        if (workflowId && log.workflowId !== workflowId) return false;
        if (nodeId && log.nodeId !== nodeId) return false;
        return true;
    });
    
    // Remove matching logs
    toRemove.forEach(logToRemove => {
        const index = logStorage.findIndex(log => 
            log.timestamp === logToRemove.timestamp && 
            log.nodeId === logToRemove.nodeId
        );
        if (index !== -1) {
            logStorage.splice(index, 1);
        }
    });
}

// Plugin exports
module.exports = {
    executeLogger,
    getLogs,
    clearLogs,
    logStorage // For testing purposes
};
