/**
 * Client Example Tests
 * Socket.IO client coverage boost
 */

// Mock socket.io-client properly now that it's installed
jest.mock('socket.io-client');

describe('RuntimeMonitorClient', () => {
  let RuntimeMonitorClient;
  let mockSocket;
  let mockIo;

  beforeEach(() => {
    // Get mocked modules
    mockIo = require('socket.io-client');
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn()
    };
    mockIo.mockReturnValue(mockSocket);
    
    // Clear module cache
    delete require.cache[require.resolve('../../src/client-example.js')];
    RuntimeMonitorClient = require('../../src/client-example.js');
    
    // Reset mocks
    jest.clearAllMocks();
  });

  test('should create client with correct properties', () => {
    const client = new RuntimeMonitorClient('TestApp');
    
    expect(client.appName).toBe('TestApp');
    expect(client.socket).toBeNull();
    expect(client.appId).toBeNull();
    expect(client.nodes).toEqual([]);
    expect(client.connections).toEqual([]);
  });

  test('should connect to server and register app', async () => {
    const client = new RuntimeMonitorClient('TestApp');
    
    // Mock successful connection
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'connect') {
        setTimeout(callback, 0);
      } else if (event === 'registered') {
        setTimeout(() => callback({ appId: 'test-app-123' }), 0);
      }
    });
    
    const appId = await client.connect('http://localhost:3000');
    
    expect(mockIo).toHaveBeenCalledWith('http://localhost:3000');
    expect(mockSocket.emit).toHaveBeenCalledWith('register_app', { name: 'TestApp' });
    expect(appId).toBe('test-app-123');
    expect(client.appId).toBe('test-app-123');
  });

  test('should handle connection errors', async () => {
    const client = new RuntimeMonitorClient('TestApp');
    
    // Mock connection error
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'connect_error') {
        setTimeout(() => callback(new Error('Connection failed')), 0);
      }
    });
    
    await expect(client.connect()).rejects.toThrow('Connection failed');
  });

  test('should define nodes correctly', () => {
    const client = new RuntimeMonitorClient('TestApp');
    
    const node = client.defineNode('node1', 'Test Node', 'process', { timeout: 5000 });
    
    expect(node).toEqual({
      id: 'node1',
      name: 'Test Node',
      type: 'process',
      x: expect.any(Number),
      y: expect.any(Number),
      config: { timeout: 5000 }
    });
    
    expect(client.nodes).toHaveLength(1);
    expect(client.nodes[0]).toBe(node);
  });

  test('should define connections correctly', () => {
    const client = new RuntimeMonitorClient('TestApp');
    
    const connection = client.defineConnection('node1', 'node2');
    
    expect(connection).toEqual({
      source: 'node1',
      target: 'node2'
    });
    
    expect(client.connections).toHaveLength(1);
    expect(client.connections[0]).toBe(connection);
  });

  test('should send node graph when connected', () => {
    const client = new RuntimeMonitorClient('TestApp');
    client.socket = mockSocket;
    client.appId = 'test-app-123';
    
    client.defineNode('node1', 'Node 1', 'process');
    client.defineNode('node2', 'Node 2', 'output');
    client.defineConnection('node1', 'node2');
    
    client.sendNodeGraph();
    
    expect(mockSocket.emit).toHaveBeenCalledWith('node_data', {
      nodes: client.nodes,
      connections: client.connections
    });
  });

  test('should not send node graph when not connected', () => {
    const client = new RuntimeMonitorClient('TestApp');
    
    // Mock console.error to capture the error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    client.sendNodeGraph();
    
    expect(consoleSpy).toHaveBeenCalledWith('Not connected to server');
    expect(mockSocket.emit).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  test('should track async function execution', async () => {
    const client = new RuntimeMonitorClient('TestApp');
    client.socket = mockSocket;
    client.appId = 'test-app-123';
    
    const mockFunction = jest.fn().mockResolvedValue('test result');
    const trackedFunction = client.trackFunction('testFunction', mockFunction);
    
    const result = await trackedFunction('arg1', 'arg2');
    
    expect(result).toBe('test result');
    expect(mockFunction).toHaveBeenCalledWith('arg1', 'arg2');
    expect(mockSocket.emit).toHaveBeenCalledWith('execution_data', expect.objectContaining({
      functionName: 'testFunction',
      success: true,
      parameters: ['arg1', 'arg2']
    }));
  });

  test('should track async function errors', async () => {
    const client = new RuntimeMonitorClient('TestApp');
    client.socket = mockSocket;
    client.appId = 'test-app-123';
    
    const mockFunction = jest.fn().mockRejectedValue(new Error('Test error'));
    const trackedFunction = client.trackFunction('testFunction', mockFunction);
    
    await expect(trackedFunction()).rejects.toThrow('Test error');
    
    expect(mockSocket.emit).toHaveBeenCalledWith('execution_data', expect.objectContaining({
      functionName: 'testFunction',
      success: false,
      errorMessage: 'Test error'
    }));
  });

  test('should track sync function execution', () => {
    const client = new RuntimeMonitorClient('TestApp');
    client.socket = mockSocket;
    client.appId = 'test-app-123';
    
    const mockFunction = jest.fn().mockReturnValue('test result');
    const trackedFunction = client.trackSyncFunction('testFunction', mockFunction);
    
    const result = trackedFunction('arg1', 'arg2');
    
    expect(result).toBe('test result');
    expect(mockFunction).toHaveBeenCalledWith('arg1', 'arg2');
    expect(mockSocket.emit).toHaveBeenCalledWith('execution_data', expect.objectContaining({
      functionName: 'testFunction',
      success: true,
      parameters: ['arg1', 'arg2']
    }));
  });

  test('should track sync function errors', () => {
    const client = new RuntimeMonitorClient('TestApp');
    client.socket = mockSocket;
    client.appId = 'test-app-123';
    
    const mockFunction = jest.fn().mockImplementation(() => {
      throw new Error('Test error');
    });
    const trackedFunction = client.trackSyncFunction('testFunction', mockFunction);
    
    expect(() => trackedFunction()).toThrow('Test error');
    
    expect(mockSocket.emit).toHaveBeenCalledWith('execution_data', expect.objectContaining({
      functionName: 'testFunction',
      success: false,
      errorMessage: 'Test error'
    }));
  });
});
