import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from './src/components/store'; // ✅ Correct
import { Provider } from 'react-redux';
const linking = {
  prefixes: ['icampus://'],
  config: {
    screens: {
      VerifyEmail: 'verify-email',
    },
  },
};

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
//import firestore from '@react-native-firebase/firestore';
import { TransitionPresets } from '@react-navigation/stack';
//import { saveUserToFirestore } from './src/services/firebaseServices';
// Screens
import VerifyEmail from './src/screens/EmailVerificationPage';
import SignUpScreen from './src/screens/SignUpScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen';
import ForgotPasswordScreen from './src/screens/ForgotPassword';
import ChangePasswordScreen from './src/screens/ChangePassword';
import Settings from './src/screens/Settings';
import Calender from './src/screens/Calender';
import Profile from './src/screens/Profile';

export type RootStackParamList = {
  SignUp: undefined;
  Welcome: undefined;
  Home: undefined;
  ForgotPasswordScreen: undefined;
  ChangePasswordScreen: {
    email?: string;
  };
  Settings: undefined;
  Calender: undefined;
  Profile: undefined;
  VerifyEmail: {
    verified?: string;
    email?: string;
  };
};

type RouteName = 'SignUp' | 'Welcome' | 'Home';
const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const [initialRoute, setInitialRoute] = useState<RouteName | null>(null);
  const getUserId = async () => {
    const userId = await AsyncStorage.getItem('userId');
    console.log('Stored userId:', userId);
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const [ipResponse, hasLaunched] = await Promise.all([
          fetch('https://api.ipify.org?format=json'),
          AsyncStorage.getItem('hasLaunched'),
        ]);
        const ipData = await ipResponse.json();
        if (hasLaunched === null) {
          console.log(ipData);
          setInitialRoute('Welcome');
        } else {
          getUserId();
          const storedId = await AsyncStorage.getItem('userId');
          if (storedId) {
            const response = await fetch(
              `http://192.168.1.98:5000/users/${storedId}`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ isFirstLogin: false }),
              },
            );
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const result = await response.json();
              console.log(result);
            } else {
              const text = await response.text();
              console.warn('Unexpected response:', text);
            }
            setInitialRoute('Welcome');
          } else {
            setInitialRoute('Welcome');
          }
        }
      } catch (error) {
        console.error('Initialization failed:', error);
        setInitialRoute('Welcome');
      }
    };
    setTimeout(() => {
      initializeApp();
    }, 100); // slight delay to avoid blocking UI thread
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <NavigationContainer linking={linking}>
        <Stack.Navigator initialRouteName={initialRoute}>
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{
              headerShown: false,
              ...TransitionPresets.FadeFromRightAndroid,
            }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ChangePasswordScreen"
            component={ChangePasswordScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ForgotPasswordScreen"
            component={ForgotPasswordScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Profile"
            component={Profile}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Settings"
            component={Settings}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Calender"
            component={Calender}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="VerifyEmail"
            component={VerifyEmail}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#222',
    alignItems: 'center',
  },
});

export default App;
