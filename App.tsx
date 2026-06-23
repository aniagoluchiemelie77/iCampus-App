import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  View,
  StyleSheet,
  Platform,
  UIManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from './src/components/store'; 
import { Provider } from 'react-redux';
import { ThemeProvider } from './src/context/ThemeContext';
import Toast from 'react-native-toast-message';
import type {
  Posts,
  User,
  CourseException,
  Lecture,
  Course,
  MarketplaceOrder,
  Product,
} from './src/types/firebase';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
const linking = {
  prefixes: ['https://useicampus.app', 'icampus://'],
  config: {
    screens: {
      Home: 'home',
      AdminDashboard: 'admin-hub',
      Login: 'login',
      SignUp: 'signup',
      TransactionDetail: 'transaction/:transactionId',
      ProductDetails: 'product/:productId',
      Profile: 'user/:identifier',
      Chat: 'chat/:recipientId',
      CartScreen: 'cart',
      SalesHub: 'sales',
      CourseLearningScreen: 'course/:courseId',
      LiveClassSessions: 'live-class/:lectureId',
      Settings: 'settings',
      EditProfile: 'profile/edit',
      ResetPasswordScreen: 'reset-password',
      Notifications: 'notifications',
      NotificationDetails: 'notification/:notificationId',
      FAQScreen: 'faq',
    },
  },
};
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TransitionPresets } from '@react-navigation/stack';
import { navigationRef } from './src/context/navigationContext.ts';

import SignUpScreen from './src/screens/Signup';
import SignupPage from './src/screens/SignupPage';
import WelcomeScreen from './src/screens/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen';
import ForgotPasswordScreen from './src/screens/ForgotPassword';
import ChangePasswordScreen from './src/screens/ChangePassword';
import { Settings } from './src/screens/Settings';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ProductDetailScreen } from './src/screens/ProductDetailScreen';
import { CheckoutScreen } from './src/screens/Checkout.tsx';
import Notifications from './src/screens/Notifications';
import Login from './src/screens/Login';
import NotificationDetails from './src/screens/NotificationDetails';
import { ICashBuyPage } from './src/screens/BuyiCashScreen.tsx';
import { ICashWithdrawPage } from './src/screens/WithdrawiCashScreen.tsx';
import PostDetailScreen from './src/screens/PostDetailsScreen';
import CreatePost from './src/screens/CreatePost';
import { CourseSubPage } from './src/screens/CourseSubPage';
import { LiveClassSessions } from './src/screens/LiveClassSession.tsx';
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
import { ICashSuccessScreen } from './src/screens/iCashSuccessScreen.tsx';
import { IcashP2PScreen } from './src/screens/P2PTransfersScreen.tsx';
import { AllTransactionsScreen } from './src/screens/TransactionHistoryMainScreen.tsx';
import { ChatScreen } from './src/screens/ChatScreen.tsx';
import { MessagesListScreen } from './src/screens/MessagesListScreen.tsx';
import { EditProfileScreen } from './src/screens/EditProfileScreen.tsx';
import { PersonaVerificationScreen } from './src/screens/PersonaVerificationScreen.tsx';
import { LinkedDevicesScreen } from './src/screens/SLinkedDevicesScreen.tsx';
import { SubscriptionScreen } from './src/screens/SubscriptionsScreen.tsx';
import { BlockedUsersScreen } from './src/screens/BlockedUsersScreen.tsx';
import { NotificationSettings } from './src/screens/SNotificationScreen.tsx';
import { ResetPasswordScreen } from './src/screens/SResetPasswordScreen.tsx';
import { EmailsScreen } from './src/screens/SEmails.tsx';
import { PhoneScreen } from './src/screens/SPhoneNumberScreens.tsx';
import { CartScreen } from './src/screens/CartScreen.tsx';
import { FavoritesScreen } from './src/screens/FavoritesScreen.tsx';
import { MarketplacePurchaseSuccessScreen } from './src/screens/MarketPurchaseSuccessScreen.tsx';
import { OrderVerificationSuccess } from './src/screens/OrderVerificationScreen.tsx';
import { PendingOrdersScreen } from './src/screens/PendingOrdersScreen.tsx';
import { DownloadsScreen } from './src/screens/CourseDownloadsScreen.tsx';
import { CourseLearningScreen } from './src/screens/DownloadsWatchScreen.tsx';
import { CertificateScreen } from './src/screens/CourseCompletionSuccessScreen.tsx';
import { MerchantDashboard } from './src/screens/MerchantScreen.tsx';
import { CreateProductScreen } from './src/screens/CreateProductScreen.tsx';
import { PayoutSuccess } from './src/screens/PayoutSuccessScreen.tsx';
import { ProductPublishSuccess } from './src/screens/ProductPublishSuccessScreen.tsx';
import { CreateReviewScreen } from './src/screens/ReviewsScreen.tsx';
import { FAQScreen } from './src/screens/FAQScreen.tsx';
import { useTheme } from './src/context/ThemeContext.tsx';
import { getToastConfig } from './src/components/ToastConfig.tsx';
import { PRIMARY_COLOR } from './src/assets/styles/colors.ts';
import { TransactionDetailScreen } from './src/screens/TransactionDetailScreen.tsx';
import { SellerProductsScreen } from './src/screens/SellerProductsScreen.tsx';
import { AdminDashboard } from './src/screens/SupportAdminDashboard.tsx';
export const baseUrl = 'http://192.168.1.98:5000/';

