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

AppRegistry.registerComponent('icampus', () => App);
