/**
 * Runtime Hub - Plugin Loader
 * Loads and registers plugins from the plugins/ directory.
 * Plugins can add new node types to the workflow engine.
 */

const fs = require('fs');
const path = require('path');

/**
 * Plugin Manifest Interface
 * @typedef {Object} PluginManifest
 * @property {string} name - Plugin name
 * @property {string} version - Plugin version
 * @property {string} description - Plugin description
 * @property {PluginNode[]} nodes - Array of node definitions
 */

/**
 * Plugin Node Interface
 * @typedef {Object} PluginNode
 * @property {string} type - Node type name
 * @property {Object} ports - Port definition (follows ports.js pattern)
 * @property {Function} executor - Executor function (follows node-adapters.js pattern)
 * @property {Object} config - Default configuration schema
 */

class PluginLoader {
    constructor(pluginsDir = null) {
        this.plugins = new Map();
        this.pluginNodes = new Map();
        this.pluginsDir = pluginsDir || path.join(__dirname, '..', '..', 'plugins');
    }

    /**
     * Load all plugins from the plugins directory
     */
    async loadPlugins() {
        try {
            // Create plugins directory if it doesn't exist
            if (!fs.existsSync(this.pluginsDir)) {
                fs.mkdirSync(this.pluginsDir, { recursive: true });
                console.log('📁 Created plugins directory');
                return;
            }

            // Read plugin directories
            const pluginDirs = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            console.log(`🔌 Found ${pluginDirs.length} plugin directories`);

            // Load each plugin
            for (const pluginDir of pluginDirs) {
                await this.loadPlugin(pluginDir);
            }

            console.log(`✅ Loaded ${this.plugins.size} plugins with ${this.pluginNodes.size} node types`);

        } catch (error) {
            console.error('❌ Error loading plugins:', error);
        }
    }

    /**
     * Load a single plugin
     * @param {string} pluginDir - Plugin directory name
     */
    async loadPlugin(pluginDir) {
        try {
            const pluginPath = path.join(this.pluginsDir, pluginDir);
            const indexPath = path.join(pluginPath, 'index.js');
            const manifestPath = path.join(pluginPath, 'manifest.json');

            if (!fs.existsSync(indexPath)) {
                console.warn(`⚠️ Plugin ${pluginDir} missing index.js, skipping`);
                return;
            }

            // Load plugin module
            const pluginModule = require(indexPath);
            
            // Load manifest if it exists
            let manifest = {};
            if (fs.existsSync(manifestPath)) {
                try {
                    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
                    manifest = JSON.parse(manifestContent);
                } catch (error) {
                    console.warn(`⚠️ Plugin ${pluginDir} has invalid manifest.json, using defaults`);
                }
            }

            // Combine manifest nodes with plugin module nodes
            const allNodes = [
                ...(manifest.nodes || []),
                ...(pluginModule.nodes || [])
            ];

            // Convert manifest nodes to expected structure and add executors
            const processedNodes = allNodes.map(node => {
                // Convert manifest structure to expected structure
                const processedNode = { ...node };
                
                // Convert inputs/outputs arrays to ports object
                if (node.inputs && node.outputs) {
                    processedNode.ports = {
                        inputs: node.inputs.map(input => input.name),
                        outputs: node.outputs.map(output => output.name)
                    };
                }
                
                // Add executor from plugin module if available
                if (node.type === 'Data Transform' && pluginModule.executeDataTransform) {
                    processedNode.executor = pluginModule.executeDataTransform;
                } else if (node.type === 'Logger' && pluginModule.executeLogger) {
                    processedNode.executor = pluginModule.executeLogger;
                }
                
                return processedNode;
            });

            // Create combined plugin object - manifest takes precedence for structure
            const combinedPlugin = {
                ...manifest,
                ...pluginModule,
                nodes: processedNodes
            };

            // Validate plugin structure
            if (!this.validatePlugin(combinedPlugin, pluginDir)) {
                return;
            }

            // Register plugin
            this.plugins.set(pluginDir, combinedPlugin);

            // Register plugin nodes
            for (const node of combinedPlugin.nodes) {
                this.registerNode(node, pluginDir);
            }

            console.log(`✅ Loaded plugin: ${combinedPlugin.name} v${combinedPlugin.version}`);

        } catch (error) {
            console.error(`❌ Error loading plugin ${pluginDir}:`, error);
        }
    }

    /**
     * Validate plugin structure
     * @param {Object} plugin - Plugin module
     * @param {string} pluginDir - Plugin directory name
     * @returns {boolean} - True if valid
     */
    validatePlugin(plugin, pluginDir) {
        if (!plugin.name || typeof plugin.name !== 'string') {
            console.error(`❌ Plugin ${pluginDir}: Missing or invalid name`);
            return false;
        }

        if (!plugin.version || typeof plugin.version !== 'string') {
            console.error(`❌ Plugin ${pluginDir}: Missing or invalid version`);
            return false;
        }

        if (!Array.isArray(plugin.nodes)) {
            console.error(`❌ Plugin ${pluginDir}: Missing or invalid nodes array`);
            return false;
        }

        // Validate each node
        for (const node of plugin.nodes) {
            if (!this.validateNode(node, pluginDir)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Validate node structure
     * @param {Object} node - Node definition
     * @param {string} pluginDir - Plugin directory name
     * @returns {boolean} - True if valid
     */
    validateNode(node, pluginDir) {
        if (!node.type || typeof node.type !== 'string') {
            console.error(`❌ Plugin ${pluginDir}: Node missing type`);
            return false;
        }

        if (!node.ports || typeof node.ports !== 'object') {
            console.error(`❌ Plugin ${pluginDir}: Node ${node.type} missing ports`);
            return false;
        }

        if (!node.executor || typeof node.executor !== 'function') {
            console.error(`❌ Plugin ${pluginDir}: Node ${node.type} missing executor`);
            return false;
        }

        return true;
    }

    /**
     * Register a node type
     * @param {PluginNode} node - Node definition
     * @param {string} pluginDir - Plugin directory name
     */
    registerNode(node, pluginDir) {
        if (this.pluginNodes.has(node.type)) {
            console.warn(`⚠️ Node type ${node.type} already registered, skipping`);
            return;
        }

        // Store the original node object, but add plugin info
        if (!node.plugin) {
            node.plugin = pluginDir;
        }
        this.pluginNodes.set(node.type, node);

        console.log(`📝 Registered node type: ${node.type} from ${pluginDir}`);
    }

    /**
     * Get all registered nodes
     * @returns {Map<string, PluginNode>} - Map of node type to node definition
     */
    getRegisteredNodes() {
        return this.pluginNodes;
    }

    /**
     * Get node definition by type
     * @param {string} nodeType - Node type
     * @returns {PluginNode|null} - Node definition or null
     */
    getNode(nodeType) {
        return this.pluginNodes.get(nodeType) || null;
    }

    /**
     * Get all loaded plugins
     * @returns {Map<string, Object>} - Map of plugin name to plugin module
     */
    getLoadedPlugins() {
        return this.plugins;
    }

    /**
     * Check if a node type is from a plugin
     * @param {string} nodeType - Node type
     * @returns {boolean} - True if from plugin
     */
    isPluginNode(nodeType) {
        return this.pluginNodes.has(nodeType);
    }
}

module.exports = PluginLoader;
