/**
 * @jest-environment jsdom
 */

/**
 * Node Library Unit Tests
 * Retro-fueled with 90s node-based workflow nostalgia
 */

// Load the node-library script
require('../../../public/node-library');

const NodeLibrary = window.NodeLibrary;

describe('NodeLibrary', () => {
  let nodeLibrary;

  beforeEach(() => {
    nodeLibrary = new NodeLibrary();
  });

  describe('Initialization', () => {
    test('should initialize with default node types', () => {
      expect(nodeLibrary.nodes.size).toBeGreaterThan(0);
      expect(nodeLibrary.nodes.has('Start')).toBe(true);
      expect(nodeLibrary.nodes.has('End')).toBe(true);
      expect(nodeLibrary.nodes.has('Execute Python')).toBe(true);
    });

    test('should have categories defined', () => {
      const categories = nodeLibrary.getCategories();
      expect(categories).toContain('Control Flow');
      expect(categories).toContain('Python');
      expect(categories).toContain('File System');
    });
  });

  describe('Node Management', () => {
    test('should get node definition', () => {
      const startNode = nodeLibrary.getNode('Start');
      expect(startNode).toBeDefined();
      expect(startNode.type).toBe('Start');
      expect(startNode.category).toBe('Control Flow');
      expect(startNode.inputs).toEqual([]);
      expect(startNode.outputs).toEqual(['main']);
    });

    test('should return undefined for non-existent node', () => {
      const nonExistent = nodeLibrary.getNode('NonExistentNode');
      expect(nonExistent).toBeUndefined();
    });

    test('should get nodes by category', () => {
      const controlFlowNodes = nodeLibrary.getNodesByCategory('Control Flow');
      expect(controlFlowNodes.length).toBeGreaterThan(0);
      expect(controlFlowNodes.some(node => node.type === 'Start')).toBe(true);
      expect(controlFlowNodes.some(node => node.type === 'End')).toBe(true);
    });

    test('should return empty array for non-existent category', () => {
      const emptyCategory = nodeLibrary.getNodesByCategory('NonExistentCategory');
      expect(emptyCategory).toEqual([]);
    });

    test('should add new node type', () => {
      const newNode = {
        type: 'Test Node',
        category: 'Test',
        name: 'Test Node',
        description: 'A test node',
        inputs: ['input1'],
        outputs: ['output1'],
        config: {},
        color: '#ff0000'
      };

      nodeLibrary.addNode(newNode);
      const retrievedNode = nodeLibrary.getNode('Test Node');
      expect(retrievedNode).toEqual(newNode);
    });

    test('should validate node definition', () => {
      const validNode = {
        type: 'Valid Node',
        category: 'Test',
        name: 'Valid Node',
        description: 'A valid node',
        inputs: ['input1'],
        outputs: ['output1'],
        config: {},
        color: '#ff0000'
      };

      expect(() => nodeLibrary.addNode(validNode)).not.toThrow();
    });

    test('should reject invalid node definition', () => {
      const invalidNode = {
        // Missing required fields
        name: 'Invalid Node'
      };

      expect(() => nodeLibrary.addNode(invalidNode)).toThrow();
    });
  });

  describe('Node Creation', () => {
    test('should create node instance', () => {
      const nodeInstance = nodeLibrary.createNodeInstance('Start');
      expect(nodeInstance).toBeDefined();
      expect(nodeInstance.type).toBe('Start');
      expect(nodeInstance.id).toBeDefined();
      expect(nodeInstance.x).toBe(0);
      expect(nodeInstance.y).toBe(0);
    });

    test('should return null for non-existent node type', () => {
      const nodeInstance = nodeLibrary.createNodeInstance('NonExistentNode');
      expect(nodeInstance).toBeNull();
    });
  });

  describe('Search and Filtering', () => {
    test('should search nodes by name', () => {
      const results = nodeLibrary.searchNodes('Start');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(node => node.type === 'Start')).toBe(true);
    });

    test('should return empty array for no matches', () => {
      const results = nodeLibrary.searchNodes('NonExistentSearchTerm');
      expect(results).toEqual([]);
    });

    test('should be case insensitive in search', () => {
      const results = nodeLibrary.searchNodes('start');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(node => node.type === 'Start')).toBe(true);
    });
  });

  describe('Serialization', () => {
    test('should export node definitions', () => {
      const exported = nodeLibrary.exportNodes();
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');

      // Should be valid JSON
      const parsed = JSON.parse(exported);
      expect(parsed).toBeDefined();
      expect(parsed.Start).toBeDefined();
    });

    test('should import node definitions', () => {
      const exportData = nodeLibrary.exportNodes();
      const importLibrary = new NodeLibrary();

      // Clear existing nodes
      importLibrary.nodes.clear();

      importLibrary.importNodes(exportData);

      // Should have imported the nodes
      expect(importLibrary.nodes.size).toBeGreaterThan(0);
      expect(importLibrary.getNode('Start')).toBeDefined();
    });

    test('should handle invalid import data gracefully', () => {
      const importLibrary = new NodeLibrary();

      expect(() => importLibrary.importNodes('invalid json')).toThrow();
      expect(() => importLibrary.importNodes('{"invalid": "format"}')).not.toThrow();
    });
  });

  describe('Node Categories', () => {
    test('should get all categories', () => {
      const categories = nodeLibrary.getCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    test('should categorize nodes correctly', () => {
      const categories = nodeLibrary.getCategories();

      categories.forEach(category => {
        const nodesInCategory = nodeLibrary.getNodesByCategory(category);
        nodesInCategory.forEach(node => {
          expect(node.category).toBe(category);
        });
      });
    });
  });

  describe('Node Properties', () => {
    test('should have proper node structure', () => {
      const startNode = nodeLibrary.getNode('Start');

      expect(startNode).toHaveProperty('type');
      expect(startNode).toHaveProperty('category');
      expect(startNode).toHaveProperty('name');
      expect(startNode).toHaveProperty('description');
      expect(startNode).toHaveProperty('inputs');
      expect(startNode).toHaveProperty('outputs');
      expect(startNode).toHaveProperty('config');
      expect(startNode).toHaveProperty('color');
    });

    test('should have valid input/output structures', () => {
      const nodes = nodeLibrary.getCategories().flatMap(cat =>
        nodeLibrary.getNodesByCategory(cat)
      );

      nodes.forEach(node => {
        expect(Array.isArray(node.inputs)).toBe(true);
        expect(Array.isArray(node.outputs)).toBe(true);

        // Inputs and outputs should be strings
        node.inputs.forEach(input => expect(typeof input).toBe('string'));
        node.outputs.forEach(output => expect(typeof output).toBe('string'));
      });
    });
  });

  describe('Node Library State', () => {
    test('should maintain state across operations', () => {
      const initialSize = nodeLibrary.nodes.size;

      // Add a node
      nodeLibrary.addNode({
        type: 'Temp Node',
        category: 'Test',
        name: 'Temp Node',
        description: 'Temporary test node',
        inputs: ['input'],
        outputs: ['output'],
        config: {},
        color: '#000000'
      });

      expect(nodeLibrary.nodes.size).toBe(initialSize + 1);

      // Remove the node (if method exists)
      if (nodeLibrary.removeNode) {
        nodeLibrary.removeNode('Temp Node');
        expect(nodeLibrary.nodes.size).toBe(initialSize);
      }
    });

    test('should handle multiple operations correctly', () => {
      const initialCategories = nodeLibrary.getCategories();

      // Add multiple nodes
      for (let i = 0; i < 3; i++) {
        nodeLibrary.addNode({
          type: `Multi Test Node ${i}`,
          category: 'Test',
          name: `Multi Test Node ${i}`,
          description: `Test node ${i}`,
          inputs: ['input'],
          outputs: ['output'],
          config: {},
          color: '#000000'
        });
      }

      // Should still have the same categories plus Test
      const newCategories = nodeLibrary.getCategories();
      expect(newCategories.length).toBeGreaterThanOrEqual(initialCategories.length);

      // Should be able to retrieve all added nodes
      for (let i = 0; i < 3; i++) {
        expect(nodeLibrary.getNode(`Multi Test Node ${i}`)).toBeDefined();
      }
    });
  });
});
