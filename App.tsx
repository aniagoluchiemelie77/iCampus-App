import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import SignUpScreen from './src/screens/SignUpScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen';

const Stack = createStackNavigator();

type RouteName = 'SignUp' | 'Welcome' | 'Home';

const App = () => {
  const [initialRoute, setInitialRoute] = useState<RouteName | null>(null);

  useEffect(() => {
    const getIpAddress = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        console.log('IP Address:', data.ip);
      } catch (error) {
        console.error('Failed to fetch IP:', error);
      }
    };

    const fetchDeviceInfo = async () => {
      const type = DeviceInfo.getDeviceType();
      const modelName = DeviceInfo.getModel();
      console.log('Device Type:', type);
      console.log('Model:', modelName);
    };

    const checkFirstLaunch = async () => {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      if (hasLaunched === null) {
        await AsyncStorage.setItem('hasLaunched', 'true');
        setInitialRoute('SignUp');
      } else {
        setInitialRoute('Welcome');
      }
    };

    getIpAddress();
    fetchDeviceInfo();
    checkFirstLaunch();
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#222',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#fff',
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
  },
});
export default App;
