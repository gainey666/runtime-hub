/**
 * Runtime Hub - Memory Monitor Tests
 * Tests for memory usage monitoring and leak detection
 */

const MemoryMonitor = require('../../../src/utils/memory-monitor');

describe('MemoryMonitor', () => {
    let memoryMonitor;

    beforeEach(() => {
        // Create fresh instance
        delete require.cache[require.resolve('../../../src/utils/memory-monitor')];
        memoryMonitor = require('../../../src/utils/memory-monitor');
    });

    afterEach(() => {
        // Stop monitoring after each test
        memoryMonitor.stop();
    });

    describe('Basic Functionality', () => {
        test('should start and stop monitoring', () => {
            expect(memoryMonitor.isMonitoring).toBe(false);
            
            memoryMonitor.start();
            expect(memoryMonitor.isMonitoring).toBe(true);
            
            memoryMonitor.stop();
            expect(memoryMonitor.isMonitoring).toBe(false);
        });

        test('should not start monitoring twice', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            memoryMonitor.start();
            memoryMonitor.start(); // Second call should warn
            
            expect(consoleSpy).toHaveBeenCalledWith('Memory monitoring already started');
            
            consoleSpy.mockRestore();
        });

        test('should get current memory usage', () => {
            const memoryUsage = memoryMonitor.getCurrentMemoryUsage();
            
            expect(memoryUsage).toHaveProperty('timestamp');
            expect(memoryUsage).toHaveProperty('heapUsed');
            expect(memoryUsage).toHaveProperty('heapTotal');
            expect(memoryUsage).toHaveProperty('external');
            expect(memoryUsage).toHaveProperty('rss');
            expect(memoryUsage).toHaveProperty('heapUsedPercent');
            
            expect(typeof memoryUsage.heapUsed).toBe('number');
            expect(memoryUsage.heapUsed).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Memory Thresholds', () => {
        test('should use default thresholds', () => {
            expect(memoryMonitor.thresholds.warning).toBe(200);
            expect(memoryMonitor.thresholds.critical).toBe(500);
            expect(memoryMonitor.thresholds.leakGrowth).toBe(50);
        });

        test('should accept custom thresholds', () => {
            const customThresholds = { warning: 100, critical: 300 };
            memoryMonitor.start({ thresholds: customThresholds });
            
            expect(memoryMonitor.thresholds.warning).toBe(100);
            expect(memoryMonitor.thresholds.critical).toBe(300);
        });
    });

    describe('Memory History', () => {
        test('should track memory history', (done) => {
            memoryMonitor.start({ intervalMs: 100 }); // Fast interval for testing
            
            setTimeout(() => {
                const stats = memoryMonitor.getMemoryStats();
                expect(stats).toBeDefined();
                expect(stats.samples).toBeGreaterThan(0);
                expect(stats.current).toBeDefined();
                done();
            }, 250); // Wait for at least 2 samples
        });

        test('should limit history size', (done) => {
            memoryMonitor.start({ intervalMs: 10 }); // Very fast interval
            
            setTimeout(() => {
                expect(memoryMonitor.memoryHistory.length).toBeLessThanOrEqual(memoryMonitor.maxHistorySize);
                done();
            }, 100);
        });
    });

    describe('Alert System', () => {
        test('should create alerts for high memory usage', (done) => {
            // Mock high memory usage
            const originalGetCurrentMemory = memoryMonitor.getCurrentMemoryUsage;
            memoryMonitor.getCurrentMemoryUsage = () => ({
                timestamp: Date.now(),
                heapUsed: 600, // Above critical threshold
                heapTotal: 1000,
                external: 50,
                rss: 700,
                heapUsedPercent: 60
            });
            
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            memoryMonitor.start({ intervalMs: 50 });
            
            setTimeout(() => {
                expect(memoryMonitor.alerts.length).toBeGreaterThan(0);
                expect(consoleSpy).toHaveBeenCalledWith(
                    expect.stringContaining('CRITICAL memory usage')
                );
                
                // Restore
                memoryMonitor.getCurrentMemoryUsage = originalGetCurrentMemory;
                consoleSpy.mockRestore();
                done();
            }, 100);
        });

        test('should prevent alert spam', (done) => {
            const originalGetCurrentMemory = memoryMonitor.getCurrentMemoryUsage;
            memoryMonitor.getCurrentMemoryUsage = () => ({
                timestamp: Date.now(),
                heapUsed: 250, // Above warning threshold
                heapTotal: 1000,
                external: 50,
                rss: 700,
                heapUsedPercent: 25
            });
            
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            memoryMonitor.start({ intervalMs: 10 });
            
            setTimeout(() => {
                // Should have limited alerts due to cooldown
                const warningAlerts = memoryMonitor.alerts.filter(a => a.type === 'warning');
                expect(warningAlerts.length).toBeLessThan(3); // Should be throttled
                
                // Restore
                memoryMonitor.getCurrentMemoryUsage = originalGetCurrentMemory;
                consoleSpy.mockRestore();
                done();
            }, 100);
        });
    });

    describe('Memory Leak Detection', () => {
        test('should detect memory growth patterns', (done) => {
            let callCount = 0;
            const originalGetCurrentMemory = memoryMonitor.getCurrentMemoryUsage;
            
            memoryMonitor.getCurrentMemoryUsage = () => {
                callCount++;
                // Simulate growing memory
                return {
                    timestamp: Date.now(),
                    heapUsed: 100 + (callCount * 10), // Growing
                    heapTotal: 1000,
                    external: 50,
                    rss: 700,
                    heapUsedPercent: (100 + (callCount * 10)) / 10
                };
            };
            
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            memoryMonitor.start({ intervalMs: 10 });
            
            setTimeout(() => {
                // Should detect leak after enough data
                const leakAlerts = memoryMonitor.alerts.filter(a => a.type === 'leak');
                expect(leakAlerts.length).toBeGreaterThan(0);
                
                // Restore
                memoryMonitor.getCurrentMemoryUsage = originalGetCurrentMemory;
                consoleSpy.mockRestore();
                done();
            }, 200);
        });
    });

    describe('Statistics and Analysis', () => {
        test('should provide memory statistics', (done) => {
            memoryMonitor.start({ intervalMs: 50 });
            
            setTimeout(() => {
                const stats = memoryMonitor.getMemoryStats();
                
                expect(stats).toBeDefined();
                expect(stats.current).toBeDefined();
                expect(stats.baseline).toBeDefined();
                expect(stats.min).toBeDefined();
                expect(stats.max).toBeDefined();
                expect(stats.average).toBeDefined();
                expect(stats.samples).toBeGreaterThan(0);
                
                done();
            }, 150);
        });

        test('should provide memory trend analysis', (done) => {
            memoryMonitor.start({ intervalMs: 10 });
            
            setTimeout(() => {
                const trend = memoryMonitor.getMemoryTrend();
                
                if (trend) { // Only if enough data
                    expect(trend).toHaveProperty('trend');
                    expect(trend).toHaveProperty('change');
                    expect(['increasing', 'decreasing', 'stable']).toContain(trend.trend);
                }
                
                done();
            }, 200);
        });
    });

    describe('Data Management', () => {
        test('should clear history and reset baseline', () => {
            memoryMonitor.start();
            
            // Wait for some data
            setTimeout(() => {
                const initialStats = memoryMonitor.getMemoryStats();
                expect(initialStats.samples).toBeGreaterThan(0);
                
                memoryMonitor.clearHistory();
                
                const clearedStats = memoryMonitor.getMemoryStats();
                expect(clearedStats.samples).toBe(0);
                expect(memoryMonitor.baselineMemory).toBeDefined();
            }, 100);
        });

        test('should export memory data', () => {
            memoryMonitor.start();
            
            const exportData = memoryMonitor.exportMemoryData();
            
            expect(exportData).toHaveProperty('isMonitoring');
            expect(exportData).toHaveProperty('thresholds');
            expect(exportData).toHaveProperty('baseline');
            expect(exportData).toHaveProperty('history');
            expect(exportData).toHaveProperty('alerts');
            expect(exportData).toHaveProperty('exportTime');
            
            expect(exportData.isMonitoring).toBe(true);
        });
    });

    describe('Garbage Collection', () => {
        test('should attempt to force garbage collection', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            // Mock global.gc
            const originalGC = global.gc;
            global.gc = jest.fn();
            
            const result = memoryMonitor.forceGC();
            
            expect(result).toBe(true);
            expect(global.gc).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('🗑️ Forced garbage collection');
            
            // Restore
            global.gc = originalGC;
            consoleSpy.mockRestore();
        });

        test('should handle missing GC function', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            // Ensure global.gc is undefined
            const originalGC = global.gc;
            delete global.gc;
            
            const result = memoryMonitor.forceGC();
            
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('⚠️ Garbage collection not available (run with --expose-gc)');
            
            // Restore
            if (originalGC) global.gc = originalGC;
            consoleSpy.mockRestore();
        });
    });

    describe('Summary Function', () => {
        test('should provide summary string', () => {
            const summary = memoryMonitor.getSummary();
            expect(typeof summary).toBe('string');
            
            memoryMonitor.start();
            
            setTimeout(() => {
                const activeSummary = memoryMonitor.getSummary();
                expect(activeSummary).toContain('Memory:');
                expect(activeSummary).toContain('baseline:');
                done();
            }, 100);
        });
    });
});
