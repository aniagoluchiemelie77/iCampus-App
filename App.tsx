import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Platform, UIManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from './src/context/store.ts';
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
  SupportTicket,
} from './src/types/firebase';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AdminLogin } from './src/screens/AdminLogin.tsx';
const linking = {
  prefixes: [
    'https://useicampus.io',
    'icampus://',
    `live.useicampus.io://`,
    `https://live.useicampus.io`,
  ],
  config: {
    screens: {
      Home: 'home',
      AdminDashboard: 'admin-hub',
      Login: 'login',
      AdminLogin: 'administrator/login/auth',
      SignUp: 'signup',
      TransactionDetail: 'transaction/:transactionId',
      PostDetailScreen: 'post/:postId',
      ProductDetails: 'product/:productId',
      Profile: 'user/:identifier',
      CartScreen: 'cart',
      SalesHub: 'product/seller-hub',
      Settings: 'settings',
      EditProfile: 'profile/edit',
      ResetPasswordScreen: 'reset-password',
      Notifications: 'notifications',
      NotificationDetails: 'notification/:notificationId',
      FAQScreen: 'faq',
      LiveClassSessions: {
        path: 'session/:lectureId/:courseId?',
        parse: {
          lectureId: (lectureId: string) => lectureId,
          courseId: (courseId: string) => courseId,
        },
      },
    },
  },
};
import { createStackNavigator } from '@react-navigation/stack';
import { TransitionPresets } from '@react-navigation/stack';
import { navigationRef, navigate } from './src/context/navigationContext.ts';

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
import { MerchantDashboard } from './src/screens/MerchantScreen.tsx';
import { CreateProductScreen } from './src/screens/CreateProductScreen.tsx';
import { PayoutSuccess } from './src/screens/PayoutSuccessScreen.tsx';
import { ProductPublishSuccess } from './src/screens/ProductPublishSuccessScreen.tsx';
import { CreateReviewScreen } from './src/screens/ReviewsScreen.tsx';
import { FAQScreen } from './src/screens/FAQScreen.tsx';
import { useTheme } from './src/context/ThemeContext.tsx';
import { getToastConfig } from './src/components/ToastConfig.tsx';
import { TransactionDetailScreen } from './src/screens/TransactionDetailScreen.tsx';
import { SellerProductsScreen } from './src/screens/SellerProductsScreen.tsx';
import { AdminDashboard } from './src/screens/SupportAdminDashboard.tsx';
import { AdminFormPage } from './src/screens/AdminCreateOrEditScreen.tsx';
import { TicketResolveScreen } from './src/screens/TicketResolveScreen.tsx';
import { ViewAllSchoolsScreen } from './src/screens/ViewAllSchoolsScreen.tsx';
import { ViewAllDropStations } from './src/screens/ViewAllDropStations.tsx';
import { SchoolAorEScreen } from './src/screens/SchoolAorE.tsx';
import { StationAorEScreen } from './src/screens/StationAorE.tsx';
import { RegisterStationScreen } from './src/screens/RegisterDropOffStation.tsx';
import { ViewAllCoursesScreen } from './src/screens/ViewAllCourses.tsx';
import { AdminSearchScreen } from './src/screens/AdminSearchScreen.tsx';
import { TermsScreen } from './src/screens/TermsScreen.tsx';
import { PrivacyScreen } from './src/screens/PrivacyPolicyScreen.tsx';
import { AllTaxEntriesScreen } from './src/screens/ViewAllTaxEntries.tsx';
import { ViewAllAdsScreen } from './src/screens/ViewAllAds.tsx';
import { AdAorEScreen } from './src/screens/AdsCreateOrEditScreen.tsx';
import { ViewAllSupportInquiriesScreen } from './src/screens/SupportInquiriesScreen.tsx';
import { SupportChatScreen } from './src/screens/SupportEmailsChat.tsx';
import { refreshAccessToken } from './src/api/localPostApis.ts';

export type RootStackParamList = {
  SignUp: undefined;
  SupportChat: {
    ticketRefId: string;
  };
  AdAorE: {
    item?: any;
  };
  AdminLogin: undefined;
  ViewAllSupportInquiries: undefined;
  RegisterStation: undefined;
  ViewAllTaxEntries: undefined;
  ViewAllAds: undefined;
  AdminSearchScreen: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  ViewAllCourses: undefined;
  AdminDashboard: undefined;
  ViewAllSchools: undefined;
  ViewAllDropStations: undefined;
  StationAorEScreen: {
    station?: any;
  };
  SchoolAorE: {
    item?: any;
  };
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
  AdminFormPage: { admin?: any };
  ICashBuyPage: { refresh?: boolean };
  CreatePost: {
    type?: 'post' | 'poll' | 'job' | 'event';
    post?: Posts;
  };
  TicketResolveScreen: {
    ticket: SupportTicket;
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
      | 'View Assessment Report'
      | 'QuickPublicClass'
      | 'Grade Accelerator';
    course?: Course;
    userRole: 'student' | 'lecturer' | 'otherUser';
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
const Stack = createStackNavigator<RootStackParamList>();

function MainApp() {
  const { colors } = useTheme();
  const toastConfig = getToastConfig(colors);
  const [initialParams, _setInitialParams] = useState<
    RootStackParamList['Welcome'] | undefined
  >(undefined);

  return (
    <NavigationContainer linking={linking} ref={navigationRef}>
      <Stack.Navigator initialRouteName={'Welcome'}>
        <Stack.Screen
          name="SignUp"
          component={SignUpScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ViewAllSupportInquiries"
          component={ViewAllSupportInquiriesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AdAorE"
          component={AdAorEScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SupportChat"
          component={SupportChatScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ViewAllSchools"
          component={ViewAllSchoolsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ViewAllAds"
          component={ViewAllAdsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AdminSearchScreen"
          component={AdminSearchScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ViewAllTaxEntries"
          component={AllTaxEntriesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AdminLogin"
          component={AdminLogin}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TermsOfService"
          component={TermsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ViewAllCourses"
          component={ViewAllCoursesScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RegisterStation"
          component={RegisterStationScreen}
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
          name="StationAorEScreen"
          component={StationAorEScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboard}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ViewAllDropStations"
          component={ViewAllDropStations}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SchoolAorE"
          component={SchoolAorEScreen}
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
          name="AdminFormPage"
          component={AdminFormPage}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TicketResolveScreen"
          component={TicketResolveScreen}
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
          name="Notifications"
          component={Notifications}
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
      <Toast config={toastConfig} />
    </NavigationContainer>
  );
}

const App = () => {
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
          navigate('Welcome', { route: 'SignUp' });
          return;
        }

        if (accessToken) {
          navigate('Welcome', { route: 'Home' });
          return;
        } else if (refreshToken) {
          const result = await refreshAccessToken(refreshToken);

          if (result.success) {
            navigate('Welcome', { route: 'Home' });
          } else {
            navigate('Welcome', { route: 'Login' });
          }
        } else {
          navigate('Welcome', { route: 'SignUp' });
        }
      } catch (error) {
        navigate('Welcome', { route: 'SignUp' });
      }
    };
    setTimeout(() => {
      initializeApp();
    }, 100);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <ThemeProvider>
          <MainApp />
        </ThemeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
};

export default App;

//Debug: adb logcat *:S ReactNative:V ReactNativeJS:V

// Go back far enough to unroll the commits containing the .env file
//(Replace HEAD~5 with however many commits back you need to go)
//git reset --soft HEAD~5
//git reset .env
//git add .
//git commit -m "Clean codebase and remove sensitive configuration files"
//git push origin --force main