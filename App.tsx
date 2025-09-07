import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import firestore from '@react-native-firebase/firestore';
//import { saveUserToFirestore } from './src/services/firebaseServices';
import type { User } from './src/types/firebase'; // adjust path as needed

// Screens
import SignUpScreen from './src/screens/SignUpScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen';

const Stack = createStackNavigator();

type RouteName = 'SignUp' | 'Welcome' | 'Home';

const App = () => {
  const [initialRoute, setInitialRoute] = useState<RouteName | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const mongoTestResponse = await fetch(
          'http://10.0.2.2:5000/test-mongo',
        );
        const mongoTestData = await mongoTestResponse.json();
        console.log('MongoDB Test:', mongoTestData);
        if (mongoTestData.status === 'MongoDB connected') {
          const [ipResponse, hasLaunched] = await Promise.all([
            fetch('https://api.ipify.org?format=json'),
            AsyncStorage.getItem('hasLaunched'),
          ]);
          let isFirstSignUp;
          const ipData = await ipResponse.json();
          console.log('IP Address:', ipData.ip);
          const deviceType = DeviceInfo.getDeviceType();
          if (hasLaunched === null) {
            await AsyncStorage.setItem('hasLaunched', 'true');
            setInitialRoute('SignUp');
            isFirstSignUp = true;
          } else {
            setInitialRoute('Welcome');
            isFirstSignUp = false;
          }
          const user: User = {
            uid: 'user_123',
            usertype: 'student',
            isFirstLogin: isFirstSignUp,
            firstname: 'Chiemelie',
            lastname: 'Okorikpehre',
            schoolName: 'Delta State University',
            email: 'chiemelie@example.com',
            ipAddress: [ipData.ip],
            deviceType: [deviceType],
            accessToken: 'some-token',
            password: 'hashed-password',
            department: 'Computer Science',
            pointsBalance: 0,
            hasSubscribed: false,
            createdAt: firestore.Timestamp.now(),
            country: 'Nigeria',
          };
          const response = await fetch('http://10.0.2.2:5000/api/register', {
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
          } else {
            const text = await response.text();
            console.warn('Unexpected response:', text);
          }
        } else {
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
});

export default App;