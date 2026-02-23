# Plugin Development Guide

## What is a Plugin?

A plugin is a self-contained module that extends Runtime Hub with new node types. Plugins allow developers to add custom functionality without modifying the core application code.

## File Structure

Each plugin follows this directory structure:

```
plugins/
└── your-plugin-name/
    ├── manifest.json      # Plugin metadata and node definitions
    ├── index.js          # Plugin implementation
    └── tests/             # Plugin tests (optional)
        └── your-plugin.test.js
```

## Plugin Manifest

The `manifest.json` file defines plugin metadata and node types:

```json
{
  "name": "Your Plugin Name",
  "version": "1.0.0",
  "description": "Brief description of what your plugin does",
  "author": "Your Name",
  "category": "Utility",
  "main": "index.js",
  "nodes": [
    {
      "type": "YourNodeType",
      "description": "What this node does",
      "category": "Utility",
      "inputs": [
        {
          "name": "input",
          "type": "string",
          "description": "Input data"
        }
      ],
      "outputs": [
        {
          "name": "output",
          "type": "string",
          "description": "Output data"
        }
      ],
      "config": [
        {
          "name": "setting",
          "type": "text",
          "default": "default value",
          "description": "Configuration option"
        }
      ]
    }
  ]
}
```

### Manifest Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Plugin display name |
| `version` | string | ✅ | Plugin version (semantic versioning) |
| `description` | string | ✅ | Brief plugin description |
| `author` | string | ✅ | Plugin author |
| `category` | string | ✅ | Plugin category (Utility, Data, Control, etc.) |
| `main` | string | ✅ | Entry point file (usually "index.js") |
| `nodes` | array | ✅ | Array of node definitions |

### Node Definition Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | ✅ | Node type name (must match executor function) |
| `description` | string | ✅ | What this node does |
| `category` | string | ✅ | Node category for palette organization |
| `inputs` | array | ❌ | Array of input definitions |
| `outputs` | array | ❌ | Array of output definitions |
| `config` | array | ❌ | Array of configuration options |

### Input/Output Definition Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Port name |
| `type` | string | ✅ | Data type (string, number, boolean, any, object, array) |
| `description` | string | ✅ | Port description |

### Configuration Option Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Configuration option name |
| `type` | string | ✅ | Input type (text, number, select, boolean) |
| `default` | any | ✅ | Default value |
| `description` | string | ✅ | Option description |
| `options` | array | ❌ | Options for select type |

## Port Definitions

### Supported Input/Output Types

- `string` - Text data
- `number` - Numeric data
- `boolean` - True/false values
- `any` - Any data type
- `object` - JavaScript objects
- `array` - Arrays of data

### Input/Output Patterns

#### Single Input
```json
{
  "name": "data",
  "type": "string",
  "description": "Text data to process"
}
```

#### Multiple Inputs
```json
{
  "name": "condition",
  "type": "boolean",
  "description": "Conditional input"
},
{
  "name": "true_path",
  "type": "any",
  "description": "Data if condition is true"
},
{
  "name": "false_path",
  "type": "any",
  "description": "Data if condition is false"
}
```

#### Passthrough Pattern
```json
{
  "name": "input",
  "type": "any",
  "description": "Input data (passed through)"
}
```

## Executor Function

The executor function is the heart of your plugin node. It processes inputs and returns outputs.

### Function Signature

