/**
 * Runtime Hub - Memory Usage Monitor
 * Monitor heap usage and warn on leaks
 */

class MemoryMonitor {
    constructor() {
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.memoryHistory = [];
        this.maxHistorySize = 720; // 1 hour of 5-second intervals
        this.thresholds = {
            warning: 200, // MB
            critical: 500, // MB
            leakGrowth: 50 // MB growth over 5 minutes
        };
        this.alerts = [];
        this.baselineMemory = null;
        this.lastAlertTime = 0;
        this.alertCooldown = 30000; // 30 seconds between alerts
    }

    /**
     * Start memory monitoring
     */
    start(options = {}) {
        if (this.isMonitoring) {
            console.warn('Memory monitoring already started');
            return;
        }

        // Override defaults with options
        this.thresholds = { ...this.thresholds, ...options.thresholds };
        const intervalMs = options.intervalMs || 5000; // 5 seconds default

        // Set baseline memory
        this.baselineMemory = this.getCurrentMemoryUsage();
        
        this.isMonitoring = true;
        console.log(`🔍 Memory monitoring started (interval: ${intervalMs}ms)`);
        console.log(`📊 Baseline memory: ${this.baselineMemory.heapUsed}MB`);

        // Start monitoring loop
        this.monitoringInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, intervalMs);

