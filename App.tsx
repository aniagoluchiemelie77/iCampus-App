import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
//import firestore from '@react-native-firebase/firestore';
import { TransitionPresets } from '@react-navigation/stack';
//import { saveUserToFirestore } from './src/services/firebaseServices';
import type { User } from './src/types/firebase'; // adjust path as needed
// Screens
import SignUpScreen from './src/screens/SignUpScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen';
export type RootStackParamList = {
  SignUp: undefined;
  Welcome: undefined;
  Home: undefined;
};

type RouteName = 'SignUp' | 'Welcome' | 'Home';
const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const [initialRoute, setInitialRoute] = useState<RouteName | null>(null);
  const generateId = (length = 8) => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
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
        let isFirstSignUp;
        const ipData = await ipResponse.json();
        const deviceType = DeviceInfo.getDeviceType();
        if (hasLaunched === null) {
          setInitialRoute('SignUp');
          isFirstSignUp = true;
          const id = generateId();
          await AsyncStorage.setItem('hasLaunched', 'true');
          await AsyncStorage.setItem('userId', id);
          const user: User = {
            uid: id,
            usertype: '',
            isFirstLogin: isFirstSignUp,
            firstname: '',
            lastname: '',
            schoolName: '',
            email: '',
            ipAddress: [ipData.ip],
            deviceType: [deviceType],
            accessToken: '',
            password: '',
            department: '',
            pointsBalance: 0,
            hasSubscribed: false,
            createdAt: new Date().toISOString(),
            country: '',
          };
          const response = await fetch('http://192.168.1.98:5000/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(user),
          });
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const result = await response.json();
             console.log('Server response:', result);
          }else {
            const text = await response.text();
            console.warn('Unexpected response:', text);
          }
          if (!response.ok) {
            console.error(`❌ Server error: ${response.status}`);
            return;
          }
        } else {
          getUserId();
          const storedId = await AsyncStorage.getItem('userId');
          if (storedId) {
            const response = await fetch(`http://192.168.1.98:5000/users/${storedId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ isFirstLogin: false }),
            }); 
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const result = await response.json();
              console.log(result);
            }else {
              const text = await response.text();
              console.warn('Unexpected response:', text);
            }
          }
          setInitialRoute('Welcome');
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
    <NavigationContainer>
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
            ...TransitionPresets.FadeFromRightAndroid, // ✅ or SlideFromRightIOS
          }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
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
});

export default App;
