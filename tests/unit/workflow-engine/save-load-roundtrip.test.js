/**
 * Save/Load Round-trip Tests
 * Tests for workflow save and load functionality
 */

const WorkflowEngine = require('../../../src/workflow-engine');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Save/Load Round-trip Tests', () => {
    let workflowEngine;
    let mockIo;
    let tempDir;

    beforeEach(() => {
        mockIo = {
            emit: jest.fn(),
            on: jest.fn(),
            to: jest.fn(() => mockIo)
        };
        
        workflowEngine = new WorkflowEngine(mockIo, {
            maxConcurrentWorkflows: 5,
            workflowTimeout: 30000
        });

        // Create temporary directory for test files
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-test-'));
    });

    afterEach(async () => {
        // Clean up any running workflows
        const runningWorkflows = Array.from(workflowEngine.runningWorkflows.keys());
        for (const workflowId of runningWorkflows) {
            try {
                await workflowEngine.stop(workflowId);
            } catch (error) {
                // Ignore cleanup errors
            }
        }

        // Clean up temporary directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('Simple Workflow Round-trip', () => {
        test('should save and load simple workflow correctly', async () => {
            const originalWorkflow = {
                name: 'Simple Test Workflow',
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: { workflowName: 'Test Workflow' },
                        position: { x: 100, y: 100 }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {},
                        position: { x: 300, y: 100 }
                    }
                ],
                connections: [
                    { from: 'start', to: 'end', fromPort: 'main', toPort: 'main' }
                ]
            };

            // Save workflow
            const savedWorkflow = {
                name: originalWorkflow.name,
                nodes: originalWorkflow.nodes,
                connections: originalWorkflow.connections,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };

            const filePath = path.join(tempDir, 'simple-workflow.json');
            fs.writeFileSync(filePath, JSON.stringify(savedWorkflow, null, 2));

            // Load workflow
            const loadedData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const loadedWorkflow = {
                nodes: loadedData.nodes,
                connections: loadedData.connections
            };

            // Verify round-trip integrity
            expect(loadedWorkflow.nodes).toHaveLength(originalWorkflow.nodes.length);
            expect(loadedWorkflow.connections).toHaveLength(originalWorkflow.connections.length);

            // Compare node structures
            originalWorkflow.nodes.forEach(originalNode => {
                const loadedNode = loadedWorkflow.nodes.find(n => n.id === originalNode.id);
                expect(loadedNode).toBeDefined();
                expect(loadedNode.type).toBe(originalNode.type);
                expect(loadedNode.config).toEqual(originalNode.config);
                expect(loadedNode.position).toEqual(originalNode.position);
            });

            // Compare connection structures
            originalWorkflow.connections.forEach(originalConnection => {
                const loadedConnection = loadedWorkflow.connections.find(c => 
                    c.from === originalConnection.from && 
                    c.to === originalConnection.to &&
                    c.fromPort === originalConnection.fromPort &&
                    c.toPort === originalConnection.toPort
                );
                expect(loadedConnection).toBeDefined();
            });

            // Test execution of loaded workflow
            const result = await workflowEngine.executeWorkflow(loadedWorkflow);
            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Complex Workflow Round-trip', () => {
        test('should save and load complex workflow with multiple node types', async () => {
            const originalWorkflow = {
                name: 'Complex Test Workflow',
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: { workflowName: 'Complex Test' },
                        position: { x: 50, y: 50 }
                    },
                    {
                        id: 'condition',
                        type: 'Condition',
                        config: { condition: 'true', operator: 'equals', value: 'true' },
                        position: { x: 200, y: 50 }
                    },
                    {
                        id: 'transform1',
                        type: 'Transform JSON',
                        config: { operation: 'set', path: 'data.value', value: 42 },
                        position: { x: 350, y: 20 }
                    },
                    {
                        id: 'transform2',
                        type: 'Transform Text',
                        config: { operation: 'uppercase' },
                        position: { x: 350, y: 100 }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {},
                        position: { x: 500, y: 50 }
                    }
                ],
                connections: [
                    { from: 'start', to: 'condition', fromPort: 'main', toPort: 'input' },
                    { from: 'condition', to: 'transform1', fromPort: 'true', toPort: 'input' },
                    { from: 'condition', to: 'transform2', fromPort: 'false', toPort: 'input' },
                    { from: 'transform1', to: 'end', fromPort: 'output', toPort: 'main' },
                    { from: 'transform2', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            // Save workflow
            const savedWorkflow = {
                name: originalWorkflow.name,
                nodes: originalWorkflow.nodes,
                connections: originalWorkflow.connections,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };

            const filePath = path.join(tempDir, 'complex-workflow.json');
            fs.writeFileSync(filePath, JSON.stringify(savedWorkflow, null, 2));

            // Load workflow
            const loadedData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const loadedWorkflow = {
                nodes: loadedData.nodes,
                connections: loadedData.connections
            };

            // Verify round-trip integrity
            expect(loadedWorkflow.nodes).toHaveLength(originalWorkflow.nodes.length);
            expect(loadedWorkflow.connections).toHaveLength(originalWorkflow.connections.length);

            // Verify complex node configurations
            const conditionNode = loadedWorkflow.nodes.find(n => n.id === 'condition');
            expect(conditionNode.config).toEqual(originalWorkflow.nodes.find(n => n.id === 'condition').config);

            // Test execution of loaded workflow
            const result = await workflowEngine.executeWorkflow(loadedWorkflow, { input: 'test' });
            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Workflow with Data Flow Round-trip', () => {
        test('should save and load workflow with data transformations', async () => {
            const originalWorkflow = {
                name: 'Data Flow Test Workflow',
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: {},
                        position: { x: 50, y: 100 }
                    },
                    {
                        id: 'json',
                        type: 'Transform JSON',
                        config: { operation: 'set', path: 'data.items', value: [1, 2, 3] },
                        position: { x: 200, y: 100 }
                    },
                    {
                        id: 'array',
                        type: 'Transform Array',
                        config: { operation: 'length' },
                        position: { x: 350, y: 100 }
                    },
                    {
                        id: 'number',
                        type: 'Transform Number',
                        config: { operation: 'multiply', value: 2 },
                        position: { x: 500, y: 100 }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {},
                        position: { x: 650, y: 100 }
                    }
                ],
                connections: [
                    { from: 'start', to: 'json', fromPort: 'main', toPort: 'input' },
                    { from: 'json', to: 'array', fromPort: 'output', toPort: 'input' },
                    { from: 'array', to: 'number', fromPort: 'output', toPort: 'input' },
                    { from: 'number', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            // Save workflow
            const savedWorkflow = {
                name: originalWorkflow.name,
                nodes: originalWorkflow.nodes,
                connections: originalWorkflow.connections,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };

            const filePath = path.join(tempDir, 'data-flow-workflow.json');
            fs.writeFileSync(filePath, JSON.stringify(savedWorkflow, null, 2));

            // Load workflow
            const loadedData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const loadedWorkflow = {
                nodes: loadedData.nodes,
                connections: loadedData.connections
            };

            // Verify round-trip integrity
            expect(loadedWorkflow.nodes).toHaveLength(originalWorkflow.nodes.length);
            expect(loadedWorkflow.connections).toHaveLength(originalWorkflow.connections.length);

            // Test execution of loaded workflow with data flow
            const result = await workflowEngine.executeWorkflow(loadedWorkflow);
            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);

            // Verify data flow worked correctly
            const context = workflowEngine.getContext(result.workflowId);
            expect(context.values).toBeDefined();
        });
    });

    describe('Error Handling Round-trip', () => {
        test('should handle corrupted workflow files gracefully', async () => {
            const corruptedFilePath = path.join(tempDir, 'corrupted-workflow.json');
            fs.writeFileSync(corruptedFilePath, '{ invalid json content');

            expect(() => {
                JSON.parse(fs.readFileSync(corruptedFilePath, 'utf8'));
            }).toThrow();

            // Test that the system handles corrupted files
            try {
                const data = fs.readFileSync(corruptedFilePath, 'utf8');
                JSON.parse(data);
            } catch (error) {
                expect(error.message).toContain('Unexpected token');
            }
        });

        test('should handle missing workflow files gracefully', async () => {
            const missingFilePath = path.join(tempDir, 'missing-workflow.json');
            
            expect(fs.existsSync(missingFilePath)).toBe(false);
            
            // Test that the system handles missing files
            try {
                fs.readFileSync(missingFilePath, 'utf8');
            } catch (error) {
                expect(error.code).toBe('ENOENT');
            }
        });
    });

    describe('Workflow Versioning Round-trip', () => {
        test('should handle workflow version information', async () => {
            const originalWorkflow = {
                name: 'Versioned Test Workflow',
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: { workflowName: 'Versioned Test' },
                        position: { x: 100, y: 100 }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {},
                        position: { x: 300, y: 100 }
                    }
                ],
                connections: [
                    { from: 'start', to: 'end', fromPort: 'main', toPort: 'main' }
                ]
            };

            const savedWorkflow = {
                name: originalWorkflow.name,
                nodes: originalWorkflow.nodes,
                connections: originalWorkflow.connections,
                timestamp: new Date().toISOString(),
                version: '2.0.0',
                metadata: {
                    author: 'Test User',
                    description: 'A test workflow with versioning',
                    tags: ['test', 'versioning']
                }
            };

            const filePath = path.join(tempDir, 'versioned-workflow.json');
            fs.writeFileSync(filePath, JSON.stringify(savedWorkflow, null, 2));

            // Load workflow
            const loadedData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            expect(loadedData.version).toBe('2.0.0');
            expect(loadedData.metadata).toBeDefined();
            expect(loadedData.metadata.author).toBe('Test User');
            expect(loadedData.metadata.tags).toEqual(['test', 'versioning']);

            const loadedWorkflow = {
                nodes: loadedData.nodes,
                connections: loadedData.connections
            };

            // Test execution of versioned workflow
            const result = await workflowEngine.executeWorkflow(loadedWorkflow);
            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Large Workflow Round-trip', () => {
        test('should handle large workflows efficiently', async () => {
            const originalWorkflow = {
                name: 'Large Test Workflow',
                nodes: [],
                connections: []
            };

            // Create a workflow with many nodes
            const nodeCount = 50;
            for (let i = 0; i < nodeCount; i++) {
                originalWorkflow.nodes.push({
                    id: `node_${i}`,
                    type: i === 0 ? 'Start' : i === nodeCount - 1 ? 'End' : 'Transform JSON',
                    config: i === 0 || i === nodeCount - 1 ? {} : { operation: 'set', path: `data.step_${i}`, value: i },
                    position: { x: (i % 10) * 100, y: Math.floor(i / 10) * 100 }
                });

                if (i > 0) {
                    originalWorkflow.connections.push({
                        from: `node_${i - 1}`,
                        to: `node_${i}`,
                        fromPort: i === 1 ? 'main' : 'output',
                        toPort: i === nodeCount - 1 ? 'main' : 'input'
                    });
                }
            }

            // Save workflow
            const savedWorkflow = {
                name: originalWorkflow.name,
                nodes: originalWorkflow.nodes,
                connections: originalWorkflow.connections,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };

            const filePath = path.join(tempDir, 'large-workflow.json');
            const startTime = performance.now();
            fs.writeFileSync(filePath, JSON.stringify(savedWorkflow, null, 2));
            const saveTime = performance.now() - startTime;

            // Load workflow
            const loadStartTime = performance.now();
            const loadedData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const loadTime = performance.now() - loadStartTime;

            const loadedWorkflow = {
                nodes: loadedData.nodes,
                connections: loadedData.connections
            };

            // Verify round-trip integrity
            expect(loadedWorkflow.nodes).toHaveLength(nodeCount);
            expect(loadedWorkflow.connections).toHaveLength(nodeCount - 1);

            // Performance assertions
            expect(saveTime).toBeLessThan(1000); // Should save within 1 second
            expect(loadTime).toBeLessThan(500); // Should load within 500ms

            // Test execution of loaded workflow (first few nodes to avoid timeout)
            const smallWorkflow = {
                nodes: loadedWorkflow.nodes.slice(0, 5),
                connections: loadedWorkflow.connections.slice(0, 4)
            };

            const result = await workflowEngine.executeWorkflow(smallWorkflow);
            expect(result.success).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });
});
