//
// System net communications module
//
const { Disposable } = require("base")

/**
 * Modern wrapper for xhr
 */
class XHRAdapter extends Disposable {
  xhr
  _headers
  _contentLength

  constructor(url, { method = "GET", headers = {} } = {}) {
    this._headers = {}
    this._contentLength = NaN
    this.xhr = new XMLHttpRequest()
    this.xhr.open(method, url)

    for (const key in headers) {
      this._headers[key] = headers[key]
      this.xhr.setRequestHeader(key, headers[key])
    }
  }

  get contentLength() {
    return this._contentLength
  }

  _validateHeaders() {
    const mimeType = this.xhr.getResponseHeader("Content-Type")

    if ("Accept" in this._headers && mimeType !== this._headers["Accept"])
      return false

    const length = this.xhr.getResponseHeader("Content-Length")
    if (length) this._contentLength = parseFloat(length)

    return true
  }

  /** @virtual */
  send() {
    return Promise.resolve(this.xhr)
  }

  dispose() {
    if (super.dispose()) return

    const { DONE, UNSENT, readyState } = this.xhr
    if (readyState > UNSENT && readyState < DONE) this.xhr.abort()

    this.xhr = null
  }
}

class XHRHead extends XHRAdapter {
  constructor(url, headers) {
    super(url, { method: "HEAD", headers })
  }

  send() {
    return new Promise((resolve, reject) => {
      this.xhr.addEventListener("readystatechange", () => {
        if (this.xhr.readyState < this.xhr.HEADERS_RECEIVED) return

        // everything is good?
        if (this._validateHeaders()) return resolve(this.xhr)

        reject(
          `invalid responseType, expected ${this._headers["Content-Type"]}, received ${mimeType}`
        )
        this.dispose()
      })

      this.xhr.send()
    })
  }
}

class XHRGet extends XHRAdapter {
  constructor(url, headers) {
    super(url, { method: "GET", headers })
  }

  send(body) {
    const { HEADERS_RECEIVED, DONE } = this.xhr

    return new Promise((resolve, reject) => {
      this.xhr.addEventListener("readystatechange", () => {
        switch (this.xhr.readyState) {
          case HEADERS_RECEIVED:
            if (!this._validateHeaders()) {
              reject(
                `invalid responseType, expected ${this._headers["Content-Type"]}, received ${mimeType}`
              )
              this.dispose()
            }
            return

          case DONE:
            if (this.xhr.status >= 400) reject(this.xhr.responseText)
            else resolve(this.xhr)

            this.dispose()
            return
        }
      })

      this.xhr.send(body)
    })
  }

  /**
   *
   * @param {(ev: ProgressEvent<XMLHttpRequestEventTarget>) => void} fn
   * @returns
   */
  progress(fn) {
    this.xhr.addEventListener("progress", fn)
    return this
  }
}

module.exports = { XHRHead, XHRGet }
