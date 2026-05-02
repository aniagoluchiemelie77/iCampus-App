import 'react-native-get-random-values';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import {baseUrl} from '../components/HomeScreenComponents';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch } from 'react-redux';
import { setUser } from '../components/UserSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SweetAlertModal from '../components/alertscomponent';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { SignupScreenStyles } from '../assets/styles/colors';
import { IconBackground } from '../assets/styles/BackgroundIconPattern';
import DeviceInfo from 'react-native-device-info';

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
  const [showPassword, setShowPassword] = useState(false);

  const isValidEmail = (inputEmail: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(inputEmail);
  };
  const handleLogin = async () => {
    if (!identifier || !password) {
      setAlertType('warning');
      setAlertMessage('Please enter your Email and Password.');
      setAlertVisible(true);
      return;
    }

    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceName = DeviceInfo.getModel();
      const brand = DeviceInfo.getBrand();
      const response = await fetch(`${baseUrl}users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          password,
          deviceId,
          deviceName: `${brand} ${deviceName}`,
        }),
      });

      const contentType = response.headers.get('content-type');
      if (response.ok && contentType?.includes('application/json')) {
        const result = await response.json();

        // --- THE FIX STARTS HERE ---
        const { accessToken, refreshToken, user } = result;

        // Save BOTH tokens to storage
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(user));

        // Update Redux state with the accessToken
        dispatch(setUser({ ...user, accessToken, tokenCreatedAt: Date.now() }));
        // --- THE FIX ENDS HERE ---
        if (user.isSuspended) {
          navigation.replace('SuspendedScreen', {
            reason: 'This account has been flagged for security violations.',
          });
          return;
        }
        navigation.navigate('Home');
      } else {
        const errorData = await response.json(); // Backend sends { error: "..." }
        setAlertType('error');
        setAlertMessage(
          errorData.error || 'Invalid credentials. Please try again.',
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
    <KeyboardAvoidingView style={SignupScreenStyles.bkg} behavior="padding">
      <IconBackground />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={SignupScreenStyles.bkg3}
        style={{ width: '85%' }}
      >
        <View style={SignupScreenStyles.container2}>
          <View style={SignupScreenStyles.headerBtnsContainerLogin}>
            <Text
              style={[
                SignupScreenStyles.activeTabText,
                SignupScreenStyles.welcomeHeader,
              ]}
            >
              Login
            </Text>
          </View>
          <View style={SignupScreenStyles.inputContainerLogin}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <Text style={SignupScreenStyles.inputHeader}>
                Enter your Email:
              </Text>
              <TextInput
                placeholder="Email"
                placeholderTextColor="#000"
                value={identifier}
                onChangeText={setIdentifier}
                style={SignupScreenStyles.input}
              />
              <Text style={SignupScreenStyles.validationText}>
                {!isValidEmail(identifier) && identifier.length > 0
                  ? 'Invalid email format'
                  : ''}
              </Text>
              <Text style={SignupScreenStyles.inputHeader}>Password:</Text>
              <View style={SignupScreenStyles.passwordInputWrapper}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#000"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={[SignupScreenStyles.input2]}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icon
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={22}
                    color="#000"
                    style={{ marginRight: 30 }}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[SignupScreenStyles.forgotPassDiv]}
                onPress={() => navigation.navigate('ForgotPasswordScreen')}
              >
                <Text style={[SignupScreenStyles.forgotPassParagraph]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={SignupScreenStyles.toggleBtns}
                onPress={handleLogin}
              >
                <Text style={SignupScreenStyles.selectorHeader}>Login</Text>
              </TouchableOpacity>
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
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
export default Login;