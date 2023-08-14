/**
 * Bootstrap script for checking browser and loading main components of app
 * Main purpose is to provide loading state of app instead of browser progress bar and a white page
 * This file should be as small as possible to load more efficiently and fewer reliability on browser loading
 */
;(function (main) {
  "use strict"

  try {
    eval("async function _start() {}")
  } catch (_) {
    fatal(
      "error: incompatible browser, consider updating your browser to the latest version"
    )
  }

  try {
    main(fatal)
  } catch (e) {
    fatal(e instanceof Error ? e.message : e)
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
})(function (fatal) {
  "use strict"

  const kModuleManifestURL = "/bootstrap.json"
  const kManifestRequiredKeys = ["baseUrl", "modules", "main"]

  class Bootstrap {
    baseUrl
    modules
    entryModuleId

    constructor(manifest) {
      this.validateManifest(manifest)

      this.baseUrl = manifest.baseUrl
      this.modules = manifest.modules
      this.entryModuleId = manifest.main
    }

    async setModuleLoader(loader) {
      await this.downloadModules()

      loader.executeKernelScript(this.entryModuleId)
    }

    validateManifest(manifest) {
      const isNotObject =
        manifest == null ||
        typeof manifest !== "object" ||
        Array.isArray(manifest)

      if (isNotObject) throw "error: invalid manifest file format"

      for (const prop of kManifestRequiredKeys)
        if (!(prop in manifest)) throw "error: malformed manifest file"

      if (!manifest.modules.hasOwnProperty(manifest.main))
        throw "error: manifest file does not include main entry"
    }

    async downloadModules() {
      for (const moduleId of Object.keys(this.modules)) {
        const modInfo = this.modules[moduleId]

        modInfo.text = await fetch(`${this.baseUrl}/${modInfo.filename}`, {
          method: "GET",
          headers: { Accept: modInfo.type }
        }).then((res) => res.text())
      }
    }

    ensureModuleAvailability(id) {
      if (!this.modules.hasOwnProperty(id)) {
        throw new Error(`Module '${id}' not found`)
      }
    }

    getModuleType(id) {
      this.ensureModuleAvailability(id)

      return this.modules[id].type
    }

    getModuleText(id) {
      this.ensureModuleAvailability(id)

      return this.modules[id].text
    }

    getModuleFilename(id) {
      this.ensureModuleAvailability(id)

      return this.modules[id].filename
    }
  }

  class Module {
    cache

    constructor(boostrapper) {
      this.boostrapper = boostrapper
      this.cache = {}

      this.require = (id) => {
        if (!this.cache.hasOwnProperty(id)) {
          if (this.boostrapper.getModuleType(id) === "text/css")
            this.insertStyleSheet(id)
          else this.executeKernelScript(id)
        }

        return this.cache[id].exports
      }

      this.require.resolve = (id) =>
        `${this.boostrapper.baseUrl}/${this.boostrapper.getModuleFilename(id)}`

      this.boostrapper.setModuleLoader(this)
    }

    insertStyleSheet(id) {
      const styleElem = document.createElement("style")

      styleElem.innerHTML = this.boostrapper.getModuleText(id)

      this.cache[id] = {
        exports: styleElem,
        filename: this.boostrapper.getModuleFilename(id)
      }
    }

    /** execute privileged script, without any limitation */
    executeKernelScript(id) {
      const mainFn = new Function(
        "module",
        "exports",
        "require",
        "__filename",
        this.boostrapper.getModuleText(id)
      )

      const module = (this.cache[id] = {
        exports: {},
        filename: this.boostrapper.getModuleFilename(id)
      })

      mainFn(module, module.exports, this.require, module.filename)
    }
  }

  fetch(kModuleManifestURL, {
    method: "GET",
    headers: { Accept: "application/json" }
  })
    .then((res) => res.json())
    .then((json) => new Bootstrap(json))
    .then((boostrapper) => new Module(boostrapper))
    .catch((reason) => {
      fatal(`error: could not download manifest file: ${reason}`)
    })
})
