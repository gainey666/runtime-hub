/**
 * Runtime Hub - Enhanced Error Logger with Resource Tracking
 * Robust error logging system that automatically tracks resource usage
 */

class ErrorLogger {
    constructor() {
        this.errors = [];
        this.resourceStats = new Map();
        this.errorPatterns = new Map();
        this.maxErrors = 1000; // Prevent memory leaks
        this.logFile = null;
        this.initialized = false;
    }

    /**
     * Initialize error logger with optional log file
     */
    async initialize(logFile = null) {
        if (this.initialized) return;
        
        this.logFile = logFile;
        this.initialized = true;
        
        // Setup periodic resource monitoring
        this.setupResourceMonitoring();
        
        console.log('🔍 Enhanced Error Logger initialized');
    }

    /**
     * Track error with resource context
     */
    trackError(source, error, resourceUsage = {}) {
        const errorEntry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            source,
            error: {
                message: error.message || String(error),
                stack: error.stack,
                code: error.code,
                name: error.name
            },
            resourceUsage: {
                memory: this.getCurrentMemoryUsage(),
                openFiles: this.getOpenFileCount(),
                activeProcesses: this.getActiveProcessCount(),
                custom: resourceUsage
            },
            severity: this.determineSeverity(error, resourceUsage)
        };

