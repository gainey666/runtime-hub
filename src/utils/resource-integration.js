/**
 * Runtime Hub - Resource Manager Integration Layer
 * Coordinate file + process managers for unified resource management
 */

class ResourceIntegration {
    constructor() {
        this.fileResourceManager = null;
        this.processManager = null;
        this.errorLogger = null;
        this.memoryMonitor = null;
        this.initialized = false;
        this.resourceStats = {
            startTime: Date.now(),
            totalOperations: 0,
            errors: 0,
            warnings: 0
        };
        this.cleanupTasks = new Map();
        this.coordinationEnabled = false;
    }

    /**
     * Initialize resource integration
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Load resource managers
            this.fileResourceManager = require('./file-resource-manager');
            this.processManager = require('./process-manager');
            this.errorLogger = require('./error-logger');
            this.memoryMonitor = require('./memory-monitor');

            // Initialize components
            await this.errorLogger.initialize();
            this.memoryMonitor.start();
            
            // Setup coordination
            this.setupCoordination();
            
            this.initialized = true;
            console.log('🔗 Resource Integration initialized');
            
        } catch (err) {
            console.error('❌ Failed to initialize resource integration:', err.message);
            this.errorLogger?.trackError('ResourceIntegration', err);
        }
    }

    /**
     * Setup coordination between resource managers
     */
    setupCoordination() {
        this.coordinationEnabled = true;
        
        // Setup process-file coordination
        this.setupProcessFileCoordination();
        
        // Setup memory-resource coordination
        this.setupMemoryResourceCoordination();
        
        // Setup error handling coordination
        this.setupErrorCoordination();
        
        // Setup periodic cleanup
        this.setupPeriodicCleanup();
    }

    /**
     * Setup coordination between processes and files
     */
    setupProcessFileCoordination() {
        // Override process tracking to coordinate with files
        const originalTrackProcess = this.processManager.trackProcess;
        this.processManager.trackProcess = (name, process, timeoutMs) => {
            const result = originalTrackProcess.call(this.processManager, name, process, timeoutMs);
            
            // Track associated files for this process
            this.trackProcessFiles(name, process);
            
            return result;
        };

        // Override process killing to cleanup associated files
        const originalKillProcess = this.processManager.killProcess;
        this.processManager.killProcess = (name) => {
            // Cleanup associated files before killing process
            this.cleanupProcessFiles(name);
            
            return originalKillProcess.call(this.processManager, name);
        };
    }

    /**
     * Setup memory-resource coordination
     */
    setupMemoryResourceCoordination() {
        // Monitor memory and adjust resource limits
        const memoryCheckInterval = setInterval(() => {
            if (!this.coordinationEnabled) {
                clearInterval(memoryCheckInterval);
                return;
            }
            
            const memoryStats = this.memoryMonitor.getMemoryStats();
            if (memoryStats && memoryStats.current.heapUsed > 300) {
                // High memory usage - be more aggressive with cleanup
                this.aggressiveCleanup();
            }
        }, 10000); // Check every 10 seconds

        // Store interval for cleanup
        this.cleanupTasks.set('memoryCheck', memoryCheckInterval);
    }

    /**
     * Setup error coordination
     */
    setupErrorCoordination() {
        // Intercept error logger to add resource context
        const originalTrackError = this.errorLogger.trackError;
        this.errorLogger.trackError = (source, error, resourceUsage = {}) => {
            // Add comprehensive resource context
            const enhancedResourceUsage = {
                ...resourceUsage,
                ...this.getUnifiedResourceStats()
            };
            
            const result = originalTrackError.call(this.errorLogger, source, error, enhancedResourceUsage);
            
            // Update error count
            this.resourceStats.errors++;
            
            // Trigger cleanup on errors
            if (error.code === 'EMFILE' || error.code === 'ENFILE') {
                console.warn('🧹 File limit error detected, triggering cleanup');
                this.emergencyCleanup();
            }
            
            return result;
        };
    }

    /**
     * Track files associated with a process
     */
    trackProcessFiles(processName, process) {
        const processFiles = new Set();
        
        // Monitor for file operations by this process
        // This is a simplified implementation - in production you'd use more sophisticated tracking
        const fileCheckInterval = setInterval(() => {
            if (process.killed || !this.processManager.activeProcesses.has(processName)) {
                clearInterval(fileCheckInterval);
                return;
            }
            
            // Check for new files associated with this process
            const fileStats = this.fileResourceManager.getStats();
            if (fileStats.tempFiles > 0) {
                console.log(`📁 Process ${processName} has ${fileStats.tempFiles} temp files`);
            }
        }, 5000);
        
        this.cleanupTasks.set(`processFiles_${processName}`, fileCheckInterval);
    }

    /**
     * Cleanup files associated with a process
     */
    cleanupProcessFiles(processName) {
        // Clear file tracking for this process
        const fileCheckTask = this.cleanupTasks.get(`processFiles_${processName}`);
        if (fileCheckTask) {
            clearInterval(fileCheckTask);
            this.cleanupTasks.delete(`processFiles_${processName}`);
        }
        
        // Force cleanup of temp files
        this.fileResourceManager.cleanupTempFiles();
    }

    /**
     * Get unified resource statistics
     */
    getUnifiedResourceStats() {
        try {
            const fileStats = this.fileResourceManager.getStats();
            const processStats = this.processManager.getStats();
            const memoryStats = this.memoryMonitor.getMemoryStats();
            
            return {
                files: fileStats,
                processes: processStats,
                memory: memoryStats?.current || null,
                integration: this.resourceStats
            };
        } catch (err) {
            return { error: err.message };
        }
    }

