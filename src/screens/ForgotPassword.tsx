import React, { useState, useRef, useEffect } from 'react';
import {
  Platform,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { CustomButton } from '../assets/components/AppUIComponents';
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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'ForgotPasswordScreen'
>;

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const isMounted = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [isVerifying, setVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>(
    'success',
  );
  const [alertMessage, setAlertMessage] = useState('');

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
    <SafeAreaView style={styles.safeArea}>
      <IconBackground />
      <KeyboardAvoidingView
        style={styles.bkg}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.container}>
            <MaterialIcons
              name="lock-outline"
              size={60}
              color={PRIMARY_COLOR}
            />
            <Text style={styles.mainHeader}>Forgot Password</Text>

            {!emailVerified ? (
              <Animated.View
                entering={FadeInRight.duration(400).springify()}
                exiting={FadeOutLeft}
                key="email-stage-view"
                style={{ width: '100%' }}
              >
                <Text style={styles.inputHeaderLogin}>Enter your Email:</Text>
                <View style={styles.passwordInput}>
                  <MaterialIcons
                    name="email"
                    size={20}
                    color={PRIMARY_COLOR_TINT}
                    style={{ marginRight: 7 }}
                  />

                  <TextInput
                    placeholder="Enter your email..."
                    placeholderTextColor={PRIMARY_COLOR_TINT}
                    style={styles.input2}
                    value={email}
                    onChangeText={setEmail}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </View>
                {email.length > 0 &&
                  typeof isValidEmail === 'function' &&
                  !isValidEmail(email) && (
                    <Text style={styles.validationText}>
                      Invalid email format
                    </Text>
                  )}
                <CustomButton
                  title={isVerifying ? 'Verifying...' : 'Verify Email'}
                  style={[styles.toggleBtns, isVerifying && styles.disabledBtn]}
                  onPress={handleVerifyEmail}
                  disabled={isVerifying}
                />
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeInRight.duration(400).springify()}
                exiting={FadeOutLeft}
                key="code-stage-view"
                style={{ width: '100%' }}
              >
                <Text style={styles.inputHeaderLogin}>
                  Enter the 6-digit verification code sent to your email:
                </Text>
                <TextInput
                  style={styles.input}
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
                    styles.validationText,
                    {
                      color:
                        timeLeft === 0
                          ? lightPalette.primary
                          : lightPalette.text,
                    },
                  ]}
                >
                  {timeLeft > 0
                    ? `Expires in: ${formatTime(timeLeft)}`
                    : 'Code expired. Go back and request a new one.'}
                </Text>
                <CustomButton
                  title={
                    timeLeft === 0
                      ? 'Expired'
                      : isVerifying
                        ? 'Verifying...'
                        : 'Submit Code'
                  }
                  style={[styles.toggleBtns, isVerifying && styles.disabledBtn]}
                  onPress={handleVerifyCode}
                  disabled={isVerifying}
                />
              </Animated.View>
            )}
          </View>
        </ScrollView>

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
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    padding: 25,
    backgroundColor: '#fff',
    zIndex: 10,
    borderRadius: 15,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainHeader: {
    fontSize: 25,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    marginVertical: 25,
    alignSelf: 'center',
  },
  inputHeaderLogin: {
    fontSize: 14,
    color: '#222',
    fontWeight: 'bold',
    width: '100%',
    marginBottom: 20,
  },
  input: {
    borderWidth: 0.8,
    width: '100%',
    borderColor: PRIMARY_COLOR_TINT,
    color: '#222',
    borderRadius: 5,
    marginBottom: 15,
    fontSize: 14,
    height: 60,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  validationText: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: 800,
    marginBottom: 15,
    width: '100%',
  },
  toggleBtns: {
    paddingHorizontal: 15,
    marginVertical: 20,
  },
  bkg: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  disabledBtn: {
    backgroundColor: PRIMARY_COLOR_TINT,
  },
  toggleBtnsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  passwordInput: {
    width: '100%',
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    height: 60,
  },
  input2: {
    flex: 1,
    fontSize: 14,
    color: '#222',
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
    position: 'relative',
  },
});