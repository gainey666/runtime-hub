# Runtime Hub - Python Monitor

A desktop hub for real-time monitoring, debugging, and planning Python applications with visual workflow capabilities.

## Overview

Runtime Hub provides:
- **Real-time Python function monitoring** with full parameter tracking
- **Desktop application interface** built with Electron
- **Visual workflow planning** and node-based visualization
- **Live debugging** with inputs, outputs, timing, and error tracking
- **Historical data storage** with SQLite database
- **Plugin foundation** for future LLM integration

## Quick Start

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python agent dependencies
npm run install-python
```

### 2. Start the Runtime Hub

```bash
# Start the server and desktop app
npm start
```

This will launch:
- Runtime Hub server on `http://localhost:3000`
- Desktop application window
- Python monitoring dashboard

### 3. Monitor Your Python Application

In a separate terminal:

```bash
# Run the example Python application
npm run python-example
```

Or integrate the agent into your own Python code:

```python
from runtime_monitor import init_monitor, monitor_function

# Initialize monitoring
monitor = init_monitor("My Python App")

# Monitor your functions
@monitor.monitor_function()
def my_function(param1, param2):
    # Your code here
    return result
```

## Features

### 🎯 **Real-time Monitoring**
- Function entry/exit tracking
- Full parameter capture (inputs + outputs)
- Execution timing and performance metrics
- Error tracking with stack traces
- Live dashboard updates

### 🖥️ **Desktop Interface**
- Native desktop application (Electron)
- Dark-themed professional interface
- Tabbed views (Monitor, Workflow, Analytics)
- Real-time log filtering and search
- Export functionality

### 📊 **Visual Workflow**
- Node-based workflow visualization
- Drag-and-drop interface
- Connection mapping between functions
- Real-time execution highlighting
- Auto-layout options

### 💾 **Data Persistence**
- SQLite database for storage
- Historical execution logs
- Export to JSON format
- Search and filter capabilities

## Python Agent Usage

### Basic Function Monitoring

```python
from runtime_monitor import init_monitor, monitor_function

# Initialize the monitor
monitor = init_monitor("My App")

# Monitor a function
@monitor.monitor_function()
def calculate_sum(a, b):
    return a + b

# Monitor async functions
@monitor.monitor_function()
async def fetch_data(url):
    # Async code here
    return data
```

### Manual Tracking

```python
# For complex scenarios, track manually
monitor.track_manual_call(
    function_name="custom_operation",
    parameters={"input": data},
    return_value=result,
    start_time=start,
    end_time=end
)
```

### Workflow Definition

```python
# Define visual workflow structure
nodes = [
    {'id': 'node1', 'name': 'Process Data', 'type': 'logic', 'x': 100, 'y': 100},
    {'id': 'node2', 'name': 'Save Results', 'type': 'storage', 'x': 300, 'y': 100}
]

connections = [
    {'source': 'node1', 'target': 'node2'}
]

monitor.define_workflow_nodes(nodes, connections)
```

## Dashboard Features

### **Monitor Tab**
- Live execution feed
- Function call details
- Parameter inspection
- Error tracking
- Performance metrics

### **Workflow Tab**
- Visual node editor
- Connection mapping
- Real-time execution flow
- Drag-and-drop positioning

### **Analytics Tab** (Future)
- Performance statistics
- Error frequency analysis
- Execution timeline
- Export capabilities

## Project Structure

```
runtime-hub/
├── src/
│   ├── main.js           # Electron main process
│   └── server.js         # Express + Socket.IO server
├── public/
│   └── dashboard.html    # Web dashboard
├── python-agent/
│   ├── runtime_monitor.py    # Python monitoring agent
│   ├── example_usage.py      # Example usage
│   └── requirements.txt      # Python dependencies
├── package.json
└── README.md
```

## Development

### Running in Development Mode

```bash
# Start with dev tools
npm run dev

# Or start server only
npm run server
```

### Testing the Python Agent

```bash
# Run the example Python application
cd python-agent
python example_usage.py
```

## API Endpoints

- `GET /api/applications` - List all registered applications
- `GET /api/applications/:appId/logs` - Get execution logs for an app
- `GET /api/applications/:appId/nodes` - Get workflow nodes for an app

## Socket Events

### Python Agent → Server
- `register_app` - Register a new Python application
- `execution_data` - Send function execution data
- `node_data` - Send workflow node structure

### Server → Dashboard
- `execution_update` - Real-time execution updates
- `node_update` - Workflow node updates

## Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)
- `DB_PATH` - Database file path (default: ./runtime_monitor.db)

### Python Agent Configuration
```python
monitor = init_monitor(
    app_name="My App",
    hub_url="http://localhost:3000"  # Custom hub URL
)
```

## Future Enhancements

- [ ] **LLM Integration Plugin** - Connect to ChatGPT/Claude for code generation
- [ ] **Advanced Analytics** - Performance insights and optimization suggestions
- [ ] **Multi-language Support** - Monitor JavaScript, Java, and other languages
- [ ] **Cloud Deployment** - Host monitoring service in the cloud
- [ ] **Team Collaboration** - Share monitoring sessions with teams
- [ ] **Alert System** - Custom alerts for errors and performance issues

## Troubleshooting

### Python Agent Not Connecting
1. Ensure the Runtime Hub server is running (`npm start`)
2. Check the hub URL in your Python code
3. Verify Python dependencies are installed (`npm run install-python`)

### Dashboard Not Loading
1. Check that the server is running on port 3000
2. Look for console errors in the desktop app
3. Ensure Electron dependencies are installed

### Performance Issues
1. Limit the number of monitored functions
2. Use parameter filtering for large objects
3. Clear old logs regularly

## License

MIT License - see LICENSE file for details