```javascript
async function executeYourNodeType(node, workflow, connections, inputs = {}) {
  // Your implementation here
  return {
    output: processedData
  };
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `node` | object | Node configuration including config values |
| `workflow` | object | Workflow context and state |
| `connections` | array | Node connections information |
| `inputs` | object | Input data from connected nodes |

### Node Object Structure

```javascript
{
  id: "node-id",
  type: "YourNodeType",
  config: {
    setting: "value from user configuration"
  },
  position: { x: 100, y: 200 }
}
```

### Return Values

#### Success
```javascript
return {
  output: processedData,
  metadata: additionalInfo
};
```

#### Error
```javascript
return {
  error: "Error message",
  original: inputData,
  success: false
};
```

#### Multiple Outputs
```javascript
return {
  output1: result1,
  output2: result2,
  output3: result3
};
```

## Step-by-Step Tutorial: Creating a Logger Plugin

Let's create a simple logger plugin that logs data with timestamps.

### Step 1: Create Plugin Directory

```bash
mkdir plugins/logger-plugin
cd plugins/logger-plugin
```

### Step 2: Create Manifest

Create `manifest.json`:

```json
{
  "name": "Logger Plugin",
  "version": "1.0.0",
  "description": "Logs workflow data with timestamps and configurable levels",
  "author": "Runtime Hub Team",
  "category": "Utility",
  "main": "index.js",
  "nodes": [
    {
      "type": "Logger",
      "description": "Logs incoming data with timestamp and configurable log level",
      "category": "Utility",
      "inputs": [
        {
          "name": "data",
          "type": "any",
          "description": "Data to log"
        }
      ],
      "outputs": [
        {
          "name": "output",
          "type": "any",
          "description": "Passthrough output (same as input)"
        }
      ],
      "config": [
        {
          "name": "level",
          "type": "select",
          "options": ["info", "warn", "error"],
          "default": "info",
          "description": "Log level"
        },
        {
          "name": "prefix",
          "type": "text",
          "default": "",
          "description": "Optional prefix for log entries"
        }
      ]
    }
  ]
}
```

### Step 3: Create Plugin Implementation

Create `index.js`:

```javascript
// Global log storage
const logStorage = [];

async function executeLogger(node, workflow, connections, inputs = {}) {
  const config = node.config || {};
  const level = config.level || 'info';
  const prefix = config.prefix || '';
  
  // Get input data
  const inputData = inputs.data !== undefined ? inputs.data : null;
  
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
  
  // Log to console
  console.log(`[${timestamp}] ${logEntry.level} ${logEntry.prefix}${logEntry.message}`);
  
  // Return passthrough output
  return {
    output: inputData,
    logged: true,
    timestamp,
    level,
    entry: logEntry
  };
}

// Export functions
module.exports = {
  executeLogger,
  getLogs: (options = {}) => {
    // Return filtered logs
    return logStorage.slice(-100); // Last 100 entries
  },
  clearLogs: () => {
    logStorage.length = 0;
  }
};
```

### Step 4: Create Tests

Create `tests/logger-plugin.test.js`:

```javascript
const { executeLogger } = require('../index.js');

describe('Logger Plugin', () => {
  test('should log data with timestamp', async () => {
    const mockNode = {
      id: 'test-logger',
      config: { level: 'info', prefix: 'TEST' }
    };
    
    const mockWorkflow = { id: 'test-workflow' };
    const inputs = { data: 'test message' };
    
    const result = await executeLogger(mockNode, mockWorkflow, [], inputs);
    
    expect(result.output).toBe('test message');
    expect(result.logged).toBe(true);
    expect(result.level).toBe('info');
    expect(result.timestamp).toBeDefined();
  });
});
```

### Step 5: Test Your Plugin

```bash
# Run tests
npm test -- tests/logger-plugin.test.js

# Start Runtime Hub
npm start
```

Your plugin should now appear in the node editor palette!

## Testing Your Plugin

### Unit Tests

Create comprehensive tests for your plugin:

```javascript
const { executeYourNode } = require('../index.js');

describe('Your Plugin', () => {
  test('should process inputs correctly', async () => {
    const result = await executeYourNode(mockNode, mockWorkflow, [], inputs);
    expect(result.output).toBe(expectedResult);
  });
  
  test('should handle errors gracefully', async () => {
    const result = await executeYourNode(mockNode, mockWorkflow, [], invalidInputs);
    expect(result.error).toBeDefined();
    expect(result.success).toBe(false);
  });
});
```

### Integration Tests

Test your plugin in actual workflows:

1. Create a test workflow using your node
2. Execute the workflow
3. Verify the results
4. Check console output for any errors

### Running Tests

```bash
# Run all tests
npm test

# Run specific plugin tests
npm test -- tests/unit/your-plugin.test.js

