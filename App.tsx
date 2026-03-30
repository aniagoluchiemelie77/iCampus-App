import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from './src/components/store'; // ✅ Correct
import { Provider } from 'react-redux';
import type {
  Posts,
  Product,
  User,
  CourseException,
  Lecture,
} from './src/types/firebase';
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
import SignUpScreen from './src/screens/Signup';
import SignupPage from './src/screens/SignupPage';
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
import NotificationDetails from './src/screens/NotificationDetails';
import BuyPointsScreen from './src/screens/BuyPoints';
import WithdrawPointsScreen from './src/screens/WithdrawPoints';
import TransferPointsScreen from './src/screens/TransferPoints';
import ReceivePointsScreen from './src/screens/ReceivePoints';
import PostDetailScreen from './src/screens/PostDetailsScreen';
import CreatePost from './src/screens/CreatePost';
import { CourseSubPage } from 'screens/CourseSubPage';

export const baseUrl = 'http://192.168.1.98:5000/';
export type RootStackParamList = {
  SignUp: undefined;
  BuyPointsScreen: undefined;
  CreatePost: { type: 'post' | 'poll' };
  WithdrawPointsScreen: undefined;
  ReceivePointsScreen: undefined;
  TransferPointsScreen: undefined;
  Notifications: undefined;
  Welcome: { route: string };
  CourseSubPage: {
    title:
      | 'Course Contents' //Both
      | 'Course Materials' //Both
      | 'Assignments' //Both
      | 'Exceptions' //Both
      | 'Set Lecture Schedule' //Lecturer
      | 'Assessments' //Both
      | 'View Lecture Schedule' //Student
      | 'View Assessment Report'
      | 'AI Assisted Learning'
      | 'Library'; //Student
    course: {
      courseId: string;
      courseCode: string;
      courseTitle: string;
      // Add other course properties here
    };
    userRole: 'student' | 'lecturer';
    lectures?: Lecture[]; // Optional because not all inlets provide this
    exceptions?: CourseException[];
  };
  SignupPage: { role: string };
  PostDetailScreen: { post: Posts }; //PostDetail: { postId: string };
  Home: undefined;
  ForgotPasswordScreen: undefined;
  ChangePasswordScreen: {
    email?: string;
  };
  NotificationDetails: {
    notificationId?: string;
    notification?: any;
  };
  Settings: undefined;
  Calender: undefined;
  Profile: undefined; //Profile: { userId: string };
  VerifyEmail: {
    verified?: string;
    email?: string;
  };
  ProductDetails: { product: Product };
  ProductSellerScreen: { seller: User };
  Checkout: undefined;
  PointsPage: undefined; //TransactionPage: { transactionId: string };
  Login: undefined;
};

type RouteName = 'SignUp' | 'Welcome' | 'Home' | 'Login';
const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const [initialRoute, setInitialRoute] = useState<RouteName | null>(null);
  const [initialParams, _setInitialParams] = useState<
    RootStackParamList['Welcome'] | undefined
  >(undefined);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const [accessToken, refreshToken, hasLaunched] = await Promise.all([
          AsyncStorage.getItem('accessToken'),
          AsyncStorage.getItem('refreshToken'),
          AsyncStorage.getItem('hasLaunched'),
        ]);

        if (!hasLaunched) {
          await AsyncStorage.setItem('hasLaunched', 'true');
          setInitialRoute('Welcome');
          _setInitialParams({ route: 'SignUp' });
          return;
        }

        if (accessToken) {
          setInitialRoute('Home');
          return;
        } else if (refreshToken) {
          // Logic: Try to get a new Access Token using the Refresh Token
          const response = await fetch(`${baseUrl}user/refresh-token`, {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          });

          if (response.ok) {
            const { accessToken: newAccess } = await response.json();
            await AsyncStorage.setItem('accessToken', newAccess);
            setInitialRoute('Home');
          } else {
            setInitialRoute('Welcome');
            _setInitialParams({ route: 'Login' });
          }
        } else {
          setInitialRoute('Welcome');
          _setInitialParams({ route: 'SignUp' });
        }
      } catch (error) {
        setInitialRoute('Welcome');
        _setInitialParams({ route: 'SignUp' });
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
              name="BuyPointsScreen"
              component={BuyPointsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="WithdrawPointsScreen"
              component={WithdrawPointsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreatePost"
              component={CreatePost}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TransferPointsScreen"
              component={TransferPointsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ReceivePointsScreen"
              component={ReceivePointsScreen}
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
              name="SignupPage"
              component={SignupPage}
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
              name="NotificationDetails"
              component={NotificationDetails}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CourseSubPage"
              component={CourseSubPage}
              options={({ route }) => ({
                title: route.params.title,
                headerShown: false,
              })}
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
            <Stack.Screen
              name="PostDetailScreen"
              component={PostDetailScreen}
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
