/**
 * Runtime Logger - Error Capture & Export System
 * Automatically logs errors and exports debugging data
 */

// Check if running in browser or Node.js
const isBrowser = typeof window !== 'undefined';

class ErrorLogger {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.info = [];
        this.logs = [];
        this.systemInfo = {};
        this.startTime = new Date();
        this.maxLogs = 1000; // Prevent memory issues
        this.autoExport = false; // Disabled - causes infinite loop
        this.exporting = false; // Prevent recursion

        if (isBrowser) {
            this.setupErrorCapture();
            this.setupConsoleCapture();
        }
    }

    setupErrorCapture() {
        if (!isBrowser) return;

        // Capture JavaScript errors
        window.addEventListener('error', (event) => {
            this.logError('JavaScript Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error ? event.error.stack : 'No stack trace',
                timestamp: new Date().toISOString()
            });
        });

        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('Unhandled Promise Rejection', {
                reason: event.reason,
                stack: event.reason ? event.reason.stack : 'No stack trace',
                timestamp: new Date().toISOString()
            });
        });
    }

    setupConsoleCapture() {
        if (!isBrowser) return;

        // Override console methods to capture logs
        const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
        };

        console.log = (...args) => {
            originalConsole.log(...args);
            this.logInfo('Console Log', args);
        };

        console.error = (...args) => {
            originalConsole.error(...args);
            this.logError('Console Error', { message: args.join(' '), timestamp: new Date().toISOString() });
        };

        console.warn = (...args) => {
            originalConsole.warn(...args);
            this.logWarning('Console Warning', { message: args.join(' '), timestamp: new Date().toISOString() });
        };

        console.info = (...args) => {
            originalConsole.info(...args);
            this.logInfo('Console Info', args);
        };
    }

    logError(type, data) {
        const errorEntry = {
            id: Date.now(),
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            severity: 'error'
        };
        this.errors.push(errorEntry);
        this.logs.push(errorEntry);

        // Limit log size
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        if (this.errors.length > this.maxLogs) {
            this.errors = this.errors.slice(-this.maxLogs);
        }

        // Auto-export critical errors (browser only)
        if (this.autoExport && isBrowser && (type.includes('Error') || type.includes('Exception'))) {
            this.exportDebugData();
        }
    }

    logWarning(type, data) {
        const logEntry = {
            id: Date.now(),
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            severity: 'warning'
        };
        this.warnings.push(logEntry);
        this.logs.push(logEntry);

        // Limit log size
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        if (this.warnings.length > this.maxLogs) {
            this.warnings = this.warnings.slice(-this.maxLogs);
        }
    }

    logInfo(type, data) {
        const logEntry = {
            id: Date.now(),
            type: type,
            data: data,
            timestamp: new Date().toISOString(),
            severity: 'info'
        };
        this.info.push(logEntry);
        this.logs.push(logEntry);

        // Limit log size
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        if (this.info.length > this.maxLogs) {
            this.info = this.info.slice(-this.maxLogs);
        }
    }

    captureSystemInfo() {
        if (!isBrowser) {
            this.systemInfo = {
                platform: 'Node.js',
                nodeVersion: process.version,
                timestamp: new Date().toISOString()
            };
            return;
        }

        this.systemInfo = {
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            screen: {
                width: screen.width,
                height: screen.height
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            memory: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            } : 'Not available',
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : 'Not available'
        };
    }

    captureNodeEditorState() {
        if (!isBrowser) return { status: 'Not in browser' };

        if (typeof window.nodes !== 'undefined' && typeof window.connections !== 'undefined') {
            return {
                nodeCount: window.nodes.length,
                connectionCount: window.connections.length,
                selectedNode: window.selectedNode ? window.selectedNode.id : null,
                workflowStatus: document.getElementById('workflowStatus') ?
                    document.getElementById('workflowStatus').textContent : 'Unknown',
                connectionStatus: document.getElementById('connectionStatus') ?
                    document.getElementById('connectionStatus').textContent : 'Unknown'
            };
        }
        return { status: 'Node editor not loaded' };
    }

    captureServerStatus() {
        if (!isBrowser) return { status: 'Not in browser' };

        return {
            serverUrl: window.location.origin,
            socketConnected: typeof window.socket !== 'undefined' && window.socket.connected,
            pythonAgents: typeof window.pythonAgents !== 'undefined' ?
                Object.keys(window.pythonAgents).length : 0
        };
    }

    exportDebugData() {
        if (this.exporting) return; // Prevent recursion
        this.exporting = true;

        this.captureSystemInfo();

        const debugData = {
            exportTime: new Date().toISOString(),
            sessionStart: this.startTime.toISOString(),
            systemInfo: this.systemInfo,
            nodeEditorState: this.captureNodeEditorState(),
            serverStatus: this.captureServerStatus(),
            errors: this.errors,
            logs: this.logs.slice(-50),
            summary: {
                totalErrors: this.errors.length,
                totalLogs: this.logs.length,
                errorTypes: this.errors.reduce((acc, err) => {
                    acc[err.type] = (acc[err.type] || 0) + 1;
                    return acc;
                }, {}),
                recentErrors: this.errors.slice(-5).map(err => ({
                    type: err.type,
                    message: err.data.message || 'No message',
                    timestamp: err.timestamp
                }))
            }
        };

        if (isBrowser) {
            // Save to server logs directory
            fetch('/api/logs/debug', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    debugData: debugData,
                    timestamp: Date.now()
                })
            }).catch(err => {
                // Don't use console.error - causes infinite loop
            }).finally(() => {
                this.exporting = false;
            });

            // Also save to localStorage for persistence
            try {
                localStorage.setItem('runtimeLoggerDebug', JSON.stringify(debugData));
            } catch (e) {
                console.warn('Could not save debug data to localStorage:', e);
            }
        }

        return debugData;
    }

    getDebugSummary() {
        return {
            errors: this.errors.length,
            warnings: this.logs.filter(log => log.severity === 'warning').length,
            lastError: this.errors.length > 0 ? this.errors[this.errors.length - 1] : null,
            uptime: Date.now() - this.startTime.getTime()
        };
    }

    clearLogs() {
        this.errors = [];
        this.warnings = [];
        this.info = [];
        this.logs = [];
        if (isBrowser) {
            console.log('🧹 Error logs cleared');
        }
    }
}

// Export for Node.js (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ErrorLogger };
    module.exports.ErrorLogger = ErrorLogger;
    module.exports.default = ErrorLogger;
}

// Initialize error logger in browser
if (isBrowser) {
    window.errorLogger = new ErrorLogger();

    // Export function for manual debugging
    window.exportDebugData = () => {
        return window.errorLogger.exportDebugData();
    };

    // Add debug button to page (bottom-left, small icon)
    document.addEventListener('DOMContentLoaded', () => {
        const debugButton = document.createElement('button');
        debugButton.innerHTML = '🔍';
        debugButton.title = 'Export Debug Data';
        debugButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 100;
            background: #ff4444;
            color: white;
            border: none;
            padding: 10px 12px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;
        debugButton.onclick = () => window.exportDebugData();
        document.body.appendChild(debugButton);
    });
}
