/**
 * Bootstrap script for checking browser and loading main components of app
 * Main purpose is to provide loading state of app instead of browser progress bar and a white page
 * This file should be as small as possible to load more efficiently and fewer reliability on browser loading
 */
;(function (main) {
  try {
    async function checkBrowserCompatibility() {
      await Promise.resolve()

      class _ {}
      new _()

      if (!("fetch" in window)) $throw()

      const { x } = { x: [...[]] }
    }

    checkBrowserCompatibility().then(main).catch($throw)
  } catch (err) {
    fatal(err instanceof Error ? err.message : err)
  }

  function $throw() {
    throw void 0
  }

  function fatal(msg) {
    if (document.readyState !== "loading") {
      document.getElementById("error").textContent = msg
      return
    }

    document.addEventListener("DOMContentLoaded", function () {
      document.getElementById("error").textContent = msg
    })
  }
})(function () {
  //
  // bootstrap function
  //
  const kModuleManifestURL = "/bootstrap.json"

  fetch(kModuleManifestURL, {
    method: "GET",
    headers: { Accept: "application/json" }
  })
    .then((res) => res.json())
    .then(validateManifest)
    .then(initWithManifest)
    .catch((reason) => {
      throw `error: could not download manifest file: ${reason}`
    })

  function validateManifest(manifest) {
    if (
      manifest != null &&
      typeof manifest === "object" &&
      !Array.isArray(manifest)
    )
      return manifest

    throw "error: invalid manifest file format"
  }

  let moduleBaseUrl = ""

  async function initWithManifest({ modules, baseUrl }) {
    moduleBaseUrl = baseUrl

    // Download modules without dependency first
    modules.sort((a, b) => a.dependencies.length - b.dependencies.length)

    // #region download tty for better user experience
    const ttyIndex = modules.findIndex((modInfo) => modInfo.module === "tty")
    if (ttyIndex < 0) throw "error: tty module not found"

    const ttyModuleInfo = modules[ttyIndex]
    modules.splice(ttyIndex, 1)

    const { exports: tty } = await runModuleWithInfo(ttyModuleInfo)
    // #endregion

    // TODO do something with tty
  }

  async function runModuleWithInfo(moduleInfo) {
    const modScript = await fetch(baseUrl + moduleInfo.filename, {
      method: "GET",
      headers: { Accept: "application/javascript" }
    }).then((res) => res.text())

    const modMainFn = new Function(
      "module",
      "exports",
      "require",
      "__filename",
      modScript
    )

    const $module = (requireFunction.cache[moduleInfo.module] = {
      exports: {},
      filename: moduleInfo.filename
    })

    modMainFn($module, $module.exports, requireFunction, $module.filename)

    return $module
  }

  function requireFunction(id) {
    if (!requireFunction.cache.hasOwnProperty(id))
      throw new Error(`Module '${id}' not found!`)

    return requireFunction.cache[id]
  }

  requireFunction.cache = {}

  requireFunction.resolve = function (id) {
    if (!requireFunction.cache.hasOwnProperty(id))
      throw new Error(`Module '${id}' not found!`)

    return `${moduleBaseUrl}/${id}.js`
  }

  // TODO
  class ModulesCollection {
    _modules

    constructor(urls = []) {
      this._modules = urls.map((url) => new Module(url))
    }

    async getOverallDownloadSize() {
      /** wait for all size */
      await Promise.allSettled(this._modules.map((mod) => mod.getSize()))

      return this._modules.reduce((result, mod) => {
        if (!mod.cacheSizeIsEmpty) result += mod.cachedSize

        return result
      }, 0)
    }
  }

  class Module {
    url
    _size

    constructor(url) {
      this.url = url
      this._size = NaN
    }

    /** get cached size */
    get cachedSize() {
      return this._size
    }

    get cacheSizeIsEmpty() {
      return isNaN(this._size)
    }

    /** get size with HEAD request if no cache available */
    async getSize() {
      if (!this.cacheSizeIsEmpty) return this._size

      const headReq = new XHRHead(this.url, Module.requestHeaders)

      try {
        await headReq.send()
      } finally {
        return (this._size = headReq.contentLength)
      }
    }

    /**
     * @param {(loaded: number, total: number) => void} onProgress
     */
    async download(onProgress) {
      const getReq = new XHRGet(url, Module.requestHeaders)

      const xhr = await getReq
        .progress((ev) => {
          if (isNaN(this._size)) this._size = ev.total

          onProgress(ev.loaded, this._size)
        })
        .send()

      return xhr.responseText
    }

    static get requestHeaders() {
      return { Accept: "application/javascript" }
    }
  }
})