        // Store error (prevent memory leaks)
        this.errors.push(errorEntry);
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(-this.maxErrors);
        }

        // Track patterns
        this.trackErrorPatterns(source, error);

        // Log to console
        this.logError(errorEntry);

        // Log to file if configured
        if (this.logFile) {
            this.writeToFile(errorEntry);
        }

        // Auto-report resource leaks
        this.checkForResourceLeaks(errorEntry);

        return errorEntry.id;
    }

    /**
     * Get current memory usage
     */
    getCurrentMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
            external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
            rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100
        };
    }

    /**
     * Get open file count (placeholder)
     */
    getOpenFileCount() {
        // This would integrate with fileResourceManager
        try {
            const fileResourceManager = require('./file-resource-manager');
            return fileResourceManager.getStats().openFiles;
        } catch (err) {
            return 0;
        }
    }

    /**
     * Get active process count (placeholder)
     */
    getActiveProcessCount() {
        // This would integrate with processManager
        try {
            const processManager = require('./process-manager');
            return processManager.getStats().activeProcesses;
        } catch (err) {
            return 0;
        }
    }

    /**
     * Determine error severity based on context
     */
    determineSeverity(error, resourceUsage) {
        // High severity if resources are high
        const memoryUsage = this.getCurrentMemoryUsage();
        if (memoryUsage.heapUsed > 500) return 'critical';
        if (memoryUsage.heapUsed > 200) return 'high';
        
        // High severity if many files/processes
        if (this.getOpenFileCount() > 50) return 'high';
        if (this.getActiveProcessCount() > 10) return 'high';
        
        // Medium severity for common errors
        if (error.code === 'ENOENT' || error.code === 'EACCES') return 'medium';
        
        // Low severity for warnings
        return 'low';
    }

    /**
     * Track error patterns for analysis
     */
    trackErrorPatterns(source, error) {
        const key = `${source}:${error.code || error.name}`;
        const pattern = this.errorPatterns.get(key) || {
            count: 0,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            samples: []
        };
        
        pattern.count++;
        pattern.lastSeen = Date.now();
        
        // Keep sample error messages
        if (pattern.samples.length < 5) {
            pattern.samples.push(error.message);
        }
        
        this.errorPatterns.set(key, pattern);
    }

    /**
     * Log error to console
     */
    logError(errorEntry) {
        const emoji = this.getSeverityEmoji(errorEntry.severity);
        console.log(`${emoji} [${errorEntry.severity.toUpperCase()}] ${errorEntry.source}: ${errorEntry.error.message}`);
        
        if (errorEntry.resourceUsage.memory.heapUsed > 100) {
            console.log(`   📊 Memory: ${errorEntry.resourceUsage.memory.heapUsed}MB`);
        }
        
        if (errorEntry.resourceUsage.openFiles > 0) {
            console.log(`   📁 Open files: ${errorEntry.resourceUsage.openFiles}`);
        }
        
        if (errorEntry.resourceUsage.activeProcesses > 0) {
            console.log(`   ⚡ Active processes: ${errorEntry.resourceUsage.activeProcesses}`);
        }
    }

    /**
     * Write error to file
     */
    async writeToFile(errorEntry) {
        try {
            const fs = require('fs').promises;
            const logLine = JSON.stringify(errorEntry) + '\n';
            await fs.appendFile(this.logFile, logLine, 'utf8');
        } catch (err) {
            console.warn('Failed to write error to file:', err.message);
        }
    }

    /**
     * Check for resource leaks
     */
    checkForResourceLeaks(errorEntry) {
        const { resourceUsage } = errorEntry;
        
        // Check for high memory usage
        if (resourceUsage.memory.heapUsed > 200) {
            console.warn(`🚨 HIGH MEMORY USAGE DETECTED: ${resourceUsage.memory.heapUsed}MB`);
        }
        
        // Check for many open files
        if (resourceUsage.openFiles > 20) {
            console.warn(`🚨 MANY OPEN FILES DETECTED: ${resourceUsage.openFiles}`);
        }
        
        // Check for many active processes
        if (resourceUsage.activeProcesses > 5) {
            console.warn(`🚨 MANY ACTIVE PROCESSES DETECTED: ${resourceUsage.activeProcesses}`);
        }
    }

    /**
     * Setup periodic resource monitoring
     */
    setupResourceMonitoring() {
        setInterval(() => {
            const memoryUsage = this.getCurrentMemoryUsage();
            const openFiles = this.getOpenFileCount();
            const activeProcesses = this.getActiveProcessCount();
            
            // Store resource stats
            this.resourceStats.set(Date.now(), {
                memory: memoryUsage,
                openFiles,
                activeProcesses
            });
            
            // Keep only last hour of stats
            const oneHourAgo = Date.now() - 3600000;
            for (const [timestamp] of this.resourceStats) {
                if (timestamp < oneHourAgo) {
                    this.resourceStats.delete(timestamp);
                }
            }
            
            // Check for concerning patterns
            if (memoryUsage.heapUsed > 300) {
                console.warn(`⚠️ High memory usage: ${memoryUsage.heapUsed}MB`);
            }
            
        }, 5000); // Every 5 seconds
    }

    /**
     * Get severity emoji
     */
    getSeverityEmoji(severity) {
        switch (severity) {
            case 'critical': return '🚨';
            case 'high': return '⚠️';
            case 'medium': return '⚡';
            case 'low': return 'ℹ️';
            default: return '❓';
        }
    }

    /**
     * Get error summary
     */
    getErrorSummary() {
        const summary = {
            totalErrors: this.errors.length,
            bySeverity: {},
            bySource: {},
            patterns: Array.from(this.errorPatterns.entries()).map(([key, pattern]) => ({
                key,
                count: pattern.count,
                firstSeen: new Date(pattern.firstSeen).toISOString(),
                lastSeen: new Date(pattern.lastSeen).toISOString(),
                samples: pattern.samples
            })),
            recentErrors: this.errors.slice(-10),
            resourceStats: Array.from(this.resourceStats.entries()).slice(-10)
        };
        
        // Count by severity
        for (const error of this.errors) {
            summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + 1;
        }
        
        // Count by source
        for (const error of this.errors) {
            summary.bySource[error.source] = (summary.bySource[error.source] || 0) + 1;
        }
        
        return summary;
    }

    /**
     * Clear old errors
     */
    clearOldErrors(olderThanHours = 24) {
        const cutoff = Date.now() - (olderThanHours * 3600000);
        this.errors = this.errors.filter(error => 
            new Date(error.timestamp).getTime() > cutoff
        );
    }

    /**
     * Export error data for analysis
     */
    exportErrors() {
        return {
            errors: this.errors,
            patterns: Object.fromEntries(this.errorPatterns),
            resourceStats: Object.fromEntries(this.resourceStats),
            summary: this.getErrorSummary()
        };
    }
}

// Singleton instance
module.exports = new ErrorLogger();
