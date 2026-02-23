/**
 * Plugin System Tests
 * Tests for plugin loading, validation, and integration
 */

const PluginLoader = require('../../../src/engine/plugin-loader');
const WorkflowEngine = require('../../../src/workflow-engine');
const path = require('path');
const fs = require('fs');

describe('Plugin System Integration', () => {
    let pluginLoader;
    let workflowEngine;
    const pluginsDir = path.join(__dirname, '..', '..', '..', 'plugins');

    beforeEach(() => {
        pluginLoader = new PluginLoader();
        workflowEngine = new WorkflowEngine(null, {});
        
        // Clean up plugins directory
        if (fs.existsSync(pluginsDir)) {
            fs.rmSync(pluginsDir, { recursive: true, force: true });
        }
    });

    afterEach(() => {
        // Clean up plugins directory
        if (fs.existsSync(pluginsDir)) {
            fs.rmSync(pluginsDir, { recursive: true, force: true });
        }
    });

    describe('Plugin Loading', () => {
        test('should load valid plugin successfully', async () => {
            // Create a valid plugin
            const testPluginDir = path.join(pluginsDir, 'valid-plugin');
            fs.mkdirSync(testPluginDir, { recursive: true });
            
            const validPlugin = {
                name: 'Valid Test Plugin',
                version: '1.0.0',
                description: 'A valid plugin for testing',
                nodes: [
                    {
                        type: 'TestNode',
                        ports: {
                            inputs: ['input'],
                            outputs: ['output']
                        },
                        executor: async function(node, workflow, connections, inputs = {}) {
                            return { output: inputs.input || 'default' };
                        }
                    }
                ]
            };
            
            fs.writeFileSync(
                path.join(testPluginDir, 'index.js'),
                `module.exports = ${JSON.stringify(validPlugin, null, 2)};`
            );

            await pluginLoader.loadPlugins();
            
            const plugins = pluginLoader.getLoadedPlugins();
            expect(plugins.size).toBe(1);
            expect(plugins.has('valid-plugin')).toBe(true);
            
            const nodes = pluginLoader.getRegisteredNodes();
            expect(nodes.size).toBe(1);
            expect(nodes.has('TestNode')).toBe(true);
        });

        test('should reject plugin with missing name', async () => {
            const invalidPluginDir = path.join(pluginsDir, 'invalid-plugin');
            fs.mkdirSync(invalidPluginDir, { recursive: true });
            
            const invalidPlugin = {
                version: '1.0.0',
                description: 'Plugin without name',
                nodes: []
            };
            
            fs.writeFileSync(
                path.join(invalidPluginDir, 'index.js'),
                `module.exports = ${JSON.stringify(invalidPlugin, null, 2)};`
            );

            await pluginLoader.loadPlugins();
            
            const plugins = pluginLoader.getLoadedPlugins();
            expect(plugins.size).toBe(0);
            
            const nodes = pluginLoader.getRegisteredNodes();
            expect(nodes.size).toBe(0);
        });

        test('should handle plugin with bad port definition', async () => {
            const badPortPluginDir = path.join(pluginsDir, 'bad-port-plugin');
            fs.mkdirSync(badPortPluginDir, { recursive: true });
            
            const badPortPlugin = {
                name: 'Bad Port Plugin',
                version: '1.0.0',
                description: 'Plugin with bad port definition',
                nodes: [
                    {
                        type: 'BadPortNode',
                        ports: {
                            inputs: 'not-an-array', // Should be array
                            outputs: ['output']
                        },
                        executor: async function(node, workflow, connections, inputs = {}) {
                            return { output: 'test' };
                        }
                    }
                ]
            };
            
            fs.writeFileSync(
                path.join(badPortPluginDir, 'index.js'),
                `module.exports = ${JSON.stringify(badPortPlugin, null, 2)};`
            );

            await pluginLoader.loadPlugins();
            
            const plugins = pluginLoader.getLoadedPlugins();
            expect(plugins.size).toBe(0); // Should reject the plugin
            
            const nodes = pluginLoader.getRegisteredNodes();
            expect(nodes.size).toBe(0);
        });

        test('should handle duplicate node types', async () => {
            const duplicatePluginDir = path.join(pluginsDir, 'duplicate-plugin');
            fs.mkdirSync(duplicatePluginDir, { recursive: true });
            
            const duplicatePlugin = {
                name: 'Duplicate Plugin',
                version: '1.0.0',
                description: 'Plugin with duplicate node type',
                nodes: [
                    {
                        type: 'Start', // Duplicate of core node type
                        ports: {
                            inputs: [],
                            outputs: ['main']
                        },
                        executor: async function(node, workflow, connections, inputs = {}) {
                            return { main: 'duplicate start' };
                        }
                    }
                ]
            };
            
            fs.writeFileSync(
                path.join(duplicatePluginDir, 'index.js'),
                `module.exports = ${JSON.stringify(duplicatePlugin, null, 2)};`
            );

            await pluginLoader.loadPlugins();
            
            const plugins = pluginLoader.getLoadedPlugins();
            expect(plugins.size).toBe(1); // Plugin loads but node should not override core
            
            // Core Start node should still be the one registered
            const nodes = pluginLoader.getRegisteredNodes();
            expect(nodes.has('Start')).toBe(false); // Plugin nodes are separate from core
        });

        test('should handle empty plugins directory', async () => {
            // Create empty plugins directory
            fs.mkdirSync(pluginsDir, { recursive: true });

            await pluginLoader.loadPlugins();
            
            const plugins = pluginLoader.getLoadedPlugins();
            expect(plugins.size).toBe(0);
            
            const nodes = pluginLoader.getRegisteredNodes();
            expect(nodes.size).toBe(0);
        });

        test('should handle missing plugins directory', async () => {
            // Don't create plugins directory

            await pluginLoader.loadPlugins();
            
            const plugins = pluginLoader.getLoadedPlugins();
            expect(plugins.size).toBe(0);
            
            const nodes = pluginLoader.getRegisteredNodes();
            expect(nodes.size).toBe(0);
        });
    });

    describe('Plugin Integration with Workflow Engine', () => {
        test('should integrate plugin nodes with workflow engine', async () => {
            // Create a test plugin
            const testPluginDir = path.join(pluginsDir, 'integration-plugin');
            fs.mkdirSync(testPluginDir, { recursive: true });
            
            const testPlugin = {
                name: 'Integration Test Plugin',
                version: '1.0.0',
                description: 'Plugin for workflow engine integration testing',
                nodes: [
                    {
                        type: 'IntegrationNode',
                        ports: {
                            inputs: ['data'],
                            outputs: ['result']
                        },
                        executor: async function(node, workflow, connections, inputs = {}) {
                            return { result: `processed: ${inputs.data}` };
                        }
                    }
                ]
            };
            
            fs.writeFileSync(
                path.join(testPluginDir, 'index.js'),
                `module.exports = ${JSON.stringify(testPlugin, null, 2)};`
            );

            // Load plugins in workflow engine
            await workflowEngine.pluginLoader.loadPlugins();
            
            // Check that plugin node is registered
            expect(workflowEngine.nodeExecutors.has('IntegrationNode')).toBe(false); // Plugin nodes are separate from core
            
            // Plugin nodes should be accessible through plugin loader
            const pluginNodes = workflowEngine.pluginLoader.getRegisteredNodes();
            expect(pluginNodes.has('IntegrationNode')).toBe(true);
        });

        test('should handle plugin execution errors gracefully', async () => {
            const errorPluginDir = path.join(pluginsDir, 'error-plugin');
            fs.mkdirSync(errorPluginDir, { recursive: true });
            
            const errorPlugin = {
                name: 'Error Test Plugin',
                version: '1.0.0',
                description: 'Plugin that throws errors',
                nodes: [
                    {
                        type: 'ErrorNode',
                        ports: {
                            inputs: ['input'],
                            outputs: ['output']
                        },
                        executor: async function(node, workflow, connections, inputs = {}) {
                            throw new Error('Plugin execution error');
                        }
                    }
                ]
            };
            
            fs.writeFileSync(
                path.join(errorPluginDir, 'index.js'),
                `module.exports = ${JSON.stringify(errorPlugin, null, 2)};`
            );

            await workflowEngine.pluginLoader.loadPlugins();
            
            const nodes = workflowEngine.pluginLoader.getRegisteredNodes();
            expect(nodes.size).toBe(1);
            
            const errorNode = nodes.get('ErrorNode');
            expect(errorNode.type).toBe('ErrorNode');
            expect(typeof errorNode.executor).toBe('function');
            
            // Test that executor throws error
            await expect(errorNode.executor({}, {}, {}, {}))
                .rejects.toThrow('Plugin execution error');
        });
    });

    describe('Plugin Validation', () => {
        test('should validate plugin structure', () => {
            const validPlugin = {
                name: 'Valid Plugin',
                version: '1.0.0',
                description: 'Valid plugin',
                nodes: [
                    {
                        type: 'TestNode',
                        ports: {
                            inputs: ['input'],
                            outputs: ['output']
                        },
                        executor: async function() { return { output: 'test' }; }
                    }
                ]
            };
            
            expect(pluginLoader.validatePlugin(validPlugin, 'test-plugin')).toBe(true);
            
            // Test missing required fields
            expect(pluginLoader.validatePlugin({}, 'test-plugin')).toBe(false);
            expect(pluginLoader.validatePlugin({ name: 'Test' }, 'test-plugin')).toBe(false);
            expect(pluginLoader.validatePlugin({ name: 'Test', version: '1.0.0' }, 'test-plugin')).toBe(false);
        });

        test('should validate node structure', () => {
            const validNode = {
                type: 'TestNode',
                ports: {
                    inputs: ['input'],
                    outputs: ['output']
                },
                executor: async function() { return { output: 'test' }; }
            };
            
            expect(pluginLoader.validateNode(validNode, 'test-plugin')).toBe(true);
            
            // Test missing required fields
            expect(pluginLoader.validateNode({}, 'test-plugin')).toBe(false);
            expect(pluginLoader.validateNode({ type: 'Test' }, 'test-plugin')).toBe(false);
            expect(pluginLoader.validateNode({ type: 'Test', ports: {} }, 'test-plugin')).toBe(false);
        });
    });
});
