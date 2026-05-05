import React, { useState } from 'react';
import {
  Platform,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import {
  SignupScreenStyles,
  StudentSignupStyles,
} from '../assets/styles/colors';
import { StackNavigationProp } from '@react-navigation/stack';
import SweetAlertModal from '../components/alertscomponent';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { IconBackground } from '../assets/styles/BackgroundIconPattern';
import { isValidEmail } from '../utils/SignupHelpers';
import {
  verifySignupEmailCode,
  handleForgotPassword,
} from '../api/localPostApis';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'ForgotPasswordScreen'
>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>(
    'success',
  );
  const [alertMessage, setAlertMessage] = useState('');
  const [code, setCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [isVerifying, setVerifying] = useState(false);

  const handleVerifyEmail = async () => {
    if (!email) {
      setAlertType('warning');
      setAlertMessage('Please enter your Email');
      setAlertVisible(true);
      return;
    }
    setVerifying(true);
    try {
      const response = await handleForgotPassword(email);
      if (response.success) {
        setEmailVerified(true);
        setAlertType('success');
        setAlertMessage(
          response.message ||
            'Check your Email, for a 6-digit verification code',
        );
      } else if (response.status === 404) {
        setAlertType('error');
        setAlertMessage(response.message || 'User Not Found');
      } else {
        setAlertType('error');
        setAlertMessage(
          response.message || 'Error, Failed to send verification code',
        );
      }
    } catch (error) {
      setAlertType('error');
      setAlertMessage('Network error. Please try again.');
    } finally {
      setVerifying(false);
      setAlertVisible(true);
    }
  };

  const handleVerifyCode = async () => {
    setVerifying(true);
    const response = await verifySignupEmailCode(email, code);
    if (response.verified) {
      const verifiedEmail = response.email;
      setVerifying(false);
      setAlertType('success');
      setAlertMessage('Code verified. You will be redirected to login Page.');
      setAlertVisible(true);
      setTimeout(() => {
        navigation.navigate('ChangePasswordScreen', { email: verifiedEmail });
      }, 3000);
    } else {
      setVerifying(false);
      setAlertType('error');
      setAlertMessage('Invalid or expired code.');
      setAlertVisible(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={SignupScreenStyles.bkg}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <IconBackground />
      <View style={StudentSignupStyles.container}>
        <Text style={StudentSignupStyles.mainHeader}>Forgot Password</Text>
        {!emailVerified && (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
            <Text style={StudentSignupStyles.inputHeaderLogin}>
              Enter your Email:
            </Text>
            <TextInput
              style={SignupScreenStyles.input}
              placeholder="Email"
              placeholderTextColor={PRIMARY_COLOR_TINT}
              value={email}
              onChangeText={setEmail}
            />
            <Text style={SignupScreenStyles.validationText}>
              {!isValidEmail(email) && email.length > 0
                ? 'Invalid email format'
                : ''}
            </Text>
            <TouchableOpacity
              style={[
                SignupScreenStyles.toggleBtns,
                isVerifying && SignupScreenStyles.disabledBtn,
              ]}
              onPress={handleVerifyEmail}
              disabled={isVerifying}
            >
              <Text style={SignupScreenStyles.selectorHeader}>
                {isVerifying ? 'Verifying...' : 'Verify'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        {emailVerified && (
          <>
            <Text style={StudentSignupStyles.inputHeaderLogin}>
              Enter the 6-digit verification code sent to your email:
            </Text>
            <TextInput
              style={SignupScreenStyles.input}
              placeholder="Enter 6-digit code"
              placeholderTextColor={PRIMARY_COLOR_TINT}
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              maxLength={6}
            />
            <TouchableOpacity
              style={[
                SignupScreenStyles.toggleBtns,
                isVerifying && SignupScreenStyles.disabledBtn,
              ]}
              onPress={handleVerifyCode}
              disabled={isVerifying}
            >
              <Text style={SignupScreenStyles.selectorHeader}>
                {isVerifying ? 'Verifying...' : 'Verify'}
              </Text>
            </TouchableOpacity>
          </>
        )}
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
}
