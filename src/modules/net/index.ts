//
// System net communications module
//
import Common from 'iodine/modules/common';
const { Disposable } = kern_require<typeof Common>('common');

interface XHRAdapterInit {
  method: string;
  headers: Record<string, string>;
}

/**
 * Modern wrapper for xhr
 */
class XHRAdapter extends Disposable {
  xhr: XMLHttpRequest;
  _headers: Record<string, string>;
  _contentLength;

  constructor(
    url: string | URL,
    { method = 'GET', headers = {} }: XHRAdapterInit
  ) {
    super();

    this._headers = {};
    this._contentLength = NaN;
    this.xhr = new XMLHttpRequest();
    this.xhr.open(method, url);

    for (const key in headers) {
      this._headers[key] = headers[key];
      this.xhr.setRequestHeader(key, headers[key]);
    }
  }

  get contentLength() {
    return this._contentLength;
  }

  protected validateHeaders() {
    const mimeType = this.xhr.getResponseHeader('Content-Type');

    if ('Accept' in this._headers && mimeType !== this._headers['Accept'])
      return false;

    const length = this.xhr.getResponseHeader('Content-Length');
    if (length) this._contentLength = parseFloat(length);

    return true;
  }

  /** @virtual */
  send(): Promise<XMLHttpRequest> {
    return Promise.resolve(this.xhr);
  }

  override dispose() {
    if (super.dispose()) return true;

    const { DONE, UNSENT, readyState } = this.xhr;
    if (readyState > UNSENT && readyState < DONE) this.xhr.abort();

    return false;
  }
}

class XHRHead extends XHRAdapter {
  constructor(url: string | URL, headers: Record<string, string>) {
    super(url, { method: 'HEAD', headers });
  }

  override send(): Promise<XMLHttpRequest> {
    return new Promise((resolve, reject) => {
      this.xhr.addEventListener('readystatechange', () => {
        if (this.xhr.readyState < this.xhr.HEADERS_RECEIVED) return;

        // everything is good?
        if (this.validateHeaders()) return resolve(this.xhr);

        reject(
          `invalid responseType, expected ${
            this._headers['Accept']
          }, received ${this.xhr.getResponseHeader('Content-Type')}`
        );
        this.dispose();
      });

      this.xhr.send();
    });
  }
}

class XHRGet extends XHRAdapter {
  constructor(url: string | URL, headers: Record<string, string>) {
    super(url, { method: 'GET', headers });
  }

  override send(): Promise<XMLHttpRequest> {
    const { HEADERS_RECEIVED, DONE } = this.xhr;

    return new Promise((resolve, reject) => {
      this.xhr.addEventListener('readystatechange', () => {
        switch (this.xhr.readyState) {
          case HEADERS_RECEIVED:
            if (!this.validateHeaders()) {
              reject(
                `invalid responseType, expected ${
                  this._headers['Accept']
                }, received ${this.xhr.getResponseHeader('Content-Type')}`
              );
              this.dispose();
            }
            return;

          case DONE:
            if (this.xhr.status >= 400) reject(this.xhr.responseText);
            else resolve(this.xhr);

            this.dispose();
            return;
        }
      });

      this.xhr.send();
    });
  }

  progress(fn: (ev: ProgressEvent<XMLHttpRequestEventTarget>) => void) {
    this.xhr.addEventListener('progress', fn);
    return this;
  }
}

const $exports = (kern_module.exports = { XHRHead, XHRGet });

export type { $exports as default };
