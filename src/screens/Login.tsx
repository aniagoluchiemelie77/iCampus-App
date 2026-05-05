import 'react-native-get-random-values';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { loginUser } from '../api/localPostApis';
import { useDispatch } from 'react-redux';
import { setUser } from '../components/UserSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SweetAlertModal from '../components/alertscomponent';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Icon from 'react-native-vector-icons/Ionicons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import {
  SignupScreenStyles,
  StudentSignupStyles,
} from '../assets/styles/colors';
import { IconBackground } from '../assets/styles/BackgroundIconPattern';
import DeviceInfo from 'react-native-device-info';
import { isValidEmail } from '../utils/SignupHelpers';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authorize } from 'react-native-app-auth';
import { githubConfig } from '../components/OtherUserSignup';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const Login = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>(
    'success',
  );
  const [alertMessage, setAlertMessage] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [idToken, setIdToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSocialsLogin, setSocialLogin] = useState(false);
  const [socialProvider, setSocialProvider] = useState<
    'google' | 'github' | 'password'
  >('password');
  const handleLogin = async () => {
    if (isSocialsLogin) {
      try {
        if (socialProvider === 'google') {
          await GoogleSignin.hasPlayServices();
          const response = await GoogleSignin.signIn();
          const token = response.data?.idToken;
          const userEmail = response.data?.user?.email;
          if (token && userEmail) {
            setIdToken(token);
            setIdentifier(userEmail);
          }
        } else if (socialProvider === 'github') {
          const result = await authorize(githubConfig);
          if (result.accessToken) {
            setIdentifier('GITHUB_USER');
            setIdToken(result.accessToken);
          }
        }
      } catch (error: any) {
        console.error('Google Sign-In Error:', error);
        const message = error;
        setAlertMessage(message);
        setAlertType('error');
        setAlertVisible(true);
        return;
      }
    }
    if (!isSocialsLogin && (identifier === null || password === null)) {
      const message = 'Ensure required fields are not empty.';
      console.log('❌ ', message);
      setAlertMessage(message);
      setAlertType('error');
      setAlertVisible(true);
      return;
    }

    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceName = DeviceInfo.getModel();
      const brand = DeviceInfo.getBrand();
      const payload = {
        identifier,
        password: isSocialsLogin ? '' : password,
        deviceId,
        deviceName: `${brand} ${deviceName}`,
        socialProvider,
        idToken,
      };
      const response = await loginUser(payload);
      if (response.success) {
        const { accessToken, refreshToken, user } = response;
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        dispatch(setUser({ ...user, accessToken, tokenCreatedAt: Date.now() }));
        if (user.isSuspended) {
          navigation.replace('SuspendedScreen', {
            reason: 'This account has been flagged for security violations.',
          });
          return;
        }
        navigation.navigate('Home');
      } else {
        setAlertType('error');
        setAlertMessage(
          response.message || 'Invalid credentials. Please try again.',
        );
        setAlertVisible(true);
      }
    } catch (error) {
      setAlertType('error');
      setAlertMessage('Network error. Please check your connection.');
      setAlertVisible(true);
      console.error('Login error:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={SignupScreenStyles.bkg}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <IconBackground />
      <View style={StudentSignupStyles.container}>
        <MaterialIcons
          name="verified-user-outlined"
          size={40}
          color={PRIMARY_COLOR}
        />
        <Text style={StudentSignupStyles.mainHeader}>Login</Text>
        <Text style={StudentSignupStyles.inputHeaderLogin}>
          Enter your Email:
        </Text>
        <View style={StudentSignupStyles.passwordInput}>
          <MaterialIcons
            name="mail-outline-outlined"
            size={20}
            color={PRIMARY_COLOR_TINT}
            style={{ marginHorizontal: 5 }}
          />
          <TextInput
            placeholder="Enter your email..."
            placeholderTextColor={PRIMARY_COLOR_TINT}
            style={StudentSignupStyles.input2}
            value={identifier}
            onChangeText={setIdentifier}
          />
        </View>
        <Text style={SignupScreenStyles.validationText}>
          {!isValidEmail(identifier) && identifier.length > 0
            ? 'Invalid email format'
            : ''}
        </Text>
        <Text style={[StudentSignupStyles.inputHeaderLogin, { marginTop: 12 }]}>
          Password:
        </Text>
        <View style={StudentSignupStyles.passwordInput}>
          <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
            <MaterialIcons
              name={
                showPassword ? 'visibility-off-outlined' : 'visibility-outlined'
              }
              size={20}
              color={PRIMARY_COLOR_TINT}
              style={{ marginHorizontal: 5 }}
            />
          </TouchableOpacity>
          <TextInput
            placeholder="Enter your password..."
            placeholderTextColor={PRIMARY_COLOR_TINT}
            style={StudentSignupStyles.input2}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
        </View>
        <TouchableOpacity
          style={[SignupScreenStyles.forgotPassDiv]}
          onPress={() => navigation.navigate('ForgotPasswordScreen')}
        >
          <Text style={SignupScreenStyles.forgotPassParagraph}>
            Forgot Password?
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={SignupScreenStyles.toggleBtns}
          onPress={handleLogin}
        >
          <Text style={SignupScreenStyles.selectorHeader}>Login</Text>
        </TouchableOpacity>
        {/* The "OR" Divider */}
        <View style={StudentSignupStyles.dividerContainer}>
          <View style={StudentSignupStyles.dividerLine} />
          <Text style={StudentSignupStyles.dividerText}>or</Text>
          <View style={StudentSignupStyles.dividerLine} />
        </View>
        <View style={StudentSignupStyles.socialContainer}>
          <TouchableOpacity
            style={StudentSignupStyles.socialButton}
            onPress={() => {
              setSocialProvider('google');
              setSocialLogin(true);
              handleLogin();
            }}
          >
            <Icon name="logo-google" size={20} color={PRIMARY_COLOR} />
            <Text style={StudentSignupStyles.socialButtonText}>
              Login with Google
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={StudentSignupStyles.socialButton}
            onPress={() => {
              setSocialProvider('github');
              setSocialLogin(true);
              handleLogin();
            }}
          >
            <Icon name="logo-github" size={20} color={PRIMARY_COLOR} />
            <Text style={StudentSignupStyles.socialButtonText}>
              Login with Github
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <SweetAlertModal
        visible={alertVisible}
        onConfirm={() => setAlertVisible(false)}
        title={
          alertType === 'success'
            ? 'Success!'
            : alertType === 'error'
            ? 'Oops!'
            : alertType === 'warning'
            ? 'Warning!'
            : 'Notice'
        }
        message={alertMessage}
        type={alertType}
      />
    </KeyboardAvoidingView>
  );
};
export default Login;