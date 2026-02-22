# 📚 Runtime Hub - Operations Runbook

> *"Every system needs a playbook. This is ours."* - The Scribe

## 🎯 Mission Briefing

This runbook contains the essential procedures for operating, maintaining, and troubleshooting the Runtime Hub system.

## 🚀 Quick Start

### Auto-Clicker System Setup
```bash
# Clone and setup
git clone <repository>
cd windsurf-project-13
npm install

# Auto-clicker tool setup
cd ../auto-clicker-tool
npm install
cd ../windsurf-project-13

# Verify setup
npm run type-check  # Should pass with 0 errors
node src/core/auto-clicker/auto-clicker-engine.js  # Should load without errors
```

### For Developers
```bash
# Clone and setup
git clone <repository>
cd runtime-hub
npm install
cd python-agent && pip install -r requirements.txt && cd ..

# Verify setup
npm run type-check  # Should pass with 0 errors
npm test -- --testPathPattern="tests/unit/core"  # Should pass 16/16 tests
```

### For Operations
```bash
# Health check
npm test -- --testPathPattern="tests/security"  # Security validation
npm run test:performance  # Performance benchmarks
```

## 🔧 System Architecture

### Core Components
1. **WorkflowEngine (TypeScript)** - Primary workflow execution engine
2. **WorkflowEngine (JavaScript)** - Legacy engine (needs alignment)
3. **Python Agent** - Runtime monitoring and Python integration
4. **UI System (React/TypeScript)** - Complete node editor interface
5. **Auto-Clicker Integration** - External tool control system
6. **Type System** - Strict TypeScript with utility types
7. **Test Suite** - Comprehensive test coverage

### Data Flow
```
User Input → WorkflowEngine → Node Execution → Results → History/Metrics
```

## 🛠️ Common Procedures

### Running Tests
```bash
# All tests (includes failing JavaScript tests)
npm test

# UI-specific tests
npm test -- --testPathPattern="tests/unit/ui"
npm run test:e2e  # Playwright end-to-end tests

# Type checking
npm run type-check

# UI build
npm run build:ui
npm run dev:ui  # Development server
```

# TypeScript tests only (working)
npm test -- --testPathPattern="tests/unit/core"

# Type checking
npm run type-check

# Security tests
npm run test:security

# Performance tests
npm run test:performance

# With debugging
npm test -- --detectOpenHandles --runInBand
```

### Development Workflow
```bash
# 1. Make changes
# 2. Type check
npm run type-check

# 3. Run relevant tests
npm test -- --testPathPattern="tests/unit/core"

# 4. Run full test suite
npm test

# 5. Lint and format
npm run lint:fix
npm run format
```

### Python Agent Operations
```bash
# Run Python static analysis
cd python-agent
```

## 🖱️ Auto-Clicker Operations

### Starting the System
```bash
# 1. Start main server (port 3000)
cd windsurf-project-13
node src/server.js

# 2. Start auto-clicker API server (port 3001)
cd ../auto-clicker-tool
node src/api-server.js

# 3. Verify both servers are running
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### Testing Auto-Clicker Workflow
```bash
# 1. Start a session
curl -X POST http://localhost:3001/api/auto-clicker/start \
  -H "Content-Type: application/json" \
  -d '{
    "area": {"x": 0, "y": 0, "width": 800, "height": 600},
    "ocr": {"engine": "simple", "language": ["eng"], "confidence": 0.7},
    "click": {"button": "left", "clickType": "single"},
    "refreshRate": 500,
    "targetPattern": "number"
  }'

# 2. Check session status
curl http://localhost:3001/api/auto-clicker/status

# 3. Stop session
curl -X POST http://localhost:3001/api/auto-clicker/stop
```

### Accessing the UI
```bash
# Main dashboard
open http://localhost:3000

# Node editor
open http://localhost:3000/node-editor

# Web UI (if running)
cd ui/web && npm start
open http://localhost:8080
```

### Troubleshooting Auto-Clicker

#### Common Issues

**Issue: "Cannot find module './auto-clicker-engine'"**
```bash
# Solution: Check file exists and has proper exports
ls -la src/core/auto-clicker/auto-clicker-engine.js
node -e "const { AutoClickerEngine } = require('./src/core/auto-clicker/auto-clicker-engine'); console.log('✅ Loaded');"
```

**Issue: "Screen capture failed: ENOENT"**
```bash
# Solution: Create temp directory
mkdir -p ../auto-clicker-tool/temp/captures
mkdir -p ../auto-clicker-tool/temp/ocr
```

**Issue: Port already in use**
```bash
# Find and kill process using port
netstat -ano | findstr :3000
taskkill /F /PID <PID>
```

**Issue: TypeScript compilation errors**
```bash
# Solution: Check tsconfig.json and install dependencies
npm install
npx tsc --noEmit
```

### Testing Components Individually
```bash
# Test auto-clicker engine
cd src/core/auto-clicker
node -e "
const { AutoClickerEngine } = require('./auto-clicker-engine');
const engine = new AutoClickerEngine();
engine.testComponents().then(console.log);
"

# Test screen capture
node -e "
const { WindowsScreenCapture } = require('./screen-capture/windows-capture');
const capture = new WindowsScreenCapture();
capture.capture({x: 0, y: 0, width: 100, height: 100}).then(console.log);
"

# Test mouse control
node -e "
const { MouseControl } = require('./click-automation/mouse-control');
const mouse = new MouseControl();
mouse.testClick().then(console.log);
"
```

