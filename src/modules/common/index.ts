//
// System shared modules
//

class Disposable {
  _disposed;

  constructor() {
    this._disposed = false;
  }

  /**
   * Changes dispose state to `true`
   * @returns false if not disposed, true otherwise
   */
  dispose() {
    if (this._disposed) return true;

    this._disposed = true;
    return false;
  }
}

const $exports = (kern_module.exports = { Disposable });

export type { $exports as default };
