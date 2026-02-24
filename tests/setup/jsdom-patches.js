// Patch document.body setter for jsdom — allows tests to assign plain objects
// jsdom normally restricts document.body to HTMLBodyElement only
if (typeof Document !== 'undefined') {
  try {
    Object.defineProperty(Document.prototype, 'body', {
      get() {
        return this._testBody !== undefined
          ? this._testBody
          : this.querySelector('body');
      },
      set(value) {
        this._testBody = value;
      },
      configurable: true
    });
  } catch(e) {}
}
