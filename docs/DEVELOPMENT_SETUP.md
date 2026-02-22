# Development Setup Guide

## Prerequisites

- **Node.js** 16.0.0 or higher
- **Python** 3.8.0 or higher
- **SQLite3** (included with Node.js on most systems)
- **Git** for version control

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd windsurf-project-13
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (for Python agent)
cd python-agent
pip install -r requirements.txt
cd ..
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 4. Start Development Server

```bash
# Start the main server
npm run dev

# In another terminal, start Python agent (optional)
cd python-agent
python start_agent.py
```

### 5. Access Applications

- **Node Editor**: http://localhost:3000/node-editor
- **Dashboard**: http://localhost:3000/
- **Health Check**: http://localhost:3000/health

## Detailed Setup

### Environment Variables

Create a `.env` file from `.env.example` and configure:

```bash
# Environment
NODE_ENV=development

# Server Configuration
PORT=3000
HOST=localhost

# Database Configuration
DB_TYPE=sqlite
DB_PATH=./data/runtime_monitor.db

# Python Agent Configuration
PYTHON_MAX_AGENTS=10
PYTHON_TIMEOUT=30000

# Workflow Engine Configuration
MAX_CONCURRENT_WORKFLOWS=5
WORKFLOW_DEFAULT_TIMEOUT=60000

# Logging Configuration
LOG_LEVEL=debug
ENABLE_FILE_LOGGING=true

# Feature Flags
ENABLE_PYTHON_AGENT=true
ENABLE_NODE_EDITOR=true
ENABLE_REALTIME_UPDATES=true
ENABLE_WORKFLOW_HISTORY=true
ENABLE_UNDO_REDO=true
ENABLE_PERFORMANCE_METRICS=true
```

### Project Structure

```
windsurf-project-13/
├── src/                          # Server-side code
│   ├── config/                   # Configuration management
│   ├── utils/                    # Utility functions
│   ├── server.js                 # Main server file
│   └── workflow-engine.js        # Workflow execution engine
├── public/                       # Client-side code
│   ├── node-editor.html          # Visual node editor
│   ├── node-library.js           # Node type definitions
│   ├── enhanced-dashboard.html   # Main dashboard
│   └── error-logger.js           # Client error logging
├── python-agent/                 # Python agent code
│   ├── start_agent.py           # Agent startup script
│   ├── runtime_monitor.py       # Runtime monitoring
│   └── requirements.txt         # Python dependencies
├── tests/                        # Test files (to be created)
├── docs/                         # Documentation
├── data/                         # Database files (auto-created)
├── logs/                         # Log files (auto-created)
├── uploads/                      # File uploads (auto-created)
└── package.json                  # Node.js dependencies
```

## Development Workflow

### 1. Making Changes

1. **Server Changes**: Edit files in `src/`
2. **Client Changes**: Edit files in `public/`
3. **Python Agent**: Edit files in `python-agent/`

### 2. Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests only
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

### 3. Code Quality

```bash
# Run linting
npm run lint

# Run formatting
npm run format

# Run type checking
npm run type-check
```

### 4. Database Management

```bash
# Reset database
npm run db:reset

# Migrate database
npm run db:migrate

# Seed database with test data
npm run db:seed
```

## Python Agent Development

### Starting the Agent

```bash
cd python-agent
python start_agent.py
```

### Agent Configuration

Edit `python-agent/config.json`:

```json
{
  "server_url": "http://localhost:3000",
  "agent_id": "python_agent_dev",
  "timeout": 30000,
  "max_retries": 3,
  "log_level": "DEBUG"
}
```

### Testing Python Integration

```bash
# Test basic Python execution
python simple_test.py

# Test fake loop demo
python fake_loop_demo.py

# Test runtime monitoring
python -c "
from runtime_monitor import monitor_function
import time

@monitor_function
def test_function():
    time.sleep(1)
    return 'test complete'

result = test_function()
print(f'Result: {result}')
"
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

#### 2. Python Agent Connection Failed

```bash
# Check if server is running
curl http://localhost:3000/health

# Check Python agent logs
cd python-agent
python start_agent.py

# Verify firewall settings
# Port 3000 should be open for localhost
```

#### 3. Database Issues

```bash
# Check database file permissions
ls -la data/

# Reset database
rm data/runtime_monitor.db
npm run dev
```

#### 4. Node Library Not Loading

```bash
# Check browser console for errors
# Open: http://localhost:3000/node-editor
# Press F12, check Console tab

# Verify node-library.js exists
ls -la public/node-library.js

# Clear browser cache and refresh
```

### Debug Mode

Enable debug logging:

```bash
# Set debug environment
export DEBUG=runtime-logger:*
export LOG_LEVEL=debug

# Start server with debug
npm run dev
```

### Performance Monitoring

Monitor application performance:

```bash
# Check memory usage
npm run monitor:memory

# Check CPU usage
npm run monitor:cpu

# Profile application
npm run profile
```

## Contributing

### Code Style

- **JavaScript**: Use ESLint configuration
- **Python**: Follow PEP 8
- **Comments**: JSDoc for JavaScript, docstrings for Python
- **Naming**: camelCase for JS, snake_case for Python

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
git add .
git commit -m "feat: add new feature"

# Push branch
git push origin feature/new-feature

# Create pull request
```

### Testing Requirements

- All new features must have tests
- Maintain test coverage above 80%
- Tests must pass before merging

## Deployment

### Development Deployment

```bash
# Build for development
npm run build:dev

# Start development server
npm run dev
```

### Production Deployment

```bash
# Build for production
npm run build:prod

# Start production server
npm start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t runtime-logger .

# Run container
docker run -p 3000:3000 runtime-logger
```

## Monitoring

### Health Checks

```bash
# Check server health
curl http://localhost:3000/health

# Check database connection
curl http://localhost:3000/health | jq '.services.database'

# Check Python agents
curl http://localhost:3000/api/python-agents
```

### Logs

```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# View Python agent logs
tail -f python-agent/logs/agent.log
```

### Metrics

```bash
# Get performance metrics
curl http://localhost:3000/api/metrics

# Get workflow statistics
curl http://localhost:3000/api/workflows/stats
```

## IDE Configuration

### VS Code

Install these extensions:
- ESLint
- Prettier
- Python
- SQLite

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "python.defaultInterpreterPath": "./python-agent/venv/bin/python"
}
```

### Cursor/Windsurf

The project is optimized for Cursor/Windsurf with:
- Multi-agent workflow support
- File-aware editing
- Context-aware suggestions
- Integrated testing

## Support

### Getting Help

1. **Documentation**: Check `docs/` folder
2. **Issues**: Create GitHub issue
3. **Discussions**: Join GitHub discussions
4. **Chat**: Join Discord/Slack community

### Reporting Bugs

When reporting bugs, include:
- Environment details
- Error messages
- Steps to reproduce
- Expected vs actual behavior

### Feature Requests

When requesting features, include:
- Use case description
- Implementation ideas
- Priority level
- Acceptance criteria

## Next Steps

1. **Read the API Documentation**: `docs/API_DOCUMENTATION.md`
2. **Explore the Node Editor**: http://localhost:3000/node-editor
3. **Try the Examples**: `example_workflow.json`
4. **Run the Tests**: `npm test`
5. **Contribute**: Check GitHub issues for good first issues
