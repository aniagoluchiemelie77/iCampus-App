/**
 * @format
 */

import { AppRegistry } from 'react-native';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import App from './App';

// Must be registered before the app component, outside React. Pushes that
// arrive while the app is in the background or killed are drawn by the
// system from their `notification` block (iCampus channel, sound and icon),
// so nothing needs doing here; registering it lets Android wake the app
// headlessly instead of warning and dropping data-only messages.
setBackgroundMessageHandler(getMessaging(), async () => {});

// TEMP crash diagnostics: release builds kill the app on a fatal JS error
// without showing a stack. Log it first so it lands in `adb logcat`
// (tag ReactNativeJS). Remove once the feed crash is found.
if (global.ErrorUtils) {
  const previousHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error(
      `[CrashDebug] ${isFatal ? 'FATAL' : 'non-fatal'} JS error:`,
      error?.name,
      error?.message,
      '\n',
      error?.stack,
    );
    if (error?.componentStack) {
      console.error('[CrashDebug] component stack:', error.componentStack);
    }
    previousHandler?.(error, isFatal);
  });
}
// Hermes uses its own Promise, so track rejections through it.
global.HermesInternal?.enablePromiseRejectionTracker?.({
  allRejections: true,
  onUnhandled: (id, error) =>
    console.error(
      '[CrashDebug] unhandled promise rejection',
      id,
      error?.message ?? error,
      error?.stack,
    ),
  onHandled: () => {},
});

AppRegistry.registerComponent('icampus', () => App);
