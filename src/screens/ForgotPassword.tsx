import React, { useState, useRef, useEffect } from 'react';
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
import { formatTime } from '../utils/durationFormatter';
import {
  verifySignupEmailCode,
  handleForgotPassword,
} from '../api/localPostApis';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { lightPalette } from '../context/ThemeContext';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'ForgotPasswordScreen'
>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const isMounted = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Form Field Processing States
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [isVerifying, setVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900);

  // Modal Control Context States
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>(
    'success',
  );
  const [alertMessage, setAlertMessage] = useState('');

  // Safeguard component lifecycle context teardowns
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleVerifyEmail = async () => {
    if (!email) {
      setAlertType('warning');
      setAlertMessage('Please enter your Email Address');
      setAlertVisible(true);
      return;
    }

    // Block structurally invalid email paths before engaging the API network layer
    if (typeof isValidEmail === 'function' && !isValidEmail(email)) {
      setAlertType('warning');
      setAlertMessage('Please enter a valid email format');
      setAlertVisible(true);
      return;
    }

    setVerifying(true);
    try {
      const response = await handleForgotPassword(email.trim().toLowerCase());

      if (!isMounted.current) return;

      if (response.success) {
        setEmailVerified(true);
        setAlertType('success');
        setAlertMessage(
          response.message ||
            'Check your Email for a 6-digit verification code',
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
      if (isMounted.current) {
        setAlertType('error');
        setAlertMessage('Network error. Please try again.');
      }
    } finally {
      if (isMounted.current) {
        setVerifying(false);
        setAlertVisible(true);
      }
    }
  };

  const handleVerifyCode = async () => {
    if (code.length < 6) {
      setAlertType('warning');
      setAlertMessage('Please enter the complete 6-digit code');
      setAlertVisible(true);
      return;
    }

    setVerifying(true);
    // Capture fixed immutable snapshot string parameters right before entering the async boundary
    const currentCodeSnapshot = code;
    const currentEmailSnapshot = email.trim().toLowerCase();

    try {
      const response = await verifySignupEmailCode(
        currentEmailSnapshot,
        currentCodeSnapshot,
      );

      if (!isMounted.current) return;

      if (response.verified) {
        const verifiedEmail = response.email || currentEmailSnapshot;
        setAlertType('success');
        setAlertMessage(
          'Code verified. You will be redirected to the change password page.',
        );
        setAlertVisible(true);

        timeoutRef.current = setTimeout(() => {
          if (isMounted.current) {
            navigation.navigate('ChangePasswordScreen', {
              email: verifiedEmail,
            });
          }
        }, 3000);
      } else {
        setAlertType('error');
        setAlertMessage('Invalid or expired code.');
        setAlertVisible(true);
      }
    } catch (error) {
      if (isMounted.current) {
        setAlertType('error');
        setAlertMessage('An unexpected verification error occurred.');
        setAlertVisible(true);
      }
    } finally {
      if (isMounted.current) {
        setVerifying(false);
      }
    }
  };
  useEffect(() => {
    if (!emailVerified) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [emailVerified]);

  return (
    <KeyboardAvoidingView
      style={SignupScreenStyles.bkg}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <IconBackground />
      <View style={StudentSignupStyles.container}>
        <Text style={StudentSignupStyles.mainHeader}>Forgot Password</Text>

        {!emailVerified ? (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
            key="email-stage-view"
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
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isVerifying}
            />
            <Text style={SignupScreenStyles.validationText}>
              {email.length > 0 &&
              typeof isValidEmail === 'function' &&
              !isValidEmail(email)
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
                {isVerifying ? 'Sending...' : 'Verify Email'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
            key="code-stage-view"
          >
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
              editable={!isVerifying}
            />
            <Text
              style={[
                SignupScreenStyles.validationText,
                {
                  color:
                    timeLeft === 0 ? lightPalette.primary : lightPalette.text,
                },
              ]}
            >
              {timeLeft > 0
                ? `Expires in: ${formatTime(timeLeft)}`
                : 'Code expired. Please request a new one.'}
            </Text>
            <TouchableOpacity
              style={[
                SignupScreenStyles.toggleBtns,
                isVerifying && SignupScreenStyles.disabledBtn,
              ]}
              onPress={handleVerifyCode}
              disabled={isVerifying}
            >
              <Text style={SignupScreenStyles.selectorHeader}>
                {timeLeft === 0
                  ? 'Expired'
                  : isVerifying
                  ? 'Verifying...'
                  : 'Submit Code'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
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
