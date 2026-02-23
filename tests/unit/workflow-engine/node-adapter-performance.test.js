/**
 * Node Adapter Performance Tests
 * Benchmarks for all 26 executor functions to ensure they run in <5ms
 */

const adapters = require('../../../src/engine/node-adapters');

describe('Node Adapter Performance', () => {
    const mockWorkflow = {
        io: { emit: jest.fn() },
        emitFn: jest.fn(),
        traverseNode: jest.fn(),
        config: {}
    };

    const mockConnections = new Map();
    const mockInputs = { test: 'data' };

    // Helper function to run performance benchmark
    async function benchmarkPerformance(executor, testName, maxTimeMs = 5) {
        const iterations = 100;
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const startTime = performance.now();
            await executor({}, mockWorkflow, mockConnections, mockInputs);
            const endTime = performance.now();
            times.push(endTime - startTime);
        }
        
        const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const maxTime = Math.max(...times);
        
        console.log(`${testName}: Average ${averageTime.toFixed(2)}ms, Max ${maxTime.toFixed(2)}ms`);
        
        expect(averageTime).toBeLessThan(maxTimeMs);
        expect(maxTime).toBeLessThan(maxTimeMs * 2); // Allow some variance
    }

    describe('Control Flow Nodes', () => {
        test('executeStart performance', async () => {
            await benchmarkPerformance(adapters.executeStart, 'executeStart');
        });

        test('executeEnd performance', async () => {
            await benchmarkPerformance(adapters.executeEnd, 'executeEnd');
        });

        test('executeCondition performance', async () => {
            await benchmarkPerformance(adapters.executeCondition, 'executeCondition');
        });

        test('executeLoop performance', async () => {
            await benchmarkPerformance(adapters.executeLoop, 'executeLoop');
        });

        test('executeDelay performance', async () => {
            // Delay node has built-in delay, so we'll test with minimal delay
            const mockNode = { config: { delay: 1 } };
            const startTime = performance.now();
            await adapters.executeDelay(mockNode, mockWorkflow, mockConnections, mockInputs);
            const endTime = performance.now();
            const executionTime = endTime - startTime;
            
            console.log(`executeDelay: ${executionTime.toFixed(2)}ms (with 1ms delay)`);
            expect(executionTime).toBeLessThan(10); // Allow for the 1ms delay
        });
    });

    describe('Data Processing Nodes', () => {
        test('executeTransformJSON performance', async () => {
            const mockNode = { 
                config: { 
                    operation: 'get',
                    path: 'test'
                } 
            };
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeTransformJSON(node, workflow, connections, inputs),
                'executeTransformJSON'
            );
        });

        test('executeTransformText performance', async () => {
            const mockNode = { 
                config: { 
                    operation: 'uppercase'
                } 
            };
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeTransformText(node, workflow, connections, inputs),
                'executeTransformText'
            );
        });

        test('executeTransformNumber performance', async () => {
            const mockNode = { 
                config: { 
                    operation: 'add',
                    value: 5
                } 
            };
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeTransformNumber(node, workflow, connections, inputs),
                'executeTransformNumber'
            );
        });

        test('executeTransformBoolean performance', async () => {
            const mockNode = { 
                config: { 
                    operation: 'and'
                } 
            };
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeTransformBoolean(node, workflow, connections, inputs),
                'executeTransformBoolean'
            );
        });

        test('executeTransformArray performance', async () => {
            const mockNode = { 
                config: { 
                    operation: 'length'
                } 
            };
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeTransformArray(node, workflow, connections, inputs),
                'executeTransformArray'
            );
        });

        test('executeTransformObject performance', async () => {
            const mockNode = { 
                config: { 
                    operation: 'keys'
                } 
            };
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeTransformObject(node, workflow, connections, inputs),
                'executeTransformObject'
            );
        });
    });

    describe('File System Nodes', () => {
        test('executeReadFile performance', async () => {
            // Mock file system to avoid actual I/O
            const originalFs = require('fs');
            require('fs').readFileSync = jest.fn().mockReturnValue('test content');
            
            const mockNode = { 
                config: { 
                    filePath: 'test.txt'
                } 
            };
            
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeReadFile(node, workflow, connections, inputs),
                'executeReadFile'
            );
            
            // Restore original fs
            require('fs').readFileSync = originalFs.readFileSync;
        });

        test('executeWriteFile performance', async () => {
            // Mock file system to avoid actual I/O
            const originalFs = require('fs');
            require('fs').writeFileSync = jest.fn();
            
            const mockNode = { 
                config: { 
                    filePath: 'test.txt',
                    content: 'test content'
                } 
            };
            
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeWriteFile(node, workflow, connections, inputs),
                'executeWriteFile'
            );
            
            // Restore original fs
            require('fs').writeFileSync = originalFs.writeFileSync;
        });

        test('executeListFiles performance', async () => {
            // Mock file system to avoid actual I/O
            const originalFs = require('fs');
            require('fs').readdirSync = jest.fn().mockReturnValue(['file1.txt', 'file2.txt']);
            
            const mockNode = { 
                config: { 
                    directory: '.'
                } 
            };
            
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeListFiles(node, workflow, connections, inputs),
                'executeListFiles'
            );
            
            // Restore original fs
            require('fs').readdirSync = originalFs.readdirSync;
        });
    });

    describe('Network Nodes', () => {
        test('executeHttpRequest performance', async () => {
            // Mock HTTP request to avoid actual network calls
            const originalFetch = global.fetch;
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: 'test' }),
                text: () => Promise.resolve('test response')
            });
            
            const mockNode = { 
                config: { 
                    url: 'https://api.example.com/test',
                    method: 'GET'
                } 
            };
            
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeHttpRequest(node, workflow, connections, inputs),
                'executeHttpRequest'
            );
            
            // Restore original fetch
            global.fetch = originalFetch;
        });
    });

    describe('Logging Nodes', () => {
        test('executeWriteLog performance', async () => {
            const mockNode = { 
                config: { 
                    level: 'info',
                    message: 'Test log message'
                } 
            };
            
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeWriteLog(node, workflow, connections, inputs),
                'executeWriteLog'
            );
        });

        test('executeClearLog performance', async () => {
            await benchmarkPerformance(adapters.executeClearLog, 'executeClearLog');
        });
    });

    describe('Utility Nodes', () => {
        test('executeVariable performance', async () => {
            const mockNode = { 
                config: { 
                    operation: 'set',
                    name: 'testVar',
                    value: 'testValue'
                } 
            };
            
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeVariable(node, workflow, connections, inputs),
                'executeVariable'
            );
        });

        test('executeComment performance', async () => {
            const mockNode = { 
                config: { 
                    comment: 'This is a test comment'
                } 
            };
            
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeComment(node, workflow, connections, inputs),
                'executeComment'
            );
        });

        test('executeDebug performance', async () => {
            const mockNode = { 
                config: { 
                    action: 'log'
                } 
            };
            
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeDebug(node, workflow, connections, inputs),
                'executeDebug'
            );
        });
    });

    describe('AutoClicker Nodes', () => {
        test('executeAutoClick performance', async () => {
            // Mock autoClickerEngine to avoid actual clicking
            const mockNode = { 
                config: { 
                    x: 100,
                    y: 100,
                    button: 'left'
                } 
            };
            
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeAutoClick(node, workflow, connections, inputs),
                'executeAutoClick'
            );
        });

        test('executeAutoType performance', async () => {
            const mockNode = { 
                config: { 
                    text: 'test text',
                    delay: 10
                } 
            };
            
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeAutoType(node, workflow, connections, inputs),
                'executeAutoType'
            );
        });

        test('executeScreenshot performance', async () => {
            // Mock screenshot functionality
            const mockNode = { 
                config: { 
                    region: { x: 0, y: 0, width: 100, height: 100 }
                } 
            };
            
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeScreenshot(node, workflow, connections, inputs),
                'executeScreenshot'
            );
        });

        test('executeFindImage performance', async () => {
            const mockNode = { 
                config: { 
                    imagePath: 'test.png',
                    confidence: 0.8
                } 
            };
            
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeFindImage(node, workflow, connections, inputs),
                'executeFindImage'
            );
        });

        test('executeWaitForImage performance', async () => {
            const mockNode = { 
                config: { 
                    imagePath: 'test.png',
                    timeout: 5000
                } 
            };
            
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executeWaitForImage(node, workflow, connections, inputs),
                'executeWaitForImage'
            );
        });
    });

    describe('Python Integration Nodes', () => {
        test('executePythonScript performance', async () => {
            const mockNode = { 
                config: { 
                    scriptPath: 'test.py',
                    args: ['arg1', 'arg2']
                } 
            };
            
            await benchmarkPerformance(
                (node, workflow, connections, inputs) => adapters.executePythonScript(node, workflow, connections, inputs),
                'executePythonScript'
            );
        });
    });
});
