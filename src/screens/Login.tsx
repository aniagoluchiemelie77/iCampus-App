import 'react-native-get-random-values';
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { loginUser } from '../api/localPostApis';
import { useDispatch } from 'react-redux';
import { setUser } from '../components/UserSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SweetAlertModal from '../components/alertscomponent';
import { useNavigation } from '@react-navigation/native';
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

const Login = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>(
    'success',
  );
  const [alertMessage, setAlertMessage] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialsLogin, setIsSocialsLogin] = useState(false);

  const performLogin = useCallback(
    async (payload: any) => {
      setIsLoading(true);
      try {
        const deviceId = await DeviceInfo.getUniqueId();
        const deviceName = DeviceInfo.getModel();
        const brand = DeviceInfo.getBrand();

        const response = await loginUser({
          ...payload,
          deviceId,
          deviceName: `${brand} ${deviceName}`,
        });

        if (response.success) {
          const { accessToken, refreshToken, user } = response;
          await AsyncStorage.setItem('accessToken', accessToken);
          await AsyncStorage.setItem('refreshToken', refreshToken);
          await AsyncStorage.setItem('user', JSON.stringify(user));

          dispatch(
            setUser({ ...user, accessToken, tokenCreatedAt: Date.now() }),
          );

          if (user.isSuspended) {
            navigation.replace('SuspendedScreen', {
              reason: 'This account has been flagged for security violations.',
            });
          } else {
            navigation.navigate('Home', { activeTab: 'home' });
          }
        } else {
          setAlertType('error');
          setAlertMessage(response.message || 'Invalid credentials.');
          setAlertVisible(true);
        }
      } catch (error) {
        setAlertType('error');
        setAlertMessage('Network error. Please check your connection.');
        setAlertVisible(true);
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, navigation],
  );

  const handlePasswordLogin = () => {
    setIsSocialsLogin(false);
    if (!identifier || !password) {
      setAlertMessage('Ensure required fields are not empty.');
      setAlertType('error');
      setAlertVisible(true);
      return;
    }
    performLogin({ identifier, password, socialProvider: 'password' });
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    setIsSocialsLogin(true);
    try {
      let token = '';
      let email = '';

      if (provider === 'google') {
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();
        token = response.data?.idToken || '';
        email = response.data?.user?.email || '';
      } else {
        const result = await authorize(githubConfig);
        token = result.accessToken;
        const emailResponse = await fetch(
          'https://api.github.com/user/emails',
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const emails = await emailResponse.json();
        email =
          emails.find((e: any) => e.primary && e.verified)?.email ||
          emails[0]?.email;
      }

      if (!email) throw new Error('Could not retrieve verified email');
      await performLogin({
        identifier: email,
        idToken: token,
        socialProvider: provider,
      });
    } catch (err) {
      setAlertMessage('Social login failed.');
      setAlertType('error');
      setAlertVisible(true);
    } finally {
      setIsLoading(false);
    }
  };
  const canSubmit = useMemo(() => {
    return isSocialsLogin || (isValidEmail(identifier) && password.length > 0);
  }, [identifier, password, isSocialsLogin]);

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

        <TextInput
          placeholder="Enter your email..."
          style={StudentSignupStyles.input}
          value={identifier}
          onChangeText={setIdentifier}
        />
        <Text style={SignupScreenStyles.validationText}>
          {identifier.length > 0 && !isValidEmail(identifier)
            ? 'Invalid email format'
            : ''}
        </Text>

        <View style={StudentSignupStyles.passwordInput}>
          <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
            <MaterialIcons
              name={
                showPassword ? 'visibility-off-outlined' : 'visibility-outlined'
              }
              size={20}
              color="#333"
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
          style={SignupScreenStyles.toggleBtns}
          onPress={handlePasswordLogin}
          disabled={isLoading || canSubmit}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={SignupScreenStyles.toggleBtnsText}>Login</Text>
          )}
        </TouchableOpacity>

        <View style={StudentSignupStyles.socialContainer}>
          <TouchableOpacity
            style={StudentSignupStyles.socialButton}
            onPress={() => handleSocialLogin('google')}
            disabled={isLoading}
          >
            <Icon name="logo-google" size={20} color={PRIMARY_COLOR} />
            <Text style={StudentSignupStyles.socialButtonText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={StudentSignupStyles.socialButton}
            onPress={() => handleSocialLogin('github')}
            disabled={isLoading}
          >
            {/* Using the Icon component here fixes the 'never read' warning */}
            <Icon name="logo-github" size={20} color={PRIMARY_COLOR} />
            <Text style={StudentSignupStyles.socialButtonText}>GitHub</Text>
          </TouchableOpacity>
        </View>
      </View>

      <SweetAlertModal
        visible={alertVisible}
        onConfirm={() => setAlertVisible(false)}
        title={alertType === 'error' ? 'Oops!' : 'Notice'}
        message={alertMessage}
        type={alertType}
      />
    </KeyboardAvoidingView>
  );
};
export default Login;