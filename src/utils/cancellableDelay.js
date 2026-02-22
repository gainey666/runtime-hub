// Cancellable delay helper with AbortController support
function cancellableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    // Check if already aborted immediately
    if (signal?.aborted) {
      console.log('🚫 cancellableDelay: already aborted');
      reject(new Error('aborted'));
      return;
    }

    console.log('⏰ cancellableDelay: starting', ms, 'ms, aborted:', signal?.aborted);

    // Use global setTimeout to work with Jest fake timers
    const timeoutId = setTimeout(() => {
      // Check one more time before resolving
      if (signal?.aborted) {
        console.log('🚫 cancellableDelay: aborted during timeout');
        reject(new Error('aborted'));
        return;
      }
      console.log('✅ cancellableDelay: completed');
      resolve();
    }, ms);

    const onAbort = () => {
      console.log('🚫 cancellableDelay: abort event fired');
      clearTimeout(timeoutId);
      reject(new Error('aborted'));
    };

    // Add abort listener
    signal?.addEventListener?.('abort', onAbort);

    // Cleanup listener when promise resolves/rejects
    const cleanup = () => signal?.removeEventListener?.('abort', onAbort);
    Promise.resolve().then(cleanup, cleanup);
  });
}

module.exports = { cancellableDelay };
