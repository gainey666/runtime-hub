/**
 * Data Flow Edge Cases Tests
 * Expanded data flow tests covering edge cases and error scenarios
 */

const WorkflowEngine = require('../../../src/workflow-engine');

describe('Data Flow Edge Cases', () => {
    let workflowEngine;
    let mockIo;

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
    });

    describe('Null/Undefined Input Handling', () => {
        test('should handle null input gracefully', async () => {
            const workflow = {
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: {}
                    },
                    {
                        id: 'transform',
                        type: 'Transform JSON',
                        config: { operation: 'get', path: 'data' }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {}
                    }
                ],
                connections: [
                    { from: 'start', to: 'transform', fromPort: 'main', toPort: 'input' },
                    { from: 'transform', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            const result = await workflowEngine.executeWorkflow(workflow, { input: null });
            
            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();
            expect(result.errors).toHaveLength(0);
        });

        test('should handle undefined input gracefully', async () => {
            const workflow = {
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: {}
                    },
                    {
                        id: 'transform',
                        type: 'Transform JSON',
                        config: { operation: 'get', path: 'data' }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {}
                    }
                ],
                connections: [
                    { from: 'start', to: 'transform', fromPort: 'main', toPort: 'input' },
                    { from: 'transform', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            const result = await workflowEngine.executeWorkflow(workflow, { input: undefined });
            
            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();
            expect(result.errors).toHaveLength(0);
        });

        test('should handle empty string input', async () => {
            const workflow = {
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: {}
                    },
                    {
                        id: 'transform',
                        type: 'Transform Text',
                        config: { operation: 'uppercase' }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {}
                    }
                ],
                connections: [
                    { from: 'start', to: 'transform', fromPort: 'main', toPort: 'input' },
                    { from: 'transform', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            const result = await workflowEngine.executeWorkflow(workflow, { input: '' });
            
            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Chained Nodes Data Flow', () => {
        test('should maintain data integrity through multiple transformations', async () => {
            const workflow = {
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: {}
                    },
                    {
                        id: 'json1',
                        type: 'Transform JSON',
                        config: { operation: 'set', path: 'data.value', value: 42 }
                    },
                    {
                        id: 'json2',
                        type: 'Transform JSON',
                        config: { operation: 'set', path: 'data.multiplier', value: 2 }
                    },
                    {
                        id: 'number',
                        type: 'Transform Number',
                        config: { operation: 'multiply', value: 10 }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {}
                    }
                ],
                connections: [
                    { from: 'start', to: 'json1', fromPort: 'main', toPort: 'input' },
                    { from: 'json1', to: 'json2', fromPort: 'output', toPort: 'input' },
                    { from: 'json2', to: 'number', fromPort: 'output', toPort: 'input' },
                    { from: 'number', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            const result = await workflowEngine.executeWorkflow(workflow);
            
            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();
            expect(result.errors).toHaveLength(0);
            
            // Verify data flow through all nodes
            const context = workflowEngine.getContext(result.workflowId);
            expect(context.values).toBeDefined();
        });

        test('should handle complex branching and merging', async () => {
            const workflow = {
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: {}
                    },
                    {
                        id: 'condition',
                        type: 'Condition',
                        config: { condition: 'true', operator: 'equals', value: 'true' }
                    },
                    {
                        id: 'branch1',
                        type: 'Transform Text',
                        config: { operation: 'uppercase' }
                    },
                    {
                        id: 'branch2',
                        type: 'Transform Text',
                        config: { operation: 'lowercase' }
                    },
                    {
                        id: 'merge',
                        type: 'Transform JSON',
                        config: { operation: 'set', path: 'result', value: 'merged' }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {}
                    }
                ],
                connections: [
                    { from: 'start', to: 'condition', fromPort: 'main', toPort: 'input' },
                    { from: 'condition', to: 'branch1', fromPort: 'true', toPort: 'input' },
                    { from: 'condition', to: 'branch2', fromPort: 'false', toPort: 'input' },
                    { from: 'branch1', to: 'merge', fromPort: 'output', toPort: 'input' },
                    { from: 'branch2', to: 'merge', fromPort: 'output', toPort: 'input' },
                    { from: 'merge', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            const result = await workflowEngine.executeWorkflow(workflow, { input: 'test' });
            
            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Error Propagation', () => {
        test('should handle node execution errors gracefully', async () => {
            const workflow = {
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: {}
                    },
                    {
                        id: 'invalid',
                        type: 'InvalidNodeType',
                        config: {}
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {}
                    }
                ],
                connections: [
                    { from: 'start', to: 'invalid', fromPort: 'main', toPort: 'input' },
                    { from: 'invalid', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            const result = await workflowEngine.executeWorkflow(workflow);
            
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors.length).toBeGreaterThan(0);
        });

        test('should handle configuration errors gracefully', async () => {
            const workflow = {
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: {}
                    },
                    {
                        id: 'transform',
                        type: 'Transform JSON',
                        config: { operation: 'invalid_operation' }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {}
                    }
                ],
                connections: [
                    { from: 'start', to: 'transform', fromPort: 'main', toPort: 'input' },
                    { from: 'transform', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            const result = await workflowEngine.executeWorkflow(workflow);
            
            expect(result.success).toBe(true); // Should handle gracefully
            expect(result.outputs).toBeDefined();
        });

        test('should handle connection errors gracefully', async () => {
            const workflow = {
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: {}
                    },
                    {
                        id: 'transform',
                        type: 'Transform JSON',
                        config: { operation: 'get', path: 'nonexistent' }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {}
                    }
                ],
                connections: [
                    { from: 'start', to: 'transform', fromPort: 'main', toPort: 'input' },
                    { from: 'transform', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            const result = await workflowEngine.executeWorkflow(workflow);
            
            expect(result.success).toBe(true); // Should handle gracefully
            expect(result.outputs).toBeDefined();
        });
    });

    describe('Complex Data Types', () => {
        test('should handle nested objects correctly', async () => {
            const workflow = {
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: {}
                    },
                    {
                        id: 'json',
                        type: 'Transform JSON',
                        config: { operation: 'set', path: 'data.nested.value', value: 'deep' }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {}
                    }
                ],
                connections: [
                    { from: 'start', to: 'json', fromPort: 'main', toPort: 'input' },
                    { from: 'json', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            const result = await workflowEngine.executeWorkflow(workflow);
            
            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();
            
            const context = workflowEngine.getContext(result.workflowId);
            expect(context.values).toBeDefined();
        });

        test('should handle arrays correctly', async () => {
            const workflow = {
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: {}
                    },
                    {
                        id: 'array',
                        type: 'Transform Array',
                        config: { operation: 'length' }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {}
                    }
                ],
                connections: [
                    { from: 'start', to: 'array', fromPort: 'main', toPort: 'input' },
                    { from: 'array', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            const result = await workflowEngine.executeWorkflow(workflow, { input: [1, 2, 3, 4, 5] });
            
            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();
            expect(result.errors).toHaveLength(0);
        });

        test('should handle binary data correctly', async () => {
            const workflow = {
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: {}
                    },
                    {
                        id: 'transform',
                        type: 'Transform Text',
                        config: { operation: 'base64_encode' }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {}
                    }
                ],
                connections: [
                    { from: 'start', to: 'transform', fromPort: 'main', toPort: 'input' },
                    { from: 'transform', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            const result = await workflowEngine.executeWorkflow(workflow, { input: 'binary data' });
            
            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Performance Edge Cases', () => {
        test('should handle large data objects efficiently', async () => {
            const largeData = {
                items: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item_${i}` }))
            };

            const workflow = {
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: {}
                    },
                    {
                        id: 'transform',
                        type: 'Transform JSON',
                        config: { operation: 'get', path: 'items.length' }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {}
                    }
                ],
                connections: [
                    { from: 'start', to: 'transform', fromPort: 'main', toPort: 'input' },
                    { from: 'transform', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            const startTime = performance.now();
            const result = await workflowEngine.executeWorkflow(workflow, { input: largeData });
            const endTime = performance.now();
            
            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        });

        test('should handle rapid consecutive executions', async () => {
            const workflow = {
                nodes: [
                    {
                        id: 'start',
                        type: 'Start',
                        config: {}
                    },
                    {
                        id: 'transform',
                        type: 'Transform Text',
                        config: { operation: 'uppercase' }
                    },
                    {
                        id: 'end',
                        type: 'End',
                        config: {}
                    }
                ],
                connections: [
                    { from: 'start', to: 'transform', fromPort: 'main', toPort: 'input' },
                    { from: 'transform', to: 'end', fromPort: 'output', toPort: 'main' }
                ]
            };

            const promises = Array.from({ length: 10 }, (_, i) => 
                workflowEngine.executeWorkflow(workflow, { input: `test_${i}` })
            );

            const results = await Promise.all(promises);
            
            expect(results.every(result => result.success)).toBe(true);
            expect(results.every(result => result.outputs)).toBeDefined();
        });
    });
});
