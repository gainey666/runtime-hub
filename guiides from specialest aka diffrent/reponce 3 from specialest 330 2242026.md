🔍 Resource Leak Analysis
Looking at the code, I can identify several areas where resource leaks can occur:

1. File Handle Leaks
Issue: Several file operations don't have proper cleanup:

executeWriteLog - file handles not closed
executeDownloadFile - file streams not closed properly
executePython - temp files sometimes not deleted
2. Process/Child Process Leaks
const python = spawn('python', [tmpFile], { shell: false });
// No proper cleanup on process termination
3. Database Connection Leaks
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
// DB connections sometimes not closed properly
4. Memory/Object References
Large objects retained in workflow context
Event listeners accumulating over time
🎯 Proposed Resource Leak Fix Strategy
Let me start with the most critical area: File Handle Management

Fix #1: File Handle Resource Management
I'll create a FileResourceManager class that handles file lifecycle automatically:

// src/utils/file-resource-manager.js
class FileResourceManager {
    constructor() {
        this.openFiles = new Map();
        this.tempFiles = new Set();
        this.closed = false;
    }

    // Track file handles with automatic cleanup
    trackFile(filePath, handle) {
        if (this.closed) return;
        this.openFiles.set(filePath, {
            handle,
            openTime: Date.now(),
            lastAccess: Date.now()
        });
    }

    // Track temp files for auto-deletion
    trackTempFile(filePath) {
        this.tempFiles.add(filePath);
    }

    // Close file handle
    closeFile(filePath) {
        const fileInfo = this.openFiles.get(filePath);
        if (fileInfo && fileInfo.handle) {
            try {
                fileInfo.handle.close();
            } catch (err) {
                console.warn(`Failed to close file ${filePath}:`, err.message);
            }
            this.openFiles.delete(filePath);
        }
    }

    // Cleanup temp files
    async cleanupTempFiles() {
        const fs = require('fs').promises;
        for (const filePath of this.tempFiles) {
            try {
                await fs.unlink(filePath);
            } catch (err) {
                console.warn(`Failed to delete temp file ${filePath}:`, err.message);
            }
        }
        this.tempFiles.clear();
    }

    // Close all resources
    async close() {
        if (this.closed) return;
        this.closed = true;
        
        // Close all open file handles
        for (const [filePath] of this.openFiles) {
            this.closeFile(filePath);
        }
        
        // Cleanup temp files
        await this.cleanupTempFiles();
    }

    // Auto-cleanup on process exit
    setupAutoCleanup() {
        process.on('exit', () => this.close());
        process.on('SIGINT', () => process.exit(0));
        process.on('SIGTERM', () => process.exit(0));
    }
}

module.exports = new FileResourceManager();
Fix #2: Enhanced Process Management
// src/utils/process-manager.js
class ProcessManager {
    constructor() {
        this.activeProcesses = new Map();
    }

    trackProcess(name, process, timeoutMs = 30000) {
        const processInfo = {
            process,
            name,
            startTime: Date.now(),
            timeoutId: setTimeout(() => {
                console.warn(`Process ${name} timeout after ${timeoutMs}ms`);
                this.killProcess(name);
            }, timeoutMs)
        };
        this.activeProcesses.set(name, processInfo);
    }

    killProcess(name) {
        const processInfo = this.activeProcesses.get(name);
        if (processInfo) {
            clearTimeout(processInfo.timeoutId);
            try {
                processInfo.process.kill('SIGTERM');
                setTimeout(() => {
                    if (!processInfo.process.killed) {
                        processInfo.process.kill('SIGKILL');
                    }
                }, 2000);
            } catch (err) {
                console.warn(`Failed to kill process ${name}:`, err.message);
            }
            this.activeProcesses.delete(name);
        }
    }

    killAllProcesses() {
        for (const [name] of this.activeProcesses) {
            this.killProcess(name);
        }
    }
}

module.exports = new ProcessManager();
Fix #3: Update Node Adapters to Use Resource Managers
Now let me create a patch that integrates these resource managers into the existing node adapters:

// Patch for resource leak fixes in node-adapters.js

// Add at top of file
const fileResourceManager = require('./utils/file-resource-manager');
const processManager = require('./utils/process-manager');

// Setup auto-cleanup
fileResourceManager.setupAutoCleanup();

// Enhanced executePython with proper resource management
async function executePython(node, workflow, connections, inputs = {}) {
    const { spawn } = require('child_process');
    const os = require('os');
    const path = require('path');
    const code = inputs.code !== undefined ? String(inputs.code) : ((node.config && node.config.code) || '');

    if (!code.trim()) return { success: false, error: 'No Python code provided' };

    console.log(`🐍 Executing Python code (${code.length} chars)`);

    const tmpFile = path.join(os.tmpdir(), `wf_python_${Date.now()}.py`);
    
    try {
        await fs.writeFile(tmpFile, code, 'utf8');
        fileResourceManager.trackTempFile(tmpFile);

        return new Promise((resolve) => {
            const python = spawn('python', [tmpFile], { 
                shell: false, 
                stdio: ['pipe', 'pipe', 'pipe'] 
            });
            
            processManager.trackProcess('python-script', python);
            
            let stdout = '', stderr = '';
            python.stdout.on('data', d => { stdout += d.toString(); });
            python.stderr.on('data', d => { stderr += d.toString(); });

            python.on('close', async (exitCode) => {
                processManager.activeProcesses.delete('python-script');
                await fileResourceManager.closeFile(tmpFile);
                await fileResourceManager.cleanupTempFiles();
                
                resolve({
                    success: exitCode === 0, 
                    exitCode,
                    output: stdout.trim(), 
                    stderr: stderr.trim(),
                    result: stdout.trim()
                });
            });

            python.on('error', async (err) => {
                processManager.activeProcesses.delete('python-script');
                await fileResourceManager.closeFile(tmpFile);
                resolve({ 
                    success: false, 
                    error: err.message 
                });
            });
        });
    } catch (error) {
        await fileResourceManager.closeFile(tmpFile);
        return { success: false, error: error.message };
    }
}

// Enhanced executeWriteLog with file handle tracking
async function executeWriteLog(node, workflow, connections, inputs = {}) {
    const path = require('path');
    const config = node.config || {};
    const rawMessage = inputs.message !== undefined ? inputs.message : (config.message || '');
    const message = typeof rawMessage === 'object' ? JSON.stringify(rawMessage, null, 2) : String(rawMessage);
    const level = inputs.level !== undefined ? String(inputs.level) : (config.level || 'info');
    const logFile = config.logFile || path.join(process.cwd(), 'logs', 'workflow.log');

    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    console.log(`📝 Write Log: [${level}] ${message}`);

    try {
        await fs.mkdir(path.dirname(logFile), { recursive: true });
        
        // Use resource manager for file tracking
        const handle = await fs.open(logFile, 'a');
        fileResourceManager.trackFile(logFile, handle);
        
        await handle.appendFile(line, 'utf8');
        await handle.close(); // Properly close handle
        
        if (workflow.io && workflow.io.emit) {
            workflow.io.emit('log_entry', {
                source: 'WriteLog',
                level,
                message,
                data: { workflowId: workflow.id, logFile }
            });
        }

        return { success: true, level, message, logFile, timestamp, logged: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
This approach provides:

Automatic cleanup through resource managers
Process lifecycle tracking
Memory leak prevention
Proper error handling
Graceful shutdown