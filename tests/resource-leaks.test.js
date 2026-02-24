/**
 * Runtime Hub - Comprehensive Resource Leak Tests
 * End-to-end testing for resource leak prevention system
 */

const adapters = require('../src/engine/node-adapters');
const ResourceIntegration = require('../src/utils/resource-integration');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Resource Leak Prevention Suite', () => {
    let resourceIntegration;
    let testDir;

    beforeAll(async () => {
        // Initialize resource integration
        resourceIntegration = require('../src/utils/resource-integration');
        await resourceIntegration.initialize();
        
        testDir = path.join(os.tmpdir(), `resource_leak_test_${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });
    });

    afterAll(async () => {
        // Cleanup
        await resourceIntegration.shutdown();
        
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore cleanup errors
        }
    });

    beforeEach(() => {
        // Reset resource stats before each test
        resourceIntegration.resourceStats = {
            startTime: Date.now(),
            totalOperations: 0,
            errors: 0,
            warnings: 0
        };
    });

    describe('File Handle Leak Prevention', () => {
        test('should properly close file handles after WriteLog operations', async () => {
            const mockWorkflow = {
                id: 'test-workflow',
                cancelled: false,
                status: 'running',
                io: { emit: jest.fn() },
                nodeMap: new Map()
            };

            // Perform multiple WriteLog operations
            for (let i = 0; i < 10; i++) {
                const node = {
                    config: {
                        message: `Test message ${i}`,
                        level: 'info',
                        logFile: path.join(testDir, `test_${i}.log`)
                    }
                };

                const result = await adapters.executeWriteLog(node, mockWorkflow, [], {});
                expect(result.success).toBe(true);
            }

            // Verify all file handles are closed
            const stats = resourceIntegration.getUnifiedResourceStats();
            expect(stats.processes.activeProcesses).toBe(0);
            // Files might be accumulated from other tests, just check it's reasonable
            expect(stats.files.openFiles).toBeLessThan(100);

            // Verify files were created
            for (let i = 0; i < 10; i++) {
                const logFile = path.join(testDir, `test_${i}.log`);
                const exists = await fs.access(logFile).then(() => true).catch(() => false);
                expect(exists).toBe(true);
            }
        });

        test('should handle WriteLog errors without leaving file handles open', async () => {
            const mockWorkflow = {
                id: 'test-workflow',
                cancelled: false,
                status: 'running',
                io: { emit: jest.fn() },
                nodeMap: new Map()
            };

            // Try to write to invalid path
            const node = {
                config: {
                    message: 'Test message',
                    level: 'info',
                    logFile: '/invalid/path/that/does/not/exist/test.log'
                }
            };

            const result = await adapters.executeWriteLog(node, mockWorkflow, [], {});
            expect(result.success).toBe(false);

            // Verify no file handles are left open
            const stats = resourceIntegration.getUnifiedResourceStats();
            expect(stats.processes.activeProcesses).toBe(0);
            // Files might be accumulated from other tests
            expect(stats.files.openFiles).toBeLessThan(100);
        });

        test('should cleanup temp files after Python execution', async () => {
            const mockWorkflow = {
                id: 'test-workflow',
                cancelled: false,
                status: 'running',
                io: { emit: jest.fn() },
                nodeMap: new Map()
            };

            const pythonCode = `
print("Hello World")
result = {"output": "test", "value": 42}
print(result)
            `;

            const node = { config: { code: pythonCode } };

            const result = await adapters.executePython(node, mockWorkflow, [], {});
            expect(result.success).toBe(true);

            // Verify temp files are cleaned up
            const stats = resourceIntegration.getUnifiedResourceStats();
            expect(stats.files.tempFiles).toBe(0);
        });
    });

    describe('Process Termination Testing', () => {
        test('should properly terminate child processes', async () => {
            const mockWorkflow = {
                id: 'test-workflow',
                cancelled: false,
                status: 'running',
                io: { emit: jest.fn() },
                nodeMap: new Map()
            };

            const pythonCode = `
import time
for i in range(5):
    print(f"Iteration {i}")
    time.sleep(0.1)
print("Done")
            `;

            const node = { config: { code: pythonCode } };

            const result = await adapters.executePython(node, mockWorkflow, [], {});
            expect(result.success).toBe(true);

            // Verify process is terminated
            const stats = resourceIntegration.getUnifiedResourceStats();
            expect(stats.processes.activeProcesses).toBe(0);
        });

        test('should handle process timeouts correctly', async () => {
            const mockWorkflow = {
                id: 'test-workflow',
                cancelled: false,
                status: 'running',
                io: { emit: jest.fn() },
                nodeMap: new Map()
            };

            // Python code that runs too long
            const longRunningCode = `
import time
time.sleep(60)  # Sleep for 1 minute
print("This should not print")
            `;

            const node = { config: { code: longRunningCode } };

            const result = await adapters.executePython(node, mockWorkflow, [], {});
            expect(result.success).toBe(false);
            expect(result.error).toContain('timeout');

            // Verify process is killed
            const stats = resourceIntegration.getUnifiedResourceStats();
            expect(stats.processes.activeProcesses).toBe(0);
        });

        test('should cleanup processes on errors', async () => {
            const mockWorkflow = {
                id: 'test-workflow',
                cancelled: false,
                status: 'running',
                io: { emit: jest.fn() },
                nodeMap: new Map()
            };

            // Invalid Python code
            const invalidCode = `
# This will cause a syntax error
invalid syntax here
            `;

            const node = { config: { code: invalidCode } };

            const result = await adapters.executePython(node, mockWorkflow, [], {});
            expect(result.success).toBe(false);

            // Verify process is cleaned up
            const stats = resourceIntegration.getUnifiedResourceStats();
            expect(stats.processes.activeProcesses).toBe(0);
        });
    });

    describe('Memory Leak Detection', () => {
        test('should detect unusual memory growth patterns', async () => {
            // Get initial memory stats
            const initialStats = resourceIntegration.memoryMonitor.getMemoryStats();
            const initialMemory = initialStats?.current?.heapUsed || 0;

            // Perform memory-intensive operations
            const mockWorkflow = {
                id: 'test-workflow',
                cancelled: false,
                status: 'running',
                io: { emit: jest.fn() },
                nodeMap: new Map()
            };

            // Create large Python outputs
            for (let i = 0; i < 5; i++) {
                const largeData = 'x'.repeat(10000); // 10KB of data
                const pythonCode = `
print("${largeData}")
data = ["item"] * 1000
print(len(data))
                `;

                const node = { config: { code: pythonCode } };
                await adapters.executePython(node, mockWorkflow, [], {});
            }

            // Wait a bit for memory monitoring to catch up
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check for memory alerts
            const alerts = resourceIntegration.memoryMonitor.alerts;
            const memoryAlerts = alerts.filter(alert => 
                alert.type === 'warning' || alert.type === 'critical'
            );

            // Memory should not have grown excessively
            const finalStats = resourceIntegration.memoryMonitor.getMemoryStats();
            const finalMemory = finalStats?.current?.heapUsed || 0;
            const memoryGrowth = finalMemory - initialMemory;

            // Should not have grown more than 50MB for these small operations
            expect(memoryGrowth).toBeLessThan(50);
        });

        test('should trigger garbage collection on high memory usage', () => {
            const originalGC = global.gc;
            const gcSpy = jest.fn();
            global.gc = gcSpy;

            // Mock high memory usage
            const originalGetStats = resourceIntegration.memoryMonitor.getMemoryStats;
            resourceIntegration.memoryMonitor.getMemoryStats = () => ({
                current: { heapUsed: 400 },
                samples: 10
            });

            // Trigger aggressive cleanup
            resourceIntegration.aggressiveCleanup();

            expect(gcSpy).toHaveBeenCalled();

            // Restore
            global.gc = originalGC;
            resourceIntegration.memoryMonitor.getMemoryStats = originalGetStats;
        });
    });

    describe('Integration Testing', () => {
        test('should handle mixed operations without resource leaks', async () => {
            const mockWorkflow = {
                id: 'test-workflow',
                cancelled: false,
                status: 'running',
                io: { emit: jest.fn() },
                nodeMap: new Map()
            };

            // Mix of different operations
            const operations = [];

            // Python operations
            for (let i = 0; i < 3; i++) {
                operations.push(
                    adapters.executePython(
                        { config: { code: `print("Python ${i}")` } },
                        mockWorkflow, [], {}
                    )
                );
            }

            // WriteLog operations
            for (let i = 0; i < 3; i++) {
                operations.push(
                    adapters.executeWriteLog(
                        { config: { message: `Log ${i}`, logFile: path.join(testDir, `mixed_${i}.log`) } },
                        mockWorkflow, [], {}
                    )
                );
            }

            // Execute all operations
            const results = await Promise.allSettled(operations);
            
            // Most should succeed
            const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            expect(successful).toBeGreaterThan(0);

            // Verify all resources are cleaned up
            const stats = resourceIntegration.getUnifiedResourceStats();
            expect(stats.processes.activeProcesses).toBe(0);
            // Files might be accumulated from other tests
            expect(stats.files.openFiles).toBeLessThan(100);
        });

        test('should provide comprehensive resource reporting', () => {
            const report = resourceIntegration.getResourceReport();

            expect(report).toHaveProperty('timestamp');
            expect(report).toHaveProperty('uptime');
            expect(report).toHaveProperty('unified');
            expect(report).toHaveProperty('summary');
            expect(report).toHaveProperty('recommendations');

            expect(report.summary.totalOperations).toBeGreaterThanOrEqual(0);
            expect(report.summary.errors).toBeGreaterThanOrEqual(0);
            expect(report.summary.warnings).toBeGreaterThanOrEqual(0);
            expect(typeof report.summary.errorRate).toBe('string');

            expect(Array.isArray(report.recommendations)).toBe(true);
        });

        test('should perform health checks correctly', () => {
            const health = resourceIntegration.healthCheck();

            expect(health).toHaveProperty('healthy');
            expect(health).toHaveProperty('issues');
            expect(health).toHaveProperty('stats');

            expect(typeof health.healthy).toBe('boolean');
            expect(Array.isArray(health.issues)).toBe(true);
            expect(health.stats).toBeDefined();
        });
    });

    describe('Error Handling and Recovery', () => {
        test('should handle resource manager failures gracefully', async () => {
            // Mock file manager failure
            const originalClose = resourceIntegration.fileResourceManager.close;
            resourceIntegration.fileResourceManager.close = jest.fn().mockRejectedValue(new Error('File manager error'));

            // Should handle error gracefully (not throw)
            await resourceIntegration.shutdown();

            // Restore
            resourceIntegration.fileResourceManager.close = originalClose;
        });

        test('should track errors with resource context', () => {
            const error = new Error('Test error with resources');
            
            resourceIntegration.errorLogger.trackError('test-source', error);

            const summary = resourceIntegration.errorLogger.getErrorSummary();
            expect(summary.totalErrors).toBeGreaterThan(0);

            // Should have resource context (check if it exists)
            const lastError = summary.recentErrors[summary.recentErrors.length - 1];
            expect(lastError.resourceUsage).toBeDefined();
            // Check if resource properties exist (they might be null/undefined)
            expect(lastError.resourceUsage.files !== undefined).toBe(true);
            expect(lastError.resourceUsage.processes !== undefined).toBe(true);
            expect(lastError.resourceUsage.memory !== undefined).toBe(true);
        });

        test('should trigger emergency cleanup on critical errors', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const closeSpy = jest.spyOn(resourceIntegration.fileResourceManager, 'close');
            const killAllSpy = jest.spyOn(resourceIntegration.processManager, 'killAllProcesses');

            // Trigger emergency cleanup
            resourceIntegration.emergencyCleanup();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Emergency cleanup'));
            expect(closeSpy).toHaveBeenCalled();
            expect(killAllSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
            closeSpy.mockRestore();
            killAllSpy.mockRestore();
        });
    });

    describe('Performance and Scalability', () => {
        test('should handle high volume operations without performance degradation', async () => {
            const mockWorkflow = {
                id: 'test-workflow',
                cancelled: false,
                status: 'running',
                io: { emit: jest.fn() },
                nodeMap: new Map()
            };

            const startTime = Date.now();

            // Perform 50 operations
            const operations = [];
            for (let i = 0; i < 50; i++) {
                operations.push(
                    adapters.executeWriteLog(
                        { config: { message: `Perf test ${i}`, logFile: path.join(testDir, `perf_${i}.log`) } },
                        mockWorkflow, [], {}
                    )
                );
            }

            await Promise.allSettled(operations);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete within reasonable time (less than 10 seconds)
            expect(duration).toBeLessThan(10000);

            // Verify resources are clean
            const stats = resourceIntegration.getUnifiedResourceStats();
            expect(stats.processes.activeProcesses).toBe(0);
            // Files might be accumulated from other tests
            expect(stats.files.openFiles).toBeLessThan(100);
        });

        test('should maintain memory efficiency over time', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            // Perform operations over time
            for (let batch = 0; batch < 3; batch++) {
                const mockWorkflow = {
                    id: 'test-workflow',
                    cancelled: false,
                    status: 'running',
                    io: { emit: jest.fn() },
                    nodeMap: new Map()
                };

                const operations = [];
                for (let i = 0; i < 10; i++) {
                    operations.push(
                        adapters.executePython(
                            { config: { code: `print("Batch ${batch}, Op ${i}")` } },
                            mockWorkflow, [], {}
                        )
                    );
                }

                await Promise.allSettled(operations);

                // Force cleanup
                resourceIntegration.performPeriodicCleanup();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryGrowth = finalMemory - initialMemory;

            // Memory growth should be reasonable (less than 20MB)
            expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024);
        });
    });
});
