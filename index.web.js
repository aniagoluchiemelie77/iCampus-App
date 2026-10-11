/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
AppRegistry.registerComponent('icampus', () => App);

AppRegistry.runApplication('icampus', {
  initialProps: {},
  rootTag: document.getElementById('root'),
});