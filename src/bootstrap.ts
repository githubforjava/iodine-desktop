/**
 * Bootstrap script for checking browser and loading main components of app
 * Main purpose is to provide loading state of app instead of browser progress bar and a white page
 * This file should be as small as possible to load more efficiently and fewer reliability on browser loading
 */
(function (main) {
  'use strict';

  try {
    eval('async function _start() {}');
  } catch (_) {
    fatal(
      'error: incompatible browser, consider updating your browser to the latest version'
    );
  }

  try {
    main(afterDOMContentLoaded, fatal);
  } catch (e) {
    fatal(e instanceof Error ? e.message : (e as string));
  }

  function fatal(msg: string | Error) {
    afterDOMContentLoaded(function () {
      var el = document.getElementById('error');

      if (!el) return;
      el.textContent = msg.toString();
    });
  }

  function afterDOMContentLoaded(fn: () => void) {
    if (document.readyState === 'interactive') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else fn();
  }
})(function (
  afterDOMContentLoaded: (fn: () => void) => void,
  fatal: (msg: Error | string) => void
) {
  'use strict';

  const kModuleManifestURL = '/bootstrap.json';
  const kManifestRequiredKeys = ['baseUrl', 'modules', 'main'];

  class Bootstrap {
    baseUrl;
    modules;
    entryModuleId;

    constructor(manifest: Record<string, any>) {
      this.validateManifest(manifest);

      this.baseUrl = manifest.baseUrl;
      this.modules = manifest.modules;
      this.entryModuleId = manifest.main;
    }

    async setModuleLoader(loader: Module) {
      await this.downloadModules();

      afterDOMContentLoaded(() => {
        const dummy = document.getElementById('dummy')!;
        document.getElementById('error')!.remove();

        dummy.addEventListener(
          'click',
          () => {
            dummy.remove();
            loader.executeKernelScript(this.entryModuleId);
          },
          { once: true }
        );
      });
    }

    validateManifest(manifest: Record<string, any>) {
      const isNotObject =
        manifest == null ||
        typeof manifest !== 'object' ||
        Array.isArray(manifest);

      if (isNotObject) throw 'error: invalid manifest file format';

      for (const prop of kManifestRequiredKeys)
        if (!(prop in manifest)) throw 'error: malformed manifest file';

      if (!manifest.modules.hasOwnProperty(manifest.main))
        throw 'error: manifest file does not include main entry';
    }

    async downloadModules() {
      for (const moduleId of Object.keys(this.modules)) {
        const modInfo = this.modules[moduleId];

        modInfo.text = await fetch(`${this.baseUrl}/${modInfo.filename}`, {
          method: 'GET',
          headers: { Accept: modInfo.type }
        }).then((res) => res.text());
      }
    }

    ensureModuleAvailability(id: string) {
      if (!this.modules.hasOwnProperty(id)) {
        throw new Error(`Module '${id}' not found`);
      }
    }

    getModuleType(id: string) {
      this.ensureModuleAvailability(id);

      return this.modules[id].type;
    }

    getModuleText(id: string) {
      this.ensureModuleAvailability(id);

      return this.modules[id].text;
    }

    getModuleFilename(id: string) {
      this.ensureModuleAvailability(id);

      return this.modules[id].filename;
    }
  }

  interface IModuleRequire {
    (id: string): any;
    resolve(id: string): string | never;
  }

  class Module {
    cache: Record<string, { exports: any; filename: string }>;
    boostrapper: Bootstrap;
    require: IModuleRequire;

    constructor(boostrapper: Bootstrap) {
      this.boostrapper = boostrapper;
      this.cache = {};

      const moduleRequire: IModuleRequire = (id: string) => {
        if (!this.cache.hasOwnProperty(id)) {
          if (this.boostrapper.getModuleType(id) === 'text/css')
            this.insertStyleSheet(id);
          else this.executeKernelScript(id);
        }

        return this.cache[id].exports;
      };

      moduleRequire.resolve = (id: string) =>
        `${this.boostrapper.baseUrl}/${this.boostrapper.getModuleFilename(id)}`;

      this.require = moduleRequire;

      this.boostrapper.setModuleLoader(this);
    }

    insertStyleSheet(id: string) {
      const styleElem = document.createElement('style');

      styleElem.innerHTML = this.boostrapper.getModuleText(id);

      this.cache[id] = {
        exports: styleElem,
        filename: this.boostrapper.getModuleFilename(id)
      };
    }

    /**
     * **Expensive call**
     *
     * execute privileged script, without any limitation
     */
    executeKernelScript(id: string) {
      const mainFn = new Function(
        'kern_module',
        'kern_exports',
        'kern_require',
        '__filename',
        this.boostrapper.getModuleText(id)
      );

      const module = (this.cache[id] = {
        exports: {},
        filename: this.boostrapper.getModuleFilename(id)
      });

      mainFn(module, module.exports, this.require, module.filename);
    }
  }

  fetch(kModuleManifestURL, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  })
    .then((res) => res.json())
    .then((json) => new Bootstrap(json))
    .then((boostrapper) => new Module(boostrapper))
    .catch((reason) => {
      fatal(`error: could not download manifest file: ${reason}`);
    });
});
