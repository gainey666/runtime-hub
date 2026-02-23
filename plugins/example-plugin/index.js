/**
 * Example Plugin - Hello World Node
 * Demonstrates the plugin system by adding a simple greeting node.
 */

const manifest = {
    name: 'Example Plugin',
    version: '1.0.0',
    description: 'Example plugin with Hello World node',
    nodes: [
        {
            type: 'Hello World',
            ports: {
                inputs: ['name'],
                outputs: ['greeting']
            },
            config: {
                name: {
                    type: 'string',
                    default: 'World',
                    description: 'Name to greet'
                }
            },
            executor: async function executeHelloWorld(node, workflow, connections, inputs = {}) {
                const config = node.config || {};
                const name = inputs.name || config.name || 'World';
                
                const greeting = `Hello, ${name}!`;
                
                console.log(`👋 ${greeting}`);
                
                return {
                    greeting: greeting,
                    timestamp: new Date().toISOString()
                };
            }
        }
    ]
};

module.exports = manifest;
