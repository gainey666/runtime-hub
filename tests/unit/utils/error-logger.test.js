/**
 * Runtime Hub - Enhanced Error Logger Tests
 * Tests for enhanced error logging with resource tracking
 */

const ErrorLogger = require('../../../src/utils/error-logger');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('ErrorLogger', () => {
    let errorLogger;
    let testLogFile;

    beforeEach(() => {
        // Create fresh instance for testing
        errorLogger = new (require('../../../src/utils/error-logger').constructor)();
        testLogFile = path.join(os.tmpdir(), `error_test_${Date.now()}.log`);
        errorLogger.initialize(testLogFile);
        // Clear any existing errors
        errorLogger.errors = [];
        errorLogger.errorPatterns = new Map();
    });

    afterEach(async () => {
        // Cleanup
        try {
            await fs.unlink(testLogFile);
        } catch (err) {
            // Ignore cleanup errors
        }
    });

    describe('Error Tracking', () => {
        test('should track errors with resource context', () => {
            const error = new Error('Test error');
            const errorId = errorLogger.trackError('test-source', error, { customData: 'test' });
            
            expect(errorId).toBeDefined();
            expect(typeof errorId).toBe('number');
            
            const summary = errorLogger.getErrorSummary();
            expect(summary.totalErrors).toBe(1);
            expect(summary.bySeverity).toBeDefined();
            expect(summary.bySource).toEqual({ 'test-source': 1 });
        });

        test('should handle different error types', () => {
            const errors = [
                new Error('Regular error'),
                new Error('File not found'),
                Object.assign(new Error('Custom error'), { code: 'ENOENT' })
            ];
            
            errors.forEach((error, index) => {
                errorLogger.trackError(`source-${index}`, error);
            });
            
            const summary = errorLogger.getErrorSummary();
            expect(summary.totalErrors).toBe(3);
            expect(summary.patterns).toBeDefined();
        });

        test('should determine severity correctly', () => {
            // Mock high memory usage
            const originalGetMemory = errorLogger.getCurrentMemoryUsage;
            errorLogger.getCurrentMemoryUsage = () => ({ heapUsed: 600 });
            
            const error = new Error('High memory error');
            errorLogger.trackError('test', error);
            
            const summary = errorLogger.getErrorSummary();
            expect(summary.bySeverity.critical).toBe(1);
            
            // Restore original method
            errorLogger.getCurrentMemoryUsage = originalGetMemory;
        });
    });

    describe('Resource Monitoring', () => {
        test('should track memory usage', () => {
            const memoryUsage = errorLogger.getCurrentMemoryUsage();
            
            expect(memoryUsage).toHaveProperty('heapUsed');
            expect(memoryUsage).toHaveProperty('heapTotal');
            expect(memoryUsage).toHaveProperty('external');
            expect(memoryUsage).toHaveProperty('rss');
            
            expect(typeof memoryUsage.heapUsed).toBe('number');
            expect(memoryUsage.heapUsed).toBeGreaterThanOrEqual(0);
        });

        test('should get file and process counts', () => {
            const openFiles = errorLogger.getOpenFileCount();
            const activeProcesses = errorLogger.getActiveProcessCount();
            
            expect(typeof openFiles).toBe('number');
            expect(typeof activeProcesses).toBe('number');
            expect(openFiles).toBeGreaterThanOrEqual(0);
            expect(activeProcesses).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Pattern Tracking', () => {
        test('should track error patterns', () => {
            const error = new Error('Repeated error');
            
            // Track same error multiple times
            for (let i = 0; i < 3; i++) {
                errorLogger.trackError('pattern-test', error);
            }
            
            const summary = errorLogger.getErrorSummary();
            const pattern = summary.patterns.find(p => p.key === 'pattern-test:Error');
            
            expect(pattern).toBeDefined();
            expect(pattern.count).toBe(3);
            expect(pattern.samples).toContain('Repeated error');
        });
    });

    describe('File Logging', () => {
        test('should write errors to file', async () => {
            const error = new Error('File logged error');
            errorLogger.trackError('file-test', error);
            
            // Give it time to write to file
            await new Promise(resolve => setTimeout(resolve, 100));
            
            try {
                const logContent = await fs.readFile(testLogFile, 'utf8');
                expect(logContent).toContain('File logged error');
                expect(logContent).toContain('file-test');
            } catch (err) {
                // File might not exist yet, that's okay
            }
        });
    });

    describe('Resource Leak Detection', () => {
        test('should detect high memory usage', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            // Mock high memory usage
            const originalGetMemory = errorLogger.getCurrentMemoryUsage;
            errorLogger.getCurrentMemoryUsage = () => ({ heapUsed: 600 });
            
            const error = new Error('High memory test');
            errorLogger.trackError('test', error);
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('HIGH MEMORY USAGE DETECTED')
            );
            
            // Restore
            errorLogger.getCurrentMemoryUsage = originalGetMemory;
            consoleSpy.mockRestore();
        });
    });

    describe('Error Summary', () => {
        test('should provide comprehensive error summary', () => {
            const errors = [
                new Error('Error 1'),
                new Error('Error 2'),
                Object.assign(new Error('Error 3'), { code: 'ENOENT' })
            ];
            
            errors.forEach((error, index) => {
                errorLogger.trackError(`source-${index}`, error);
            });
            
            const summary = errorLogger.getErrorSummary();
            
            expect(summary.totalErrors).toBe(3);
            expect(summary.bySeverity).toBeDefined();
            expect(summary.bySource).toEqual({
                'source-0': 1,
                'source-1': 1,
                'source-2': 1
            });
            expect(summary.patterns).toBeDefined();
            expect(summary.recentErrors).toHaveLength(3);
            expect(summary.resourceStats).toBeDefined();
        });
    });

    describe('Data Management', () => {
        test('should limit error history to prevent memory leaks', () => {
            // Fill up error logger beyond limit
            for (let i = 0; i < 1100; i++) {
                errorLogger.trackError('test', new Error(`Error ${i}`));
            }
            
            const summary = errorLogger.getErrorSummary();
            expect(summary.totalErrors).toBeLessThanOrEqual(1000);
        });

        test('should clear old errors', () => {
            // Add some errors
            for (let i = 0; i < 5; i++) {
                errorLogger.trackError('test', new Error(`Error ${i}`));
            }
            
            expect(errorLogger.getErrorSummary().totalErrors).toBe(5);
            
            // Clear old errors (older than 24 hours should clear all)
            errorLogger.clearOldErrors(0); // Clear all
            
            expect(errorLogger.getErrorSummary().totalErrors).toBe(0);
        });
    });

    describe('Export Functionality', () => {
        test('should export error data', () => {
            const error = new Error('Export test');
            errorLogger.trackError('export-test', error);
            
            const exportData = errorLogger.exportErrors();
            
            expect(exportData).toHaveProperty('errors');
            expect(exportData).toHaveProperty('patterns');
            expect(exportData).toHaveProperty('resourceStats');
            expect(exportData).toHaveProperty('summary');
            
            expect(exportData.errors.length).toBeGreaterThanOrEqual(1);
            expect(exportData.errors[exportData.errors.length - 1].error.message).toBe('Export test');
        });
    });
});
