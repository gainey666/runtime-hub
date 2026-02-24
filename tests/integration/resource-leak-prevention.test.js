/**
 * Runtime Hub - Resource Leak Prevention Integration Tests
 * End-to-end testing for resource management system
 */

const adapters = require('../../src/engine/node-adapters');
const fileResourceManager = require('../../src/utils/file-resource-manager');
const processManager = require('../../src/utils/process-manager');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('Resource Leak Prevention Integration', () => {
    let mockWorkflow;
    let testDir;

    beforeEach(() => {
        mockWorkflow = {
            id: 'test-workflow',
            cancelled: false,
            status: 'running',
            io: {
                emit: jest.fn()
            },
            nodeMap: new Map()
        };
        
        testDir = path.join(os.tmpdir(), `resource_test_${Date.now()}`);
    });

    afterEach(async () => {
        // Cleanup test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (err) {
            // Ignore cleanup errors
        }
        
        // Reset resource managers
        await fileResourceManager.close();
        processManager.killAllProcesses();
    });

    describe('Python Execution Resource Management', () => {
        test('should cleanup temp files and processes after successful execution', async () => {
            const pythonCode = `
print("Hello World")
result = {"output": "test", "value": 42}
print(result)
            `;
            
            const node = {
                config: { code: pythonCode }
            };
            
            const result = await adapters.executePython(node, mockWorkflow, [], {});
            
            expect(result.success).toBe(true);
            expect(result.output).toContain('Hello World');
            
            // Verify resource managers are clean
            const fileStats = fileResourceManager.getStats();
            const processStats = processManager.getStats();
            
            expect(fileStats.tempFiles).toBe(0);
            expect(fileStats.openFiles).toBe(0);
            expect(processStats.activeProcesses).toBe(0);
        });

        test('should cleanup resources after Python execution error', async () => {
            const invalidPythonCode = `
# This will cause a syntax error
invalid syntax here
            `;
            
            const node = {
                config: { code: invalidPythonCode }
            };
            
            const result = await adapters.executePython(node, mockWorkflow, [], {});
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            
            // Verify resource managers are clean even on error
            const fileStats = fileResourceManager.getStats();
            const processStats = processManager.getStats();
            
            expect(fileStats.tempFiles).toBe(0);
            expect(fileStats.openFiles).toBe(0);
            expect(processStats.activeProcesses).toBe(0);
        });

        test('should handle empty Python code gracefully', async () => {
            const node = {
                config: { code: '' }
            };
            
            const result = await adapters.executePython(node, mockWorkflow, [], {});
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('No Python code provided');
            
            // Verify no resources were allocated
            const fileStats = fileResourceManager.getStats();
            const processStats = processManager.getStats();
            
            expect(fileStats.tempFiles).toBe(0);
            expect(fileStats.openFiles).toBe(0);
            expect(processStats.activeProcesses).toBe(0);
        });
    });

    describe('Write Log Resource Management', () => {
        test('should properly close file handles after writing logs', async () => {
            const logFile = path.join(testDir, 'test.log');
            const testMessage = 'Test log message';
            
            const node = {
                config: { 
                    message: testMessage,
                    level: 'info',
                    logFile: logFile
                }
            };
            
            const result = await adapters.executeWriteLog(node, mockWorkflow, [], {});
            
            expect(result.success).toBe(true);
            expect(result.message).toBe(testMessage);
            expect(result.logged).toBe(true);
            
            // Verify file was written
            const logContent = await fs.readFile(logFile, 'utf8');
            expect(logContent).toContain(testMessage);
            
            // Verify file handle is closed
            const fileStats = fileResourceManager.getStats();
            expect(fileStats.openFiles).toBe(0);
        });

        test('should handle file write errors without resource leaks', async () => {
            // Try to write to an invalid path
            const invalidPath = '/invalid/path/that/does/not/exist/test.log';
            
            const node = {
                config: { 
                    message: 'Test message',
                    level: 'info',
                    logFile: invalidPath
                }
            };
            
            const result = await adapters.executeWriteLog(node, mockWorkflow, [], {});
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            
            // Verify no file handles are left open
            const fileStats = fileResourceManager.getStats();
            expect(fileStats.openFiles).toBe(0);
        });

        test('should handle complex message types', async () => {
            const logFile = path.join(testDir, 'complex.log');
            const complexMessage = { 
                key: 'value', 
                number: 42, 
                nested: { data: 'test' } 
            };
            
            const node = {
                config: { 
                    message: complexMessage,
                    level: 'debug',
                    logFile: logFile
                }
            };
            
            const result = await adapters.executeWriteLog(node, mockWorkflow, [], {});
            
            expect(result.success).toBe(true);
            
            // Verify JSON was properly formatted
            const logContent = await fs.readFile(logFile, 'utf8');
            expect(logContent).toContain('"key": "value"');
            expect(logContent).toContain('"number": 42');
            
            // Verify file handle is closed
            const fileStats = fileResourceManager.getStats();
            expect(fileStats.openFiles).toBe(0);
        });
    });

    describe('Memory Usage Monitoring', () => {
        test('should track memory usage during operations', async () => {
            const initialMemory = process.memoryUsage();
            
            // Execute multiple operations
            for (let i = 0; i < 10; i++) {
                const node = {
                    config: { 
                        message: `Test message ${i}`,
                        level: 'info',
                        logFile: path.join(testDir, `test_${i}.log`)
                    }
                };
                
                await adapters.executeWriteLog(node, mockWorkflow, [], {});
            }
            
            const finalMemory = process.memoryUsage();
            
            // Memory should not have grown significantly
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
            
            // Should be less than 10MB increase for 10 small operations
            expect(memoryIncreaseMB).toBeLessThan(10);
            
            // Verify all file handles are closed
            const fileStats = fileResourceManager.getStats();
            expect(fileStats.openFiles).toBe(0);
        });
    });

    describe('Workflow Integration', () => {
        test('should integrate with workflow context properly', async () => {
            const node = {
                config: { 
                    message: 'Workflow test message',
                    level: 'info',
                    logFile: path.join(testDir, 'workflow.log')
                }
            };
            
            const result = await adapters.executeWriteLog(node, mockWorkflow, [], {});
            
            expect(result.success).toBe(true);
            
            // Verify workflow.io.emit was called
            expect(mockWorkflow.io.emit).toHaveBeenCalledWith('log_entry', {
                source: 'WriteLog',
                level: 'info',
                message: 'Workflow test message',
                data: { workflowId: 'test-workflow', logFile: expect.any(String) }
            });
        });
    });

    describe('Resource Manager Statistics', () => {
        test('should provide accurate resource statistics', async () => {
            // Execute some operations
            const pythonNode = {
                config: { code: 'print("test")' }
            };
            
            const logNode = {
                config: { 
                    message: 'Stats test',
                    level: 'info',
                    logFile: path.join(testDir, 'stats.log')
                }
            };
            
            await adapters.executePython(pythonNode, mockWorkflow, [], {});
            await adapters.executeWriteLog(logNode, mockWorkflow, [], {});
            
            // All resources should be cleaned up
            const fileStats = fileResourceManager.getStats();
            const processStats = processManager.getStats();
            
            expect(fileStats.openFiles).toBe(0);
            expect(fileStats.tempFiles).toBe(0);
            expect(processStats.activeProcesses).toBe(0);
            
            // Stats should be accurate
            expect(typeof fileStats.closed).toBe('boolean');
            expect(typeof processStats.activeProcesses).toBe('number');
            expect(Array.isArray(processStats.processes)).toBe(true);
        });
    });
});
