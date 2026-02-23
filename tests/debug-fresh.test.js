// Fresh test without any setup interference
describe('Fresh Debug', () => {
  test('direct require test', () => {
    // Clear any cached modules
    delete require.cache[require.resolve('../src/server')];
    
    console.log('FRESH TEST - BEFORE REQUIRE');
    
    // Try using a different approach - read the file and eval it
    const fs = require('fs');
    const path = require('path');
    const serverCode = fs.readFileSync(path.join(__dirname, '../src/server.js'), 'utf8');
    
    // Create a mock module environment
    const mockExports = {};
    const mockModule = { exports: mockExports };
    
    // Execute the code in a sandbox
    const evalCode = `
      (function(module, exports, require, __dirname, __filename) {
        ${serverCode}
      })
    `;
    
    const sandboxedModule = eval(evalCode);
    sandboxedModule(mockModule, mockExports, require, __dirname, __filename);
    
    console.log('FRESH TEST - SANDBOX KEYS:', Object.keys(mockExports));
    console.log('FRESH TEST - app type:', typeof mockExports.app);
    console.log('FRESH TEST - io type:', typeof mockExports.io);
    
    expect(typeof mockExports.app).toBe('function');
    expect(typeof mockExports.io).toBe('object');
  });
});
