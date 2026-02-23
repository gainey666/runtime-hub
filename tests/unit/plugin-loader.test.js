/**
 * Unit Tests for Plugin Loader
 * Tests plugin loading, registration, and validation
 */

const PluginLoader = require('../../src/engine/plugin-loader');
const path = require('path');
const fs = require('fs');

describe('PluginLoader', () => {
    let pluginLoader;
    const pluginsDir = path.join(__dirname, '..', '..', '..', 'plugins');

    beforeEach(() => {
        pluginLoader = new PluginLoader();
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
        test('should handle empty plugins directory', async () => {
            await pluginLoader.loadPlugins();
            
            const plugins = pluginLoader.getLoadedPlugins();
            expect(plugins.size).toBe(0);
            
            const nodes = pluginLoader.getRegisteredNodes();
            expect(nodes.size).toBe(0);
        });

        test('should load valid plugin', async () => {
            // Create a test plugin
            const testPluginDir = path.join(pluginsDir, 'test-plugin');
            fs.mkdirSync(testPluginDir, { recursive: true });
            
            const testPlugin = {
                name: 'Test Plugin',
                version: '1.0.0',
                description: 'Test plugin for unit testing',
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
                `module.exports = ${JSON.stringify(testPlugin, null, 2)};`
            );

            await pluginLoader.loadPlugins();
            
            const plugins = pluginLoader.getLoadedPlugins();
            expect(plugins.size).toBe(1);
            expect(plugins.has('test-plugin')).toBe(true);
            
            const nodes = pluginLoader.getRegisteredNodes();
            expect(nodes.size).toBe(1);
            expect(nodes.has('TestNode')).toBe(true);
            
            const testNode = nodes.get('TestNode');
            expect(testNode.type).toBe('TestNode');
            expect(testNode.ports).toEqual({ inputs: ['input'], outputs: ['output'] });
            expect(typeof testNode.executor).toBe('function');
        });

        test('should reject invalid plugin', async () => {
            // Create an invalid plugin (missing name)
            const invalidPluginDir = path.join(pluginsDir, 'invalid-plugin');
            fs.mkdirSync(invalidPluginDir, { recursive: true });
            
            const invalidPlugin = {
                version: '1.0.0',
                description: 'Invalid plugin',
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

        test('should handle missing plugin index file', async () => {
            // Create plugin directory without index.js
            const emptyPluginDir = path.join(pluginsDir, 'empty-plugin');
            fs.mkdirSync(emptyPluginDir, { recursive: true });

            await pluginLoader.loadPlugins();
            
            const plugins = pluginLoader.getLoadedPlugins();
            expect(plugins.size).toBe(0);
            
            const nodes = pluginLoader.getRegisteredNodes();
            expect(nodes.size).toBe(0);
        });
    });

    describe('Plugin Registration', () => {
        test('should register plugin nodes correctly', async () => {
            const testPluginDir = path.join(pluginsDir, 'registration-test');
            fs.mkdirSync(testPluginDir, { recursive: true });
            
            const testPlugin = {
                name: 'Registration Test Plugin',
                version: '1.0.0',
                description: 'Plugin for testing registration',
                nodes: [
                    {
                        type: 'RegistrationNode1',
                        ports: {
                            inputs: ['input1', 'input2'],
                            outputs: ['output1']
                        },
                        executor: async function(node, workflow, connections, inputs = {}) {
                            return { output1: inputs.input1 + inputs.input2 };
                        }
                    },
                    {
                        type: 'RegistrationNode2',
                        ports: {
                            inputs: ['data'],
                            outputs: ['result', 'error']
                        },
                        executor: async function(node, workflow, connections, inputs = {}) {
                            try {
                                const result = JSON.parse(inputs.data);
                                return { result, error: null };
                            } catch (error) {
                                return { result: null, error: error.message };
                            }
                        }
                    }
                ]
            };
            
            fs.writeFileSync(
                path.join(testPluginDir, 'index.js'),
                `module.exports = ${JSON.stringify(testPlugin, null, 2)};`
            );

            await pluginLoader.loadPlugins();
            
            const nodes = pluginLoader.getRegisteredNodes();
            expect(nodes.size).toBe(2);
            
            const node1 = nodes.get('RegistrationNode1');
            expect(node1.ports).toEqual({ inputs: ['input1', 'input2'], outputs: ['output1'] });
            
            const node2 = nodes.get('RegistrationNode2');
            expect(node2.ports).toEqual({ inputs: ['data'], outputs: ['result', 'error'] });
        });

        test('should handle duplicate node types', async () => {
            const testPluginDir = path.join(pluginsDir, 'duplicate-test');
            fs.mkdirSync(testPluginDir, { recursive: true });
            
            const testPlugin = {
                name: 'Duplicate Test Plugin',
                version: '1.0.0',
                description: 'Plugin for testing duplicate handling',
                nodes: [
                    {
                        type: 'DuplicateNode',
                        ports: {
                            inputs: ['input'],
                            outputs: ['output']
                        },
                        executor: async function(node, workflow, connections, inputs = {}) {
                            return { output: inputs.input };
                        }
                    }
                ]
            };
            
            fs.writeFileSync(
                path.join(testPluginDir, 'index.js'),
                `module.exports = ${JSON.stringify(testPlugin, null, 2)};`
            );

            await pluginLoader.loadPlugins();
            
            const nodes = pluginLoader.getRegisteredNodes();
            expect(nodes.size).toBe(1);
            expect(nodes.has('DuplicateNode')).toBe(true);
        });
    });

    describe('Plugin Validation', () => {
        test('should validate plugin structure', () => {
            const pluginLoader = new PluginLoader();
            
            // Test valid plugin
            const validPlugin = {
                name: 'Valid Plugin',
                version: '1.0.0',
                description: 'Valid plugin for testing',
                nodes: [
                    {
                        type: 'ValidNode',
                        ports: {
                            inputs: ['input'],
                            outputs: ['output']
                        },
                        executor: async function(node, workflow, connections, inputs = {}) {
                            return { output: inputs.input };
                        }
                    }
                ]
            };
            
            expect(pluginLoader.validatePlugin(validPlugin, 'test-plugin')).toBe(true);
            
            // Test invalid plugin (missing name)
            const invalidPlugin1 = {
                version: '1.0.0',
                description: 'Invalid plugin',
                nodes: []
            };
            
            expect(pluginLoader.validatePlugin(invalidPlugin1, 'test-plugin')).toBe(false);
            
            // Test invalid plugin (missing nodes)
            const invalidPlugin2 = {
                name: 'Invalid Plugin',
                version: '1.0.0',
                description: 'Invalid plugin'
            };
            
            expect(pluginLoader.validatePlugin(invalidPlugin2, 'test-plugin')).toBe(false);
        });

        test('should validate node structure', () => {
            const pluginLoader = new PluginLoader();
            
            // Test valid node
            const validNode = {
                type: 'ValidNode',
                ports: {
                    inputs: ['input'],
                    outputs: ['output']
                },
                executor: async function(node, workflow, connections, inputs = {}) {
                    return { output: inputs.input };
                }
            };
            
            expect(pluginLoader.validateNode(validNode, 'test-plugin')).toBe(true);
            
            // Test invalid node (missing type)
            const invalidNode1 = {
                ports: {
                    inputs: ['input'],
                    outputs: ['output']
                },
                executor: async function(node, workflow, connections, inputs = {}) {
                    return { output: inputs.input };
                }
            };
            
            expect(pluginLoader.validateNode(invalidNode1, 'test-plugin')).toBe(false);
            
            // Test invalid node (missing ports)
            const invalidNode2 = {
                type: 'InvalidNode',
                executor: async function(node, workflow, connections, inputs = {}) {
                    return { output: inputs.input };
                }
            };
            
            expect(pluginLoader.validateNode(invalidNode2, 'test-plugin')).toBe(false);
        });
    });

    describe('Plugin Integration', () => {
        test('should check if node type is from plugin', () => {
            const pluginLoader = new PluginLoader();
            
            expect(pluginLoader.isPluginNode('NonExistentNode')).toBe(false);
            
            // Add a plugin node manually for testing
            pluginLoader.registerNode({
                type: 'TestPluginNode',
                ports: { inputs: ['input'], outputs: ['output'] },
                executor: async function(node, workflow, connections, inputs = {}) {
                    return { output: inputs.input };
                },
                plugin: 'test-plugin'
            });
            
            expect(pluginLoader.isPluginNode('TestPluginNode')).toBe(true);
            expect(pluginLoader.isPluginNode('NonExistentNode')).toBe(false);
        });

        test('should get node definition by type', () => {
            const pluginLoader = new PluginLoader();
            
            // Add a plugin node manually for testing
            const testNode = {
                type: 'TestPluginNode',
                ports: { inputs: ['input'], outputs: ['output'] },
                executor: async function(node, workflow, connections, inputs = {}) {
                    return { output: inputs.input };
                },
                plugin: 'test-plugin'
            };
            
            pluginLoader.registerNode(testNode);
            
            const retrievedNode = pluginLoader.getNode('TestPluginNode');
            expect(retrievedNode).toBe(testNode);
            expect(pluginLoader.getNode('NonExistentNode')).toBeNull();
        });
    });
});
