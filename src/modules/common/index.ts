//
// System shared modules
//

class Disposable {
  protected _disposed;

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

import * as third_party from './third_party';
const $exports = (kern_module.exports = { Disposable, third_party });

export type { $exports as default };
