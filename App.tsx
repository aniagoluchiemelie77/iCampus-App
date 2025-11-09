import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from './src/components/store'; // ✅ Correct
import { Provider } from 'react-redux';
import type { Product, User } from './src/types/firebase';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import ProductDetails from './src/screens/ProductDetails';
import ProductSellerScreen from './src/screens/ProductSellerScreen';
import Checkout from './src/screens/Checkout';
import Notifications from './src/screens/Notifications';
import PointsPage from './src/screens/PointsPage';
import Login from './src/screens/Login';
export const baseUrl = 'http://192.168.1.98:5000/';
export type RootStackParamList = {
  SignUp: undefined;
  Notifications: undefined;
  Welcome: { route: string };
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
  ProductDetails: { product: Product };
  ProductSellerScreen: { seller: User };
  Checkout: undefined;
  PointsPage: { mode: 'buy' | 'withdraw' | 'transfer' | 'receive' };
  Login: undefined;
};

type RouteName = 'SignUp' | 'Welcome' | 'Home';
const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const [initialRoute, setInitialRoute] = useState<RouteName | null>(null);
  const [initialParams, setInitialParams] = useState<
    RootStackParamList['Welcome'] | undefined
  >(undefined);

  const getUserId = () => {
    const userId = 'm83Y2Blq53';
    return userId;
  };

  useEffect(() => {
    const initializeApp = async () => {
      const storedId = getUserId();
      try {
        const [ipResponse, hasLaunched] = await Promise.all([
          fetch('https://api.ipify.org?format=json'),
          AsyncStorage.getItem('hasLaunched'),
        ]);
        const ipData = await ipResponse.json();
        if (hasLaunched === null) {
          console.log(ipData);
          await AsyncStorage.setItem('hasLaunched', 'true');
          setInitialRoute('Welcome');
          setInitialParams({ route: 'SignUp' });
        } else {
          const response = await fetch(`${baseUrl}users/${storedId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isFirstLogin: false }),
          });
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const result = await response.json();
            setInitialRoute('Welcome');
            setInitialParams({ route: 'Login' });
            console.log(result);
          } else {
            const text = await response.text();
            console.warn('Unexpected response:', text);
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <NavigationContainer linking={linking}>
          <Stack.Navigator initialRouteName={initialRoute || 'SignUp'}>
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PointsPage"
              component={PointsPage}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Login"
              component={Login}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Notifications"
              component={Notifications}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="Checkout"
              component={Checkout}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Welcome"
              component={WelcomeScreen}
              initialParams={initialParams}
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
              name="ProductSellerScreen"
              component={ProductSellerScreen}
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
            <Stack.Screen
              name="ProductDetails"
              component={ProductDetails}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </Provider>
    </GestureHandlerRootView>
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
