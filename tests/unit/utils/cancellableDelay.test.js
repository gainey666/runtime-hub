/**
 * Cancellable Delay Unit Tests
 * Testing our timeout cancellation utility
 */

const { cancellableDelay } = require('../../../src/utils/cancellableDelay');

describe('cancellableDelay', () => {
  let mockSignal;

  beforeEach(() => {
    mockSignal = {
      aborted: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should resolve after specified time', async () => {
    const startTime = Date.now();
    
    await cancellableDelay(100, mockSignal);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeGreaterThanOrEqual(90); // Allow some tolerance
    expect(duration).toBeLessThan(200);
  });

  test('should reject immediately if signal is already aborted', async () => {
    mockSignal.aborted = true;
    
    await expect(cancellableDelay(1000, mockSignal)).rejects.toThrow('aborted');
  });

  test('should reject when signal is aborted during delay', async () => {
    let abortCallback;
    
    mockSignal.addEventListener = jest.fn((event, callback) => {
      if (event === 'abort') {
        abortCallback = callback;
      }
    });

    const delayPromise = cancellableDelay(1000, mockSignal);
    
    // Simulate abort after 50ms
    setTimeout(() => {
      mockSignal.aborted = true;
      abortCallback();
    }, 50);

    await expect(delayPromise).rejects.toThrow('aborted');
    
    expect(mockSignal.addEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  test('should work without signal', async () => {
    const startTime = Date.now();
    
    await cancellableDelay(50);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeGreaterThanOrEqual(40);
    expect(duration).toBeLessThan(100);
  });

  test('should handle zero delay', async () => {
    const startTime = Date.now();
    
    await cancellableDelay(0, mockSignal);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(50);
  });

  test('should cleanup event listeners', async () => {
    const delayPromise = cancellableDelay(100, mockSignal);
    await delayPromise;
    
    expect(mockSignal.removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  test('should cleanup event listeners on abort', async () => {
    let abortCallback;
    
    mockSignal.addEventListener = jest.fn((event, callback) => {
      if (event === 'abort') {
        abortCallback = callback;
      }
    });

    const delayPromise = cancellableDelay(1000, mockSignal);
    
    // Abort immediately
    mockSignal.aborted = true;
    abortCallback();

    try {
      await delayPromise;
    } catch (error) {
      // Expected to reject
    }
    
    expect(mockSignal.removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
  });
});
