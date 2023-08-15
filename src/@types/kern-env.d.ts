namespace Iodine {
  export interface ICommonJSModule {
    exports: any;
  }

  export type CommonJSExports = Record<PropertyKey, any>;

  export type CommonJSRequire = <T>(id: string) => T;
}

declare var kern_module: Iodine.ICommonJSModule;
declare var kern_exports: Iodine.CommonJSExports;
declare var kern_require: Iodine.CommonJSRequire;
