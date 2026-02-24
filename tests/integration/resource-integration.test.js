/**
 * Runtime Hub - Resource Integration Tests
 * Integration tests for coordinated resource management
 */

const ResourceIntegration = require('../../src/utils/resource-integration');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Resource Integration', () => {
    let resourceIntegration;
    let testDir;

    beforeEach(async () => {
        // Create fresh instance
        delete require.cache[require.resolve('../../src/utils/resource-integration')];
        resourceIntegration = require('../../src/utils/resource-integration');
        
        testDir = path.join(os.tmpdir(), `integration_test_${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });
        
        // Initialize integration
        await resourceIntegration.initialize();
    });

    afterEach(async () => {
        // Cleanup
        await resourceIntegration.shutdown();
        
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore cleanup errors
        }
    });

    describe('Initialization', () => {
        test('should initialize successfully', () => {
            expect(resourceIntegration.initialized).toBe(true);
            expect(resourceIntegration.coordinationEnabled).toBe(true);
        });

        test('should load all resource managers', () => {
            expect(resourceIntegration.fileResourceManager).toBeDefined();
            expect(resourceIntegration.processManager).toBeDefined();
            expect(resourceIntegration.errorLogger).toBeDefined();
            expect(resourceIntegration.memoryMonitor).toBeDefined();
        });
    });

    describe('Resource Coordination', () => {
        test('should provide unified resource statistics', () => {
            const stats = resourceIntegration.getUnifiedResourceStats();
            
            expect(stats).toHaveProperty('files');
            expect(stats).toHaveProperty('processes');
            expect(stats).toHaveProperty('memory');
            expect(stats).toHaveProperty('integration');
            
            expect(stats.files).toHaveProperty('openFiles');
            expect(stats.files).toHaveProperty('tempFiles');
            expect(stats.processes).toHaveProperty('activeProcesses');
        });

        test('should execute operations with tracking', async () => {
            const result = await resourceIntegration.executeWithTracking('test-operation', async () => {
                return { success: true, data: 'test' };
            });
            
            expect(result.success).toBe(true);
            expect(resourceIntegration.resourceStats.totalOperations).toBeGreaterThan(0);
        });

        test('should handle operation failures with error tracking', async () => {
            const error = new Error('Test operation failed');
            
            try {
                await resourceIntegration.executeWithTracking('failing-operation', async () => {
                    throw error;
                });
                fail('Should have thrown error');
            } catch (err) {
                expect(err).toBe(error);
                expect(resourceIntegration.resourceStats.errors).toBeGreaterThan(0);
            }
        });
    });

    describe('Process-File Coordination', () => {
        test('should coordinate process and file cleanup', (done) => {
            // Create a test process
            const process = spawn('node', ['-e', 'setTimeout(() => {}, 10000)'], { 
                stdio: 'pipe',
                shell: false 
            });
            
            resourceIntegration.processManager.trackProcess('test-process', process);
            
            // Verify process is tracked
            expect(resourceIntegration.processManager.activeProcesses.has('test-process')).toBe(true);
            
            // Kill process and verify cleanup coordination
            resourceIntegration.processManager.killProcess('test-process');
            
            setTimeout(() => {
                expect(resourceIntegration.processManager.activeProcesses.has('test-process')).toBe(false);
                done();
            }, 100);
        });
    });

    describe('Memory-Resource Coordination', () => {
        test('should perform aggressive cleanup on high memory', (done) => {
            // Mock high memory usage
            const originalGetStats = resourceIntegration.memoryMonitor.getMemoryStats;
            resourceIntegration.memoryMonitor.getMemoryStats = () => ({
                current: { heapUsed: 400 }, // High memory
                samples: 10
            });
            
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const gcSpy = jest.spyOn(resourceIntegration.memoryMonitor, 'forceGC');
            
            // Trigger aggressive cleanup
            resourceIntegration.aggressiveCleanup();
            
            expect(gcSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('High memory usage detected')
            );
            
            // Restore
            resourceIntegration.memoryMonitor.getMemoryStats = originalGetStats;
            consoleSpy.mockRestore();
            gcSpy.mockRestore();
            done();
        });
    });

    describe('Error Coordination', () => {
        test('should enhance error tracking with resource context', () => {
            const error = new Error('Test error');
            
            resourceIntegration.errorLogger.trackError('test-source', error);
            
            const summary = resourceIntegration.errorLogger.getErrorSummary();
            expect(summary.totalErrors).toBeGreaterThan(0);
            
            // Should have resource context
            const lastError = summary.recentErrors[summary.recentErrors.length - 1];
            expect(lastError.resourceUsage).toBeDefined();
        });

        test('should trigger emergency cleanup on file limit errors', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            const cleanupSpy = jest.spyOn(resourceIntegration, 'emergencyCleanup');
            
            const fileError = new Error('Too many open files');
            fileError.code = 'EMFILE';
            
            resourceIntegration.errorLogger.trackError('test', fileError);
            
            expect(cleanupSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('File limit error detected')
            );
            
            consoleSpy.mockRestore();
            cleanupSpy.mockRestore();
        });
    });

    describe('Resource Reporting', () => {
        test('should generate comprehensive resource report', () => {
            const report = resourceIntegration.getResourceReport();
            
            expect(report).toHaveProperty('timestamp');
            expect(report).toHaveProperty('uptime');
            expect(report).toHaveProperty('unified');
            expect(report).toHaveProperty('memoryTrend');
            expect(report).toHaveProperty('summary');
            expect(report).toHaveProperty('recommendations');
            
            expect(report.summary).toHaveProperty('totalOperations');
            expect(report.summary).toHaveProperty('errors');
            expect(report.summary).toHaveProperty('warnings');
            expect(report.summary).toHaveProperty('errorRate');
            
            expect(Array.isArray(report.recommendations)).toBe(true);
        });

        test('should generate recommendations based on resource usage', () => {
            // Mock high resource usage
            const originalGetStats = resourceIntegration.getUnifiedResourceStats;
            resourceIntegration.getUnifiedResourceStats = () => ({
                files: { openFiles: 60, tempFiles: 5 },
                processes: { activeProcesses: 15 },
                memory: { heapUsed: 300 },
                integration: { totalOperations: 100, errors: 15 }
            });
            
            const report = resourceIntegration.getResourceReport();
            
            expect(report.recommendations.length).toBeGreaterThan(0);
            expect(report.recommendations.some(r => r.includes('open files'))).toBe(true);
            expect(report.recommendations.some(r => r.includes('processes'))).toBe(true);
            expect(report.recommendations.some(r => r.includes('memory'))).toBe(true);
            
            // Restore
            resourceIntegration.getUnifiedResourceStats = originalGetStats;
        });
    });

    describe('Health Check', () => {
        test('should perform health check', () => {
            const health = resourceIntegration.healthCheck();
            
            expect(health).toHaveProperty('healthy');
            expect(health).toHaveProperty('issues');
            expect(health).toHaveProperty('stats');
            
            expect(health.healthy).toBe(true);
            expect(Array.isArray(health.issues)).toBe(true);
        });

        test('should detect resource issues', () => {
            // Mock problematic resource usage
            const originalGetStats = resourceIntegration.getUnifiedResourceStats;
            resourceIntegration.getUnifiedResourceStats = () => ({
                files: { openFiles: 150, tempFiles: 20 },
                processes: { activeProcesses: 25 },
                memory: { heapUsed: 600 },
                integration: { totalOperations: 100, errors: 30 }
            });
            
            const health = resourceIntegration.healthCheck();
            
            expect(health.issues.length).toBeGreaterThan(0);
            expect(health.issues.some(issue => issue.includes('memory'))).toBe(true);
            expect(health.issues.some(issue => issue.includes('files'))).toBe(true);
            expect(health.issues.some(issue => issue.includes('processes'))).toBe(true);
            
            // Restore
            resourceIntegration.getUnifiedResourceStats = originalGetStats;
        });
    });

    describe('Periodic Cleanup', () => {
        test('should perform periodic cleanup', (done) => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            // Trigger periodic cleanup manually
            resourceIntegration.performPeriodicCleanup();
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Periodic cleanup')
            );
            
            consoleSpy.mockRestore();
            done();
        });
    });

    describe('Shutdown', () => {
        test('should shutdown gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            await resourceIntegration.shutdown();
            
            expect(resourceIntegration.coordinationEnabled).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Shutting down Resource Integration')
            );
            
            consoleSpy.mockRestore();
        });
    });

    describe('Integration with Node Adapters', () => {
        test('should work with Python execution', async () => {
            const adapters = require('../../src/engine/node-adapters');
            const mockWorkflow = {
                id: 'test-workflow',
                cancelled: false,
                status: 'running',
                io: { emit: jest.fn() },
                nodeMap: new Map()
            };
            
            const pythonCode = 'print("Integration test")';
            const node = { config: { code: pythonCode } };
            
            const result = await adapters.executePython(node, mockWorkflow, [], {});
            
            expect(result.success).toBe(true);
            
            // Verify resources are cleaned up
            const stats = resourceIntegration.getUnifiedResourceStats();
            expect(stats.files.openFiles).toBe(0);
            expect(stats.processes.activeProcesses).toBe(0);
        });
    });
});
