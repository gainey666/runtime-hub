/**
 * Data Transform Plugin
 * Transforms string and number data with various operations
 */

/**
 * Execute Data Transform node
 * @param {Object} node - The node configuration
 * @param {Object} workflow - The workflow context
 * @param {Array} connections - Node connections
 * @param {Object} inputs - Input data
 * @returns {Object} Execution result
 */
async function executeDataTransform(node, workflow, connections, inputs = {}) {
    const config = node.config || {};
    const operation = config.operation || 'uppercase';
    const defaultValue = config.defaultValue || '';
    
    // Get input data
    let inputData = inputs.input !== undefined ? inputs.input : (config.defaultInput || '');
    
    // Handle empty input with default value
    if (inputData === '' || inputData === null || inputData === undefined) {
        inputData = defaultValue;
    }
    
    let result;
    let error = null;
    
    try {
        switch (operation) {
            case 'uppercase':
                if (typeof inputData !== 'string') {
                    inputData = String(inputData);
                }
                result = inputData.toUpperCase();
                break;
                
            case 'lowercase':
                if (typeof inputData !== 'string') {
                    inputData = String(inputData);
                }
                result = inputData.toLowerCase();
                break;
                
            case 'trim':
                if (typeof inputData !== 'string') {
                    inputData = String(inputData);
                }
                result = inputData.trim();
                break;
                
            case 'parse-as-number':
                if (typeof inputData === 'number') {
                    result = inputData;
                } else if (typeof inputData === 'string') {
                    const parsed = parseFloat(inputData);
                    if (isNaN(parsed)) {
                        throw new Error(`Cannot parse "${inputData}" as number`);
                    }
                    result = parsed;
                } else {
                    throw new Error(`Cannot parse ${typeof inputData} as number`);
                }
                break;
                
            case 'parse-as-json':
                if (typeof inputData === 'object' && inputData !== null) {
                    result = inputData;
                } else if (typeof inputData === 'string') {
                    try {
                        result = JSON.parse(inputData);
                    } catch (parseError) {
                        throw new Error(`Invalid JSON: ${parseError.message}`);
                    }
                } else {
                    throw new Error(`Cannot parse ${typeof inputData} as JSON`);
                }
                break;
                
            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
        
        return {
            output: result,
            operation,
            original: inputData,
            success: true
        };
        
    } catch (err) {
        error = {
            error: err.message,
            original: inputData,
            operation,
            success: false
        };
        
        return error;
    }
}

/**
 * Validate input data for transformation
 * @param {*} data - Input data
 * @param {string} operation - Operation type
 * @returns {Object} Validation result
 */
function validateInput(data, operation) {
    const result = { valid: true, errors: [] };
    
    // Check for null/undefined
    if (data === null || data === undefined) {
        result.valid = false;
        result.errors.push('Input cannot be null or undefined');
        return result;
    }
    
    // Operation-specific validation
    switch (operation) {
        case 'parse-as-number':
            if (typeof data === 'string' && !/^-?\d*\.?\d+$/.test(data.trim())) {
                result.valid = false;
                result.errors.push('Input must be a valid number string');
            }
            break;
            
        case 'parse-as-json':
            if (typeof data === 'string') {
                try {
                    JSON.parse(data);
                } catch (e) {
                    result.valid = false;
                    result.errors.push('Input must be valid JSON');
                }
            }
            break;
    }
    
    return result;
}

/**
 * Get available operations
 * @returns {Array} List of available operations
 */
function getAvailableOperations() {
    return [
        {
            name: 'uppercase',
            description: 'Convert string to uppercase',
            inputTypes: ['string', 'number', 'object'],
            outputType: 'string'
        },
        {
            name: 'lowercase',
            description: 'Convert string to lowercase',
            inputTypes: ['string', 'number', 'object'],
            outputType: 'string'
        },
        {
            name: 'trim',
            description: 'Remove whitespace from both ends',
            inputTypes: ['string', 'number', 'object'],
            outputType: 'string'
        },
        {
            name: 'parse-as-number',
            description: 'Parse string or number as numeric value',
            inputTypes: ['string', 'number'],
            outputType: 'number'
        },
        {
            name: 'parse-as-json',
            description: 'Parse string as JSON object',
            inputTypes: ['string', 'object'],
            outputType: 'object'
        }
    ];
}

// Plugin exports
module.exports = {
    executeDataTransform,
    validateInput,
    getAvailableOperations
};
