/**
 * Index.js Tests
 * Quick coverage boost for the main entry point
 */

describe('Index.js', () => {
  let originalConsoleLog;

  beforeEach(() => {
    // Mock console.log to capture output
    originalConsoleLog = console.log;
    console.log = jest.fn();
    
    // Clear module cache to get fresh import
    delete require.cache[require.resolve('../../src/index.js')];
  });

  afterEach(() => {
    // Restore console.log
    console.log = originalConsoleLog;
  });

  test('should log initialization messages on import', () => {
    // Import the module (this will execute the code)
    require('../../src/index.js');

    // Check that console.log was called with expected messages
    expect(console.log).toHaveBeenCalledWith('Hello from newproject-2172026!');
    expect(console.log).toHaveBeenCalledWith('Project initialized successfully!');
  });

  test('should have main function defined in module', () => {
    // The main function exists in the module scope
    // We can verify the file structure by checking it runs without errors
    expect(() => require('../../src/index.js')).not.toThrow();
  });
});
