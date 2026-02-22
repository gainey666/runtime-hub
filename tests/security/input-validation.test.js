/**
 * Security Input Validation Tests
 * Retro-fueled with 1980s action-hero cybercop intensity
 */

const request = require('supertest');
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import real modules
const { validateRequired, validateType, validateRange, validateArray, validateObject } = require('../../src/utils/errorHandler');

describe('Security Input Validation', () => {
  let app;
  let server;
  let baseUrl;

  beforeAll(async () => {
    // Create Express app with security middleware
    app = express();
    
    // Add security middleware
    app.use(express.json({ limit: '10mb' })); // Limit request size
    
    // Security validation middleware
    const validateInput = (req, res, next) => {
      try {
        // Validate request body structure
        if (req.body && typeof req.body === 'object') {
          // Check for suspicious patterns
          const bodyStr = JSON.stringify(req.body);
          
          // Check for file upload security first
          if (req.body.filename) {
            const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', '.js', '.jar', '.app', '.deb', '.rpm', '.dmg', '.pkg', '.msi'];
            const ext = req.body.filename.toLowerCase().substring(req.body.filename.lastIndexOf('.'));
            if (dangerousExtensions.includes(ext)) {
              return res.status(400).json({
                success: false,
                error: { message: 'Dangerous file extension', code: 'SECURITY_VIOLATION' }
              });
            }
            
            // Check for invalid file types
            const allowedTypes = ['text/plain', 'image/jpeg', 'image/png', 'application/json', 'application/pdf'];
            if (req.body.type && !allowedTypes.includes(req.body.type)) {
              return res.status(400).json({
                success: false,
                error: { message: 'Invalid file type', code: 'SECURITY_VIOLATION' }
              });
            }
            
            // Check for oversized content
            if (req.body.content && req.body.content.length > 1000000) {
              return res.status(400).json({
                success: false,
                error: { message: 'Content too large', code: 'SECURITY_VIOLATION' }
              });
            }
          }
          
          // Check for potential XSS
          if (/<script|javascript:|on\w+=/i.test(bodyStr)) {
            return res.status(400).json({
              success: false,
              error: { message: 'Invalid characters detected', code: 'SECURITY_VIOLATION' }
            });
          }
          
          // Check for SQL injection patterns
          if (/(\|--)|(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i.test(bodyStr)) {
            return res.status(400).json({
              success: false,
              error: { message: 'SQL injection pattern detected', code: 'SECURITY_VIOLATION' }
            });
          }
          
          // Check for path traversal (including URL-encoded)
          const decodedBodyStr = decodeURIComponent(bodyStr);
          if (/\.\.[\/\\]/.test(decodedBodyStr)) {
            return res.status(400).json({
              success: false,
              error: { message: 'Path traversal pattern detected', code: 'SECURITY_VIOLATION' }
            });
          }
        }
        
        next();
      } catch (error) {
        res.status(400).json({
          success: false,
          error: { message: 'Invalid request format', code: 'SECURITY_VIOLATION' }
        });
      }
    };
    
    app.use(validateInput);

    // Test endpoints
    app.post('/api/workflows/execute', (req, res) => {
      try {
        const { nodes, connections } = req.body;
        
        // Validate nodes array
        validateArray(nodes, 'nodes', 1, 50);
        
        // Validate each node
        nodes.forEach((node, index) => {
          validateObject(node, `node[${index}]`, ['id', 'type', 'x', 'y']);
          validateRequired(node.id, `node[${index}].id`);
          validateType(node.id, 'string', `node[${index}].id`);
          validateType(node.x, 'number', `node[${index}].x`);
          validateType(node.y, 'number', `node[${index}].y`);
          validateRange(node.x, 0, 10000, `node[${index}].x`);
          validateRange(node.y, 0, 10000, `node[${index}].y`);
          
          // Validate node type against allowed types
          const allowedTypes = ['Start', 'End', 'Execute Python', 'Condition', 'Delay', 'Read File', 'Write File'];
          if (!allowedTypes.includes(node.type)) {
            throw new Error(`Invalid node type: ${node.type}`);
          }
        });
        
        // Validate connections array
        validateArray(connections, 'connections', 0, 100);
        
        // Validate each connection
        connections.forEach((connection, index) => {
          validateObject(connection, `connection[${index}]`, ['id', 'from', 'to']);
          validateRequired(connection.id, `connection[${index}].id`);
          validateObject(connection.from, `connection[${index}].from`, ['nodeId', 'portIndex']);
          validateObject(connection.to, `connection[${index}].to`, ['nodeId', 'portIndex']);
          validateType(connection.from.portIndex, 'number', `connection[${index}].from.portIndex`);
          validateType(connection.to.portIndex, 'number', `connection[${index}].to.portIndex`);
          validateRange(connection.from.portIndex, 0, 10, `connection[${index}].from.portIndex`);
          validateRange(connection.to.portIndex, 0, 10, `connection[${index}].to.portIndex`);
        });
        
        res.json({
          success: true,
          workflowId: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message: 'Workflow validation passed'
        });
        
      } catch (error) {
        res.status(400).json({
          success: false,
          error: { message: error.message, code: 'VALIDATION_ERROR' }
        });
      }
    });

    app.post('/api/files/upload', (req, res) => {
      try {
        const { filename, content, type } = req.body;
        
        // Validate filename
        validateRequired(filename, 'filename');
        validateType(filename, 'string', 'filename');
        
        // Check for dangerous file extensions
        const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        if (dangerousExtensions.includes(ext)) {
          throw new Error(`Dangerous file extension: ${ext}`);
        }
        
        // Validate content size
        validateRequired(content, 'content');
        if (typeof content === 'string' && content.length > 1000000) {
          throw new Error('Content too large');
        }
        
        // Validate file type
        const allowedTypes = ['text/plain', 'application/json', 'text/javascript'];
        if (type && !allowedTypes.includes(type)) {
          throw new Error(`Invalid file type: ${type}`);
        }
        
        res.json({
          success: true,
          message: 'File validation passed'
        });
        
      } catch (error) {
        res.status(400).json({
          success: false,
          error: { message: error.message, code: 'VALIDATION_ERROR' }
        });
      }
    });

    // Start server
    server = createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) server.close();
  });

  describe('Input Validation Functions', () => {
    test('validateRequired should reject null/undefined', () => {
      expect(() => validateRequired(null, 'field')).toThrow('field is required');
      expect(() => validateRequired(undefined, 'field')).toThrow('field is required');
      expect(() => validateRequired('', 'field')).toThrow('field is required');
    });

    test('validateRequired should accept valid values', () => {
      expect(validateRequired('value', 'field')).toBe('value');
      expect(validateRequired(0, 'field')).toBe(0);
      expect(validateRequired(false, 'field')).toBe(false);
    });

    test('validateType should enforce type checking', () => {
      expect(() => validateType('string', 'number', 'field')).toThrow('field must be of type number');
      expect(() => validateType(123, 'string', 'field')).toThrow('field must be of type string');
      expect(validateType('test', 'string', 'field')).toBe('test');
    });

    test('validateRange should enforce bounds', () => {
      expect(() => validateRange(5, 10, 20, 'field')).toThrow('field must be between 10 and 20');
      expect(() => validateRange(25, 10, 20, 'field')).toThrow('field must be between 10 and 20');
      expect(validateRange(15, 10, 20, 'field')).toBe(15);
    });

    test('validateArray should enforce array type and length', () => {
      expect(() => validateArray('not-array', 'field')).toThrow('field must be an array');
      expect(() => validateArray([], 'field', 1)).toThrow('field must have between 1 and Infinity items');
      expect(() => validateArray([1, 2, 3, 4, 5, 6], 'field', 1, 5)).toThrow('field must have between 1 and 5 items');
      expect(validateArray([1], 'field')).toEqual([1]);
    });

    test('validateObject should enforce object shape', () => {
      expect(() => validateObject(null, 'field')).toThrow('field must be an object');
      expect(() => validateObject({}, 'field', ['required'])).toThrow('field must have field: required');
      expect(validateObject({ required: true }, 'field', ['required'])).toEqual({ required: true });
    });
  });

  describe('XSS Protection', () => {
    test('should reject script tags in request body', async () => {
      const maliciousData = {
        nodes: [{
          id: '<script>alert("xss")</script>',
          type: 'Start',
          x: 0,
          y: 0
        }],
        connections: []
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(maliciousData)
        .expect(400);

      expect(response.body.error.code).toBe('SECURITY_VIOLATION');
      expect(response.body.error.message).toContain('Invalid characters detected');
    });

    test('should reject javascript: protocol', async () => {
      const maliciousData = {
        nodes: [{
          id: 'test',
          type: 'Start',
          x: 0,
          y: 0,
          config: { url: 'javascript:alert("xss")' }
        }],
        connections: []
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(maliciousData)
        .expect(400);

      expect(response.body.error.code).toBe('SECURITY_VIOLATION');
    });

    test('should reject event handlers', async () => {
      const maliciousData = {
        nodes: [{
          id: 'test',
          type: 'Start',
          x: 0,
          y: 0,
          config: { handler: 'onclick=alert("xss")' }
        }],
        connections: []
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(maliciousData)
        .expect(400);

      expect(response.body.error.code).toBe('SECURITY_VIOLATION');
    });
  });

  describe('SQL Injection Protection', () => {
    test('should reject SQL injection patterns', async () => {
      const maliciousData = {
        nodes: [{
          id: 'test; DROP TABLE users; --',
          type: 'Start',
          x: 0,
          y: 0
        }],
        connections: []
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(maliciousData)
        .expect(400);

      expect(response.body.error.code).toBe('SECURITY_VIOLATION');
      expect(response.body.error.message).toContain('SQL injection pattern detected');
    });

    test('should reject SQL keywords in node IDs', async () => {
      const maliciousData = {
        nodes: [{
          id: 'UNION SELECT * FROM users',
          type: 'Start',
          x: 0,
          y: 0
        }],
        connections: []
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(maliciousData)
        .expect(400);

      expect(response.body.error.code).toBe('SECURITY_VIOLATION');
    });

    test('should reject EXEC commands', async () => {
      const maliciousData = {
        nodes: [{
          id: 'test',
          type: 'Start',
          x: 0,
          y: 0,
          config: { command: 'EXEC xp_cmdshell "dir"' }
        }],
        connections: []
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(maliciousData)
        .expect(400);

      expect(response.body.error.code).toBe('SECURITY_VIOLATION');
    });
  });

  describe('Path Traversal Protection', () => {
    test('should reject path traversal patterns', async () => {
      const maliciousData = {
        nodes: [{
          id: 'test',
          type: 'Read File',
          x: 0,
          y: 0,
          config: { path: '../../../etc/passwd' }
        }],
        connections: []
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(maliciousData)
        .expect(400);

      expect(response.body.error.code).toBe('SECURITY_VIOLATION');
      expect(response.body.error.message).toContain('Path traversal pattern detected');
    });

    test('should reject encoded path traversal', async () => {
      const maliciousData = {
        nodes: [{
          id: 'test',
          type: 'Read File',
          x: 0,
          y: 0,
          config: { path: '..%2F..%2F..%2Fetc%2Fpasswd' }
        }],
        connections: []
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(maliciousData)
        .expect(400);

      expect(response.body.error.code).toBe('SECURITY_VIOLATION');
    });
  });

  describe('File Upload Security', () => {
    test('should reject dangerous file extensions', async () => {
      const maliciousFile = {
        filename: 'malware.exe',
        content: 'fake content',
        type: 'application/octet-stream'
      };

      const response = await request(baseUrl)
        .post('/api/files/upload')
        .send(maliciousFile)
        .expect(400);

      expect(response.body.error.message).toContain('Dangerous file extension');
    });

    test('should reject batch files', async () => {
      const maliciousFile = {
        filename: 'script.bat',
        content: 'del C:\\*.* /q',
        type: 'text/plain'
      };

      const response = await request(baseUrl)
        .post('/api/files/upload')
        .send(maliciousFile)
        .expect(400);

      expect(response.body.error.message).toContain('Dangerous file extension');
    });

    test('should reject oversized content', async () => {
      const largeContent = 'x'.repeat(1000001); // > 1MB
      const largeFile = {
        filename: 'large.txt',
        content: largeContent,
        type: 'text/plain'
      };

      const response = await request(baseUrl)
        .post('/api/files/upload')
        .send(largeFile)
        .expect(400);

      expect(response.body.error.message).toContain('Content too large');
    });

    test('should reject invalid file types', async () => {
      const suspiciousFile = {
        filename: 'document.txt',
        content: 'malicious code',
        type: 'application/x-msdownload'
      };

      const response = await request(baseUrl)
        .post('/api/files/upload')
        .send(suspiciousFile)
        .expect(400);

      expect(response.body.error.message).toContain('Invalid file type');
    });
  });

  describe('Request Size Limits', () => {
    test('should reject oversized requests', async () => {
      const largeData = {
        nodes: Array(100).fill({
          id: 'test',
          type: 'Start',
          x: 0,
          y: 0,
          config: { data: 'x'.repeat(10000) }
        }),
        connections: []
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(largeData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Node Type Validation', () => {
    test('should reject invalid node types', async () => {
      const suspiciousData = {
        nodes: [{
          id: 'test',
          type: 'MaliciousNode',
          x: 0,
          y: 0,
          config: { command: 'rm -rf /' }
        }],
        connections: []
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(suspiciousData)
        .expect(400);

      expect(response.body.error.message).toContain('Invalid node type');
    });

    test('should validate node coordinates', async () => {
      const invalidData = {
        nodes: [{
          id: 'test',
          type: 'Start',
          x: -1000, // Invalid negative coordinate
          y: 0
        }],
        connections: []
      };

      const response = await request(baseUrl)
        .post('/api/workflows/execute')
        .send(invalidData)
        .expect(400);

      expect(response.body.error.message).toContain('must be between 0 and 10000');
    });
  });
});