# Run with coverage
npm test -- --coverage tests/unit/your-plugin.test.js
```

## Troubleshooting

### Top 5 Common Issues

#### 1. Plugin Not Loading
**Problem:** Your plugin doesn't appear in the node palette.

**Solution:**
- Check that `manifest.json` is valid JSON
- Verify `index.js` exists and is syntactically correct
- Ensure plugin directory is in the `plugins/` folder
- Check console for error messages during startup

#### 2. Executor Function Not Found
**Problem:** Node appears but execution fails.

**Solution:**
- Ensure executor function name matches node type (e.g., `executeLogger` for `Logger` node)
- Check that function is exported in `module.exports`
- Verify function signature is correct

#### 3. Input Data Undefined
**Problem:** Input data is `undefined` in executor.

**Solution:**
- Check input port names match between manifest and executor
- Verify connections are properly made in workflow
- Use default values for optional inputs

#### 4. Configuration Not Working
**Problem:** Configuration values are not applied.

**Solution:**
- Check config field names match between manifest and code
- Verify default values are provided in manifest
- Use `node.config.setting` to access configuration

#### 5. Memory Leaks
**Problem:** Plugin causes memory usage to increase over time.

**Solution:**
- Clean up resources in executor functions
- Avoid global variables that grow indefinitely
- Use proper error handling to prevent hanging operations

### Debugging Tips

1. **Use console.log** liberally during development
2. **Check the browser console** for JavaScript errors
3. **Monitor the server console** for plugin loading messages
4. **Test with simple inputs** before complex ones
5. **Use the Node.js debugger** for complex issues

### Common Error Messages

- `Plugin ${name} missing index.js` - Create the index.js file
- `Executor function ${name} not found` - Check function naming
- `Cannot read property of undefined` - Add null checks
- `Invalid JSON in manifest.json` - Validate JSON syntax

## Best Practices

1. **Keep plugins focused** on a single responsibility
2. **Use descriptive names** for nodes and functions
3. **Provide comprehensive documentation** in manifest
4. **Handle errors gracefully** and return meaningful messages
5. **Write tests** for all functionality
6. **Follow naming conventions** (camelCase for functions)
7. **Use TypeScript** for better type safety (optional)
8. **Version your plugins** using semantic versioning
9. **Keep dependencies minimal** to avoid conflicts
10. **Test with different data types** to ensure robustness

## API Reference

### Plugin Loader API

The plugin loader provides these methods:

```javascript
// Access plugin loader
const pluginLoader = new PluginLoader();

// Load all plugins
await pluginLoader.loadPlugins();

// Get loaded plugins
const plugins = pluginLoader.plugins;

// Get plugin nodes
const nodes = pluginLoader.pluginNodes;
```

### Workflow Engine Integration

Your plugin nodes are automatically integrated with the workflow engine:

- **Execution context** is provided to all executors
- **Error handling** is managed by the engine
- **Logging** is automatically captured
- **Performance monitoring** is included

### Node Library Integration

Plugin nodes appear in the node editor palette:

- **Category organization** based on manifest
- **Search functionality** for easy discovery
- **Drag-and-drop** support
- **Configuration UI** generated from manifest

## Examples

### Simple Transform Plugin

```javascript
async function executeUppercase(node, workflow, connections, inputs = {}) {
  const text = inputs.input || '';
  return {
    output: text.toUpperCase()
  };
}
```

### Data Processing Plugin

```javascript
async function executeProcessData(node, workflow, connections, inputs = {}) {
  const config = node.config || {};
  const data = inputs.data || [];
  const operation = config.operation || 'filter';
  
  try {
    let result;
    switch (operation) {
      case 'filter':
        result = data.filter(item => item.active);
        break;
      case 'sort':
        result = data.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    
    return {
      output: result,
      count: result.length,
      operation
    };
  } catch (error) {
    return {
      error: error.message,
      original: data,
      success: false
    };
  }
}
```

### API Integration Plugin

```javascript
async function executeApiCall(node, workflow, connections, inputs = {}) {
  const config = node.config || {};
  const url = config.url || '';
  const method = config.method || 'GET';
  
  try {
    const response = await fetch(url, { method });
    const data = await response.json();
    
    return {
      output: data,
      status: response.status,
      success: true
    };
  } catch (error) {
    return {
      error: error.message,
      url,
      success: false
    };
  }
}
```

## Contributing

When contributing plugins to Runtime Hub:

1. **Follow the plugin structure** exactly
2. **Include comprehensive tests**
3. **Document your plugin** thoroughly
4. **Use semantic versioning**
5. **Test with the latest Runtime Hub version**
6. **Consider backwards compatibility**
7. **Provide examples** in documentation

## Support

For plugin development help:

1. **Check this guide** for common solutions
2. **Review existing plugins** for examples
3. **Search GitHub issues** for similar problems
4. **Create a new issue** with detailed description
5. **Join the community** for discussions and help

Happy plugin development! 🚀
