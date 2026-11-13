/**
 * What `import ... from 'react-native'` resolves to in the web build (see
 * metro.config.js): react-native-web, with `Modal` swapped for the
 * width-aware WebModal. Everything else is passed through untouched.
 */
const RNW = require('react-native-web');
const WebModal = require('./WebModal.web').default;

Object.defineProperty(exports, '__esModule', { value: true });
Object.keys(RNW).forEach(key => {
  if (key === 'Modal' || key === '__esModule' || key === 'default') return;
  Object.defineProperty(exports, key, { enumerable: true, get: () => RNW[key] });
});
exports.Modal = WebModal;
