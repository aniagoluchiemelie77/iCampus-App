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
  Course,
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
import Login from './src/screens/Login';
import NotificationDetails from './src/screens/NotificationDetails';
import { ICashBuyPage } from './src/screens/BuyiCashScreen.tsx';
import WithdrawPointsScreen from './src/screens/WithdrawPoints';
import TransferPointsScreen from './src/screens/TransferPoints';
import ReceivePointsScreen from './src/screens/ReceivePoints';
import PostDetailScreen from './src/screens/PostDetailsScreen';
import CreatePost from './src/screens/CreatePost';
import { CourseSubPage } from 'screens/CourseSubPage';
import { LiveClassSessions } from './src/screens/LiveClassSession.tsx';
import { VideoPlayerScreen } from './src/screens/RecordedLectureScreen.tsx';
import BleManager from 'react-native-ble-manager';
import { PhysicalAttendanceManager } from './src/screens/PhysicalClassGetAttendanceScreen.tsx';
import { StudentAttendanceScanner } from './src/screens/StudentsAttendanceScanner.tsx';
import { Assistant } from './src/screens/iAssistantScreen.tsx';
import { LibraryScreen } from './src/screens/LibraryScreen.tsx';
import { ICashDashboard } from './src/screens/iCashScreen.tsx';
import { ICashResetPin } from './src/screens/ICashResetPin.tsx';
import { ICashSecurityGateway } from './src/screens/iCashBiometricsScreen.tsx';
import { SuspendedScreen } from './src/screens/SuspendedScreen.tsx';
import { VerifyOTP } from './src/screens/LinkingActionOTPVerifyScreen.tsx';
import FlutterwaveWebview from './src/screens/FlutterwaveWebview.tsx';
export const baseUrl = 'http://192.168.1.98:5000/';

export type RootStackParamList = {
  SignUp: undefined;
  //
  AddPaymentMethod: {
    onSuccess: () => void;
  };
  FlutterwavePayment: {
    amount: number;
    iCashToCredit: number;
    currency: string;
    email: string;
    firstname: string;
  };
  ICashBuyPage: { refresh?: boolean };
  CreatePost: { type: 'post' | 'poll' };
  WithdrawPointsScreen: undefined;
  ReceivePointsScreen: undefined;
  TransferPointsScreen: undefined;
  Notifications: undefined;
  VerifyOTP: {
    flw_ref: string;
    type: 'card_linking' | 'bank_linking' | 'bank_transfer' | 'mobile_money';
  };
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
  FlutterwaveWebview: {
    url: string;
  };
  iCashPurchaseSuccessScreen: {
    refresh: boolean;
    amountPurchased: number;
    amountPaid: number; // e.g., 10
    currency: string;
  };
  Assistant: {
    contextType:
      | 'course'
      | 'lecture'
      | 'iScore'
      | 'iCash'
      | 'store'
      | 'general';
    contextData: Course | Lecture | any;
    initialMessage?: string;
  };
  SignupPage: { role: string };
  PostDetailScreen: {
    post: Posts;
    postId: string;
  };
  PhysicalAttendanceManager: {
    lecture: Lecture;
    course: Course;
    exceptions: CourseException[];
  };
  StudentAttendanceScanner: {
    lecture: Lecture;
    onSuccess: () => void;
  };
  LibraryScreen: undefined;
  Home: undefined;
  LiveClassSessions: { lectureId: string; courseId: string };
  VideoPlayerScreen: {
    lectureId: string;
    url: string;
    title: string;
    userRole: 'student' | 'lecturer';
  };
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
  SuspendedScreen: { reason: string };
  iCashSecurity: { isRegistration: boolean };
  ICashDashboard: undefined;
  ICashResetPin: undefined;
  ProductDetails: { product: Product };
  ProductSellerScreen: { seller: User };
  Checkout: undefined;
  //TransactionPage: { transactionId: string };
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
    BleManager.start({ showAlert: false })
      .then(() => console.log('BleManager Initialized'))
      .catch(error => console.error('BleManager init error', error));
  }, []);
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
              name="ICashBuyPage"
              component={ICashBuyPage}
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
              name="LiveClassSessions"
              component={LiveClassSessions}
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
              name="PhysicalAttendanceManager"
              component={PhysicalAttendanceManager}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="VerifyOTP"
              component={VerifyOTP}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="StudentAttendanceScanner"
              component={StudentAttendanceScanner}
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
              name="Assistant"
              component={Assistant}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="Checkout"
              component={Checkout}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SuspendedScreen"
              component={SuspendedScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FlutterwaveWebview"
              component={FlutterwaveWebview}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="iCashSecurity"
              component={ICashSecurityGateway}
              options={{ headerShown: false }}
            />
            {/*
            <Stack.Screen
              name="AddPaymentMethod"
              component={AddPaymentMethod}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FlutterwavePayment"
              component={FlutterwavePayment}
              options={{ headerShown: false }}
            />
            */}
            <Stack.Screen
              name="ICashResetPin"
              component={ICashResetPin}
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
              name="VideoPlayerScreen"
              component={VideoPlayerScreen}
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
              name="ICashDashboard"
              component={ICashDashboard}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="LibraryScreen"
              component={LibraryScreen}
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