### Monitoring and Logs
```bash
# Check server logs
tail -f logs/main-server.log
tail -f logs/api-server.log

# Monitor system resources
tasklist | findstr node
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

### Performance Optimization
```bash
# Check memory usage
node --inspect src/server.js
# Open Chrome DevTools and connect to localhost:9229

# Profile auto-clicker performance
node --prof src/core/auto-clicker/auto-clicker-engine.js
node --prof-process isolate-*.log > performance.txt
```
python -m vulture .
python -m mypy . --strict

# Run Python examples
python simple_test.py
python example_usage.py
```

## 🚨 Troubleshooting

### Test Failures

#### JavaScript WorkflowEngine Tests (101 failing)
**Symptoms**: Tests expecting different API than implementation
**Cause**: JavaScript tests import from wrong engine or expect different return types
**Solution**:
```bash
# Check import paths
grep -r "require.*workflow-engine" tests/unit/workflow-engine/

# Verify API alignment
npm test -- --testPathPattern="tests/unit/workflow-engine" --verbose
```

#### Jest Hanging Issues
**Symptoms**: Tests don't exit, open handles detected
**Cause**: Server cleanup issues
**Solution**:
```bash
# Run with open handle detection
npm test -- --detectOpenHandles --runInBand

# Check server cleanup in test files
grep -r "afterAll" tests/e2e/ tests/performance/
```

#### TypeScript Errors
**Symptoms**: Type compilation failures
**Cause**: Missing imports or type mismatches
**Solution**:
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Verify imports
grep -r "import.*from.*types" src/
```

### Performance Issues

#### Slow Test Execution
**Symptoms**: Tests taking > 30 seconds
**Cause**: Database setup, server startup
**Solution**:
```bash
# Run tests in band to prevent interference
npm test -- --runInBand

# Use specific test paths
npm test -- --testPathPattern="tests/unit/core"
```

#### Memory Leaks
**Symptoms**: Memory usage increasing during tests
**Cause**: Unclosed connections, event listeners
**Solution**:
```bash
# Check for open handles
npm test -- --detectOpenHandles

# Verify cleanup in afterAll hooks
grep -A 10 "afterAll" tests/
```

## 📊 System Monitoring

### Key Metrics
- **Test Pass Rate**: Target 100% (currently 61%)
- **Type Errors**: Target 0 (currently 0)
- **Test Execution Time**: Target < 30s (currently 83s)
- **Memory Usage**: Monitor during test execution

### Health Checks
```bash
# Type system health
npm run type-check

# Test suite health
npm test -- --passWithNoTests

# Security health
npm run test:security

# Performance health
npm run test:performance
```

## 🔒 Security Procedures

### Input Validation
- All user inputs validated through `tests/security/input-validation.test.js`
- XSS protection enabled
- SQL injection protection active
- File upload security enforced

### Security Testing
```bash
# Run security tests
npm run test:security

# Check for vulnerabilities
npm audit
```

## 📈 Performance Procedures

### Benchmarking
```bash
# Run performance benchmarks
npm run test:performance

# Monitor response times
npm test -- --testPathPattern="tests/performance" --verbose
```

### Optimization
- Monitor test execution time
- Profile memory usage
- Check for memory leaks

## 🔄 Deployment Procedures

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Type checking passes
- [ ] Security tests pass
- [ ] Performance benchmarks meet criteria
- [ ] Documentation updated

### Build Process
```bash
# Clean build
npm run clean
npm run build

# Verify build
npm run type-check
npm test
```

## 📝 Maintenance Procedures

### Daily
- Run test suite
- Check for security updates
- Monitor performance metrics

### Weekly
- Update dependencies
- Run full test suite with coverage
- Review test failures

### Monthly
- Update documentation
- Review architecture decisions
- Plan improvements

## 🎯 Emergency Procedures

### Critical Test Failures
1. **Immediate**: Run `npm test -- --detectOpenHandles --runInBand`
2. **Diagnose**: Check specific failing test
3. **Fix**: Address root cause
4. **Verify**: Run tests again

### System Outage
1. **Check**: Recent changes
2. **Rollback**: If necessary
3. **Diagnose**: Check logs
4. **Recover**: Restore functionality

## 📞 Support Channels

### Documentation
- **README.md**: Project overview and setup
- **WORKFLOW.md**: Multi-agent workflow protocol
- **ARCHITECTURE_ANALYSIS.md**: Technical architecture

### Code Analysis
- **Type Definitions**: `src/types/`
- **Test Suites**: `tests/`
- **Utilities**: `src/utils/`

### Troubleshooting
- **Test Logs**: Check Jest output for specific errors
- **Type Errors**: Check TypeScript compilation output
- **Performance**: Monitor test execution times

---

## 🎬 The Final Chapter

This runbook represents the collective wisdom of our multi-agent team. Follow these procedures to ensure smooth operations and maintain the high standards we've established.

*"In code, as in life, preparation meets opportunity."* - The Scribe