export type RootStackParamList = {
  SignUp: undefined;
  AdminDashboard: undefined;
  FlutterwavePayment: {
    amount: number;
    iCashToCredit: number;
    currency: string;
    email: string;
    firstname: string;
  };
  AllTransactionsScreen: {
    user: User;
    stats: {
      flow: Array<{ _id: 'in' | 'out'; total: number }>;
      topRecipients: Array<{
        _id: string;
        count: number;
        total: number;
        name: string;
      }>;
      monthly: Array<{ _id: number; total: number }>;
      currency: string;
    } | null;
  };
  Chat: { recipientId: string };
  ICashBuyPage: { refresh?: boolean };
  CreatePost: {
    type?: 'post' | 'poll';
    post?: Posts;
  };
  TransactionDetail: {
    transactionId: string;
  };
  SellerProducts: {
    sellerId: string;
    seller: any;
  };
  ICashWithdrawPage: undefined;
  FAQScreen: undefined;
  DownloadsScreen: undefined;
  CourseLearningScreen: {
    courseProduct: any;
    userProgress: {
      completedLessons: string[];
      lastAccessed: Date | string;
      progress: number;
    };
  };
  CertificateScreen: {
    certificateUrl: string;
    certificateId: string;
    details: {
      studentName: string;
      courseTitle: string;
      lecturers: string[];
      institution: string;
      logoUrl: string;
      issueDate: string;
    };
  };
  Notifications: undefined;
  NotificationSettings: undefined;
  ProductPublishSuccess: {
    productName: string;
    productType: string;
    isEditing: boolean;
  };
  SalesHub: undefined;
  VerifyOTP: {
    flw_ref: string;
    type: 'card_linking' | 'bank_linking' | 'bank_transfer' | 'mobile_money';
  };
  CreateReviewScreen: {
    targetId: string;
    productType: 'product' | 'seller' | 'agent' | 'course' | 'lecturer';
  };
  Welcome: { route: string };
  MessagesList: undefined;
  LinkedDevicesScreen: undefined;
  BlockedUsers: undefined;
  ResetPasswordScreen: undefined;
  EmailsScreen: undefined;
  PhoneScreen: undefined;
  PendingOrdersScreen: undefined;
  MSuccessScreen: {
    orders: MarketplaceOrder[];
    totalSpent: number;
  };
  Subscription: {
    targetScreen?: keyof RootStackParamList;
  };
  CourseSubPage: {
    title:
      | 'Course Contents'
      | 'Course Materials'
      | 'Assignments'
      | 'Exceptions'
      | 'Set Lecture Schedule'
      | 'Assessments'
      | 'View Lecture Schedule'
      | 'View Assessment Report';
    course: Course;
    userRole: 'student' | 'lecturer';
    lectures?: Lecture[];
    exceptions?: CourseException[];
  };
  FlutterwaveWebview: {
    url: string;
  };
  iCashSuccessScreen: {
    amountPurchased: number;
    amountPaid: number;
    currency: string;
    type: 'withdraw' | 'buy' | 'p2p';
    amount: number;
    payout: number;
    recipientUsername: string;
  };
  Assistant: {
    contextType: 'course' | 'lecture' | 'general';
    contextData?: Course | Lecture | any;
    initialMessage?: string;
    assistantTitle?: string;
    placeholder?: string;
  };
  SignupPage: { role: string };
  OrderVerificationSuccess: {
    amount: number;
    role: 'seller' | 'agent';
    productName: string;
    orderId: string;
  };
  PostDetailScreen: {
    post?: Posts;
    postId?: string;
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
  EditProfile: undefined;
  PersonaVerify: undefined;
  CreateProduct: { product?: Product };
  PayoutSuccess: { amount: number; transactionId: string };
  Home: { activeTab?: 'home' | 'classroom' | 'search' | 'store' | 'ranking' };
  LiveClassSessions: { lectureId?: string; courseId?: string };
  ForgotPasswordScreen: undefined;
  ChangePasswordScreen: {
    email?: string;
  };
  NotificationDetails: {
    notificationId?: string;
    notification?: any;
  };
  Settings: undefined;
  Profile: { identifier: string };
  SuspendedScreen: { reason: string };
  iCashSecurity: { isRegistration: boolean };
  ICashDashboard: { refresh?: boolean };
  ICashResetPin: undefined;
  ProductDetails: { productId: string };
  CartScreen: undefined;
  FavoritesScreen: undefined;
  Checkout: {
    productId?: string;
    selectedColor?: string;
    selectedSize?: string;
    quantity?: number;
  };
  IcashP2PScreen: undefined;
  Login: undefined;
};

type RouteName = 'SignUp' | 'Welcome' | 'Home' | 'Login';
const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const { colors } = useTheme();
  const toastConfig = getToastConfig(colors);
  const [initialRoute, setInitialRoute] = useState<RouteName | null>(null);
  const [initialParams, _setInitialParams] = useState<
    RootStackParamList['Welcome'] | undefined
  >(undefined);
  if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }
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
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <ThemeProvider>
          <NavigationContainer linking={linking} ref={navigationRef}>
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
                name="ICashWithdrawPage"
                component={ICashWithdrawPage}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="AdminDashboard"
                component={AdminDashboard}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CreatePost"
                component={CreatePost}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CreateReviewScreen"
                component={CreateReviewScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="TransactionDetail"
                component={TransactionDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="LiveClassSessions"
                component={LiveClassSessions}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="SellerProducts"
                component={SellerProductsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="MSuccessScreen"
                component={MarketplacePurchaseSuccessScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="FAQScreen"
                component={FAQScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PhysicalAttendanceManager"
                component={PhysicalAttendanceManager}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PendingOrdersScreen"
                component={PendingOrdersScreen}
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
                name="CreateProduct"
                component={CreateProductScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="IcashP2PScreen"
                component={IcashP2PScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Subscription"
                component={SubscriptionScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Login"
                component={Login}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ProductPublishSuccess"
                component={ProductPublishSuccess}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CertificateScreen"
                component={CertificateScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Notifications"
                component={Notifications}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="DownloadsScreen"
                component={DownloadsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CourseLearningScreen"
                component={CourseLearningScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="MessagesList"
                component={MessagesListScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PayoutSuccess"
                component={PayoutSuccess}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="OrderVerificationSuccess"
                component={OrderVerificationSuccess}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="AllTransactionsScreen"
                component={AllTransactionsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CartScreen"
                component={CartScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Assistant"
                component={Assistant}
                options={{ headerShown: false }}
              />

              <Stack.Screen
                name="Checkout"
                component={CheckoutScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="SuspendedScreen"
                component={SuspendedScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="NotificationSettings"
                component={NotificationSettings}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="FlutterwaveWebview"
                component={FlutterwaveWebview}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="iCashSecurity"
                component={ICashSecurityGateway}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="SalesHub"
                component={MerchantDashboard}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="LinkedDevicesScreen"
                component={LinkedDevicesScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="BlockedUsers"
                component={BlockedUsersScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="EmailsScreen"
                component={EmailsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PhoneScreen"
                component={PhoneScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ResetPasswordScreen"
                component={ResetPasswordScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PersonaVerify"
                component={PersonaVerificationScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ICashResetPin"
                component={ICashResetPin}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="iCashSuccessScreen"
                component={ICashSuccessScreen}
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
                component={ProfileScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Settings"
                component={Settings}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="FavoritesScreen"
                component={FavoritesScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ProductDetails"
                component={ProductDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PostDetailScreen"
                component={PostDetailScreen}
                options={{ headerShown: false }}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <Toast config={toastConfig} />
        </ThemeProvider>
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