        // Setup graceful shutdown
        this.setupGracefulShutdown();
    }

    /**
     * Stop memory monitoring
     */
    stop() {
        if (!this.isMonitoring) {
            return;
        }

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.isMonitoring = false;
        console.log('🔍 Memory monitoring stopped');
    }

    /**
     * Get current memory usage
     */
    getCurrentMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            timestamp: Date.now(),
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
            external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
            rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
            heapUsedPercent: Math.round((usage.heapUsed / usage.heapTotal) * 10000) / 100
        };
    }

    /**
     * Check memory usage and alert if necessary
     */
    checkMemoryUsage() {
        const currentMemory = this.getCurrentMemoryUsage();
        
        // Add to history
        this.memoryHistory.push(currentMemory);
        if (this.memoryHistory.length > this.maxHistorySize) {
            this.memoryHistory.shift();
        }

        // Check thresholds
        this.checkThresholds(currentMemory);
        
        // Check for memory leaks
        this.checkForMemoryLeaks(currentMemory);
        
        // Report to fileResourceManager if needed
        this.reportToFileManager(currentMemory);
    }

    /**
     * Check memory thresholds
     */
    checkThresholds(currentMemory) {
        const { heapUsed } = currentMemory;
        
        if (heapUsed >= this.thresholds.critical) {
            this.alert('critical', `CRITICAL memory usage: ${heapUsed}MB (threshold: ${this.thresholds.critical}MB)`, currentMemory);
        } else if (heapUsed >= this.thresholds.warning) {
            this.alert('warning', `High memory usage: ${heapUsed}MB (threshold: ${this.thresholds.warning}MB)`, currentMemory);
        }
    }

    /**
     * Check for memory leaks (unusual growth patterns)
     */
    checkForMemoryLeaks(currentMemory) {
        if (this.memoryHistory.length < 60) { // Need at least 5 minutes of data
            return;
        }

        // Check memory growth over last 5 minutes
        const fiveMinutesAgo = Date.now() - 300000;
        const oldMemory = this.memoryHistory.find(m => m.timestamp >= fiveMinutesAgo);
        
        if (oldMemory) {
            const growth = currentMemory.heapUsed - oldMemory.heapUsed;
            
            if (growth >= this.thresholds.leakGrowth) {
                this.alert('leak', `Potential memory leak detected: +${growth.toFixed(2)}MB over 5 minutes`, {
                    current: currentMemory,
                    baseline: oldMemory,
                    growth
                });
            }
        }
    }

    /**
     * Report memory issues to fileResourceManager
     */
    reportToFileManager(currentMemory) {
        if (currentMemory.heapUsed >= this.thresholds.warning) {
            try {
                const fileResourceManager = require('./file-resource-manager');
                const stats = fileResourceManager.getStats();
                
                if (stats.openFiles > 20 || stats.tempFiles > 10) {
                    console.warn(`🧠 High memory usage with many files: ${currentMemory.heapUsed}MB, ${stats.openFiles} open files, ${stats.tempFiles} temp files`);
                }
            } catch (err) {
                // File manager not available
            }
        }
    }

    /**
     * Create alert
     */
    alert(type, message, data = {}) {
        const now = Date.now();
        
        // Prevent alert spam
        if (now - this.lastAlertTime < this.alertCooldown && type !== 'critical') {
            return;
        }
        
        this.lastAlertTime = now;
        
        const alert = {
            id: now,
            timestamp: new Date().toISOString(),
            type,
            message,
            data
        };
        
        this.alerts.push(alert);
        
        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }
        
        // Log alert
        const emoji = this.getAlertEmoji(type);
        console.log(`${emoji} ${message}`);
        
        // Additional context for critical alerts
        if (type === 'critical') {
            console.log('   📊 Memory details:', data);
            console.log('   🔧 Suggestion: Consider restarting the application');
        }
    }

    /**
     * Get alert emoji
     */
    getAlertEmoji(type) {
        switch (type) {
            case 'critical': return '🚨';
            case 'warning': return '⚠️';
            case 'leak': return '🔍';
            default: return 'ℹ️';
        }
    }

    /**
     * Get memory statistics
     */
    getMemoryStats() {
        if (this.memoryHistory.length === 0) {
            return null;
        }

        const heapUsages = this.memoryHistory.map(m => m.heapUsed);
        const current = this.memoryHistory[this.memoryHistory.length - 1];
        
        return {
            current,
            baseline: this.baselineMemory,
            min: Math.min(...heapUsages),
            max: Math.max(...heapUsages),
            average: heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length,
            samples: this.memoryHistory.length,
            alerts: this.alerts.length,
            growthFromBaseline: current.heapUsed - (this.baselineMemory?.heapUsed || 0)
        };
    }

    /**
     * Get memory trend analysis
     */
    getMemoryTrend() {
        if (this.memoryHistory.length < 12) { // Need at least 1 minute
            return null;
        }

        const recent = this.memoryHistory.slice(-12); // Last minute
        const older = this.memoryHistory.slice(-24, -12); // Previous minute
        
        if (older.length === 0) return null;
        
        const recentAvg = recent.reduce((sum, m) => sum + m.heapUsed, 0) / recent.length;
        const olderAvg = older.reduce((sum, m) => sum + m.heapUsed, 0) / older.length;
        
        const trend = recentAvg - olderAvg;
        
        return {
            trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
            change: trend,
            recentAverage: recentAvg,
            olderAverage: olderAvg,
            confidence: this.memoryHistory.length >= 60 ? 'high' : 'low'
        };
    }

    /**
     * Export memory data for analysis
     */
    exportMemoryData() {
        return {
            isMonitoring: this.isMonitoring,
            thresholds: this.thresholds,
            baseline: this.baselineMemory,
            history: this.memoryHistory,
            alerts: this.alerts,
            stats: this.getMemoryStats(),
            trend: this.getMemoryTrend(),
            exportTime: new Date().toISOString()
        };
    }

    /**
     * Clear memory history
     */
    clearHistory() {
        this.memoryHistory = [];
        this.alerts = [];
        this.baselineMemory = this.getCurrentMemoryUsage();
        console.log('🧹 Memory history cleared, new baseline set');
    }

    /**
     * Setup graceful shutdown
     */
    setupGracefulShutdown() {
        const shutdown = () => {
            console.log('🔍 Memory monitor shutting down...');
            this.stop();
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        process.on('exit', shutdown);
    }

    /**
     * Force garbage collection if available
     */
    forceGC() {
        if (global.gc) {
            global.gc();
            console.log('🗑️ Forced garbage collection');
            return true;
        } else {
            console.log('⚠️ Garbage collection not available (run with --expose-gc)');
            return false;
        }
    }

    /**
     * Get memory usage summary for logging
     */
    getSummary() {
        const stats = this.getMemoryStats();
        const trend = this.getMemoryTrend();
        
        if (!stats) {
            return 'Memory monitoring not active';
        }
        
        return `Memory: ${stats.current.heapUsed}MB (baseline: ${stats.baseline.heapUsed}MB, trend: ${trend?.trend || 'unknown'})`;
    }
}

// Singleton instance
module.exports = new MemoryMonitor();
