# Jest Hang Debug Documentation
**Generated**: 2026-02-18-02-50-00
**Purpose**: Debugging Jest test hangs and open handles

---

## 🔍 COMMON JEST HANG ISSUES

### **1. Server Processes Not Cleaned Up**
**Problem**: Test servers continue running after tests complete
**Solution**: Proper cleanup in afterAll hooks

```javascript
afterAll(async () => {
  // Kill all spawned processes
  if (apiServer) {
    apiServer.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (mainServer) {
    mainServer.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
});
```

### **2. Database Connections Not Closed**
**Problem**: Database connections remain open
**Solution**: Close all connections in cleanup

```javascript
afterAll(async () => {
  // Close database connections
  if (database) {
    await database.close();
  }
});
```

### **3. WebSocket Connections Not Closed**
**Problem**: WebSocket connections prevent process exit
**Solution**: Close all WebSocket connections

```javascript
afterAll(async () => {
  // Close WebSocket connections
  if (socket) {
    socket.disconnect();
  }
});
```

---

## 🛠️ DEBUGGING COMMANDS

### **Detect Open Handles**
```bash
# Run Jest with open handle detection
npx jest --detectOpenHandles --runInBand

# Run with verbose logging
DEBUG=jest:* npx jest --detectOpenHandles --runInBand --verbose
```

### **Force Exit After Tests**
```bash
# Add to jest.config.js
module.exports = {
  // ... other config
  forceExit: true,
  detectOpenHandles: true,
  runInBand: true
};
```

### **Memory Leak Detection**
```bash
# Run with Node.js memory debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Check memory usage
node --expose-gc node_modules/.bin/jest --runInBand
```

---

## 📊 SPECIFIC TO AUTO-CLICKER TESTS

### **Identified Hang Points**
1. **API Server Process**: May not exit cleanly
2. **Socket.IO Connections**: Can prevent process exit
3. **File System Handles**: Temp files may not be cleaned up
4. **Child Processes**: PowerShell processes may hang

### **Mitigation Strategies**
```javascript
// Force cleanup of all resources
afterAll(async () => {
  // Force garbage collection
  if (global.gc) {
    global.gc();
  }
  
  // Kill all child processes
  const { exec } = require('child_process');
  exec('taskkill /F /IM node.exe', (error) => {
    // Ignore errors during cleanup
  });
});
```

---

## 🚨 SPECIFIC FIXES FOR OUR TESTS

### **API Server Cleanup**
```javascript
afterAll(async () => {
  // More aggressive cleanup
  if (apiServer) {
    apiServer.kill('SIGKILL'); // Force kill
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Check if port is still in use
  const { exec } = require('child_process');
  exec('netstat -ano | findstr :3001', (error, stdout) => {
    if (stdout) {
      console.log('Port 3001 still in use:', stdout);
    }
  });
});
```

### **Test Timeout Configuration**
```javascript
// In jest.config.js
module.exports = {
  testTimeout: 30000, // 30 seconds
  forceExit: true,
  detectOpenHandles: true,
  runInBand: true
};
```

---

## 📋 DEBUGGING CHECKLIST

### **Before Running Tests**
- [ ] Ensure no servers running on ports 3000/3001
- [ ] Clean temp directories
- [ ] Check for existing node processes
- [ ] Verify no file locks

### **During Test Execution**
- [ ] Monitor memory usage
- [ ] Check for hanging processes
- [ ] Verify proper cleanup
- [ ] Log any warnings

### **After Test Completion**
- [ ] Verify all processes terminated
- [ ] Check for open file handles
- [ ] Confirm ports released
- [ ] Validate cleanup logs

---

## 🔧 TROUBLESHOOTING STEPS

### **Step 1: Identify Hanging Process**
```bash
# Find Node.js processes
tasklist | findstr node.exe

# Check port usage
netstat -ano | findstr :3001
netstat -ano | findstr :3000
```

### **Step 2: Force Cleanup**
```bash
# Kill all Node.js processes
taskkill /F /IM node.exe

# Or kill specific PID
taskkill /F /PID <PID>
```

### **Step 3: Re-run Tests**
```bash
# Run with debugging
npx jest --detectOpenHandles --runInBand --forceExit
```

---

## 📊 PERFORMANCE MONITORING

### **Memory Usage**
```javascript
// Add to test setup
beforeAll(() => {
  const initialMemory = process.memoryUsage();
  console.log('Initial memory:', initialMemory);
});

afterAll(() => {
  const finalMemory = process.memoryUsage();
  console.log('Final memory:', finalMemory);
});
```

### **Process Monitoring**
```javascript
// Monitor process creation
const originalSpawn = require('child_process').spawn;
require('child_process').spawn = function(...args) {
  console.log('Spawning process:', args[0], args[1]);
  const child = originalSpawn.apply(this, args);
  child.on('close', (code) => {
    console.log('Process closed:', args[0], 'code:', code);
  });
  return child;
};
```

---

## ✅ RESOLUTION STATUS

**Current Status**: 🟡 **PARTIALLY RESOLVED**

- ✅ Test cleanup implemented
- ✅ Force exit configured
- ✅ Open handle detection enabled
- ⚠️ Some hanging processes still occur
- ⚠️ Need more aggressive cleanup

**Next Steps**: Implement more robust process cleanup and add pre-test environment validation.
