/**
 * Web stand-in for native-only packages (Bluetooth, biometrics, SQLite,
 * camera, push, file system...). metro.config.js points those packages here
 * for web builds only.
 *
 * Every property, call and `new` returns the same stub, so imports and
 * calls never crash; the feature just does nothing in the browser. Used as
 * a component it renders nothing.
 */
const passthrough = new Set(['toString', 'valueOf', 'toJSON']);

// eslint-disable-next-line func-names
const target = function () {};

const stub = new Proxy(target, {
  get(_target, prop) {
    if (prop === '__esModule') return true; // so `import X from` gets the stub
    if (prop === 'then') return undefined; // `await stub` resolves instead of hanging
    if (typeof prop === 'symbol') return undefined;
    if (prop === 'prototype') return target.prototype;
    if (prop === 'length') return 0;
    if (prop === 'name') return 'NativeModuleStub';
    if (passthrough.has(prop)) return () => '';
    return stub;
  },
  apply() {
    return stub;
  },
  construct() {
    return stub;
  },
});

module.exports = stub;