    /**
     * Setup periodic cleanup
     */
    setupPeriodicCleanup() {
        const cleanupInterval = setInterval(() => {
            if (!this.coordinationEnabled) {
                clearInterval(cleanupInterval);
                return;
            }
            
            this.performPeriodicCleanup();
        }, 60000); // Every minute
        
        this.cleanupTasks.set('periodicCleanup', cleanupInterval);
    }

    /**
     * Perform periodic cleanup
     */
    performPeriodicCleanup() {
        const stats = this.getUnifiedResourceStats();
        
        // Cleanup temp files older than 1 hour
        this.fileResourceManager.cleanupTempFiles();
        
        // Log resource status
        console.log(`🧹 Periodic cleanup - Files: ${stats.files.openFiles}, Processes: ${stats.processes.activeProcesses}`);
        
        // Update operation count
        this.resourceStats.totalOperations++;
    }

    /**
     * Aggressive cleanup for high memory usage
     */
    aggressiveCleanup() {
        console.log('🚨 High memory usage detected - performing aggressive cleanup');
        
        // Force garbage collection
        this.memoryMonitor.forceGC();
        
        // Cleanup all temp files
        this.fileResourceManager.cleanupTempFiles();
        
        // Kill long-running processes
        const processStats = this.processManager.getStats();
        for (const processInfo of processStats.processes) {
            if (processInfo.runningTime > 300000) { // 5 minutes
                console.log(`⚡ Killing long-running process: ${processInfo.name}`);
                this.processManager.killProcess(processInfo.name);
            }
        }
        
        this.resourceStats.warnings++;
    }

    /**
     * Emergency cleanup for critical errors
     */
    emergencyCleanup() {
        console.log('🚨 Emergency cleanup triggered');
        
        // Close all file handles
        this.fileResourceManager.close();
        
        // Kill all processes
        this.processManager.killAllProcesses();
        
        // Force garbage collection
        this.memoryMonitor.forceGC();
        
        // Reinitialize file manager
        setTimeout(() => {
            this.fileResourceManager.closed = false;
        }, 1000);
    }

    /**
     * Execute operation with resource tracking
     */
    async executeWithTracking(operationName, operationFn) {
        const startTime = Date.now();
        const startStats = this.getUnifiedResourceStats();
        
        try {
            const result = await operationFn();
            
            const endTime = Date.now();
            const endStats = this.getUnifiedResourceStats();
            
            // Log successful operation
            console.log(`✅ ${operationName} completed in ${endTime - startTime}ms`);
            
            this.resourceStats.totalOperations++;
            
            return result;
            
        } catch (error) {
            const endTime = Date.now();
            const endStats = this.getUnifiedResourceStats();
            
            // Log failed operation
            console.error(`❌ ${operationName} failed in ${endTime - startTime}ms:`, error.message);
            
            // Track error with resource context
            this.errorLogger.trackError(operationName, error, {
                operation: operationName,
                duration: endTime - startTime,
                startStats,
                endStats
            });
            
            throw error;
        }
    }

    /**
     * Get comprehensive resource report
     */
    getResourceReport() {
        const unifiedStats = this.getUnifiedResourceStats();
        const memoryTrend = this.memoryMonitor.getMemoryTrend();
        
        return {
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.resourceStats.startTime,
            unified: unifiedStats,
            memoryTrend,
            summary: {
                totalOperations: this.resourceStats.totalOperations,
                errors: this.resourceStats.errors,
                warnings: this.resourceStats.warnings,
                errorRate: this.resourceStats.totalOperations > 0 
                    ? (this.resourceStats.errors / this.resourceStats.totalOperations * 100).toFixed(2) + '%'
                    : '0%'
            },
            recommendations: this.generateRecommendations(unifiedStats)
        };
    }

    /**
     * Generate recommendations based on resource stats
     */
    generateRecommendations(stats) {
        const recommendations = [];
        
        if (stats.memory && stats.memory.heapUsed > 200) {
            recommendations.push('Consider optimizing memory usage or increasing available memory');
        }
        
        if (stats.files.openFiles > 50) {
            recommendations.push('Many open files detected - ensure proper file handle cleanup');
        }
        
        if (stats.processes.activeProcesses > 10) {
            recommendations.push('High process count - consider process pooling or cleanup');
        }
        
        if (this.resourceStats.errorRate > 10) {
            recommendations.push('High error rate detected - review error logs for patterns');
        }
        
        return recommendations;
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('🔗 Shutting down Resource Integration...');
        
        this.coordinationEnabled = false;
        
        // Clear all cleanup tasks
        for (const [name, task] of this.cleanupTasks) {
            clearInterval(task);
        }
        this.cleanupTasks.clear();
        
        // Shutdown components
        this.memoryMonitor.stop();
        await this.fileResourceManager.close();
        this.processManager.killAllProcesses();
        
        console.log('🔗 Resource Integration shutdown complete');
    }

    /**
     * Health check
     */
    healthCheck() {
        const stats = this.getUnifiedResourceStats();
        
        return {
            healthy: this.initialized && this.coordinationEnabled,
            issues: this.detectIssues(stats),
            stats: stats
        };
    }

    /**
     * Detect resource issues
     */
    detectIssues(stats) {
        const issues = [];
        
        if (stats.memory && stats.memory.heapUsed > 500) {
            issues.push('Critical memory usage');
        }
        
        if (stats.files.openFiles > 100) {
            issues.push('Too many open files');
        }
        
        if (stats.processes.activeProcesses > 20) {
            issues.push('Too many active processes');
        }
        
        if (this.resourceStats.errorRate > 20) {
            issues.push('High error rate');
        }
        
        return issues;
    }
}

// Singleton instance
module.exports = new ResourceIntegration();
