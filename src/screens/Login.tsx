import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { IconOutline } from '@ant-design/icons-react-native';
import { loginUser } from '../api/localPostApis';
import { useDispatch } from 'react-redux';
import { setUser } from '../context/UserSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToastAlert } from '../utils/toastAlert';
import { requestUserPermissionAndGetToken } from '../utils/userTokenAuth';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { IconBackground } from '../assets/styles/BackgroundIconPattern';
import DeviceInfo from 'react-native-device-info';
import { isValidEmail } from '../utils/SignupHelpers';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authorize } from 'react-native-app-auth';
import { githubConfig } from '../components/OtherUserSignup';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../assets/components/AppUIComponents';
import { normalizeIdentifier, passwordAttempts } from '../utils/loginInput';
import { saveSession } from '../utils/session';
import { FloatingSuccessIcon } from '../components/EmptyFlatlistComponent';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const Login = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const { setAlertVisible, setAlertType, setAlertMessage } = useToastAlert();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialsLogin, setIsSocialsLogin] = useState(false);

  const performLogin = useCallback(
    async (payload: any, passwordOptions: string[] = []) => {
      setIsLoading(true);
      try {
        const deviceId = await DeviceInfo.getUniqueId();
        const deviceName = DeviceInfo.getModel();
        const brand = DeviceInfo.getBrand();
        const attempt = (password?: string) =>
          loginUser({
            ...payload,
            ...(password !== undefined ? { password } : {}),
            deviceId,
            deviceName: `${brand} ${deviceName}`,
          });

        // Trimmed password first; the exact text only if that is rejected.
        let response = await attempt(passwordOptions[0]);
        if (!response.success && passwordOptions.length > 1) {
          response = await attempt(passwordOptions[1]);
        }
        if (response.success) {
          const { accessToken, refreshToken, user } = response;

          const existingUserString = await AsyncStorage.getItem('user');
          const existingUser = existingUserString
            ? JSON.parse(existingUserString)
            : {};
          const mergedUser = {
            ...user,
            theme: existingUser.theme || user.theme || 'system',
          };

          await saveSession({
            accessToken,
            refreshToken,
            user: mergedUser,
            sessionType: 'user',
          });
          dispatch(
            setUser({ ...mergedUser, accessToken, tokenCreatedAt: Date.now() }),
          );
          // Push token: only app start registered it, so a fresh login
          // (or switching accounts) got no notifications until a relaunch.
          requestUserPermissionAndGetToken(user.uid).catch(() => {});

          if (user.isSuspended) {
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'SuspendedScreen',
                  params: {
                    reason:
                      'This account has been flagged for security violations.',
                  },
                },
              ],
            });
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home', params: { activeTab: 'home' } }],
            });
          }
        } else {
          setAlertType('error');
          setAlertMessage(response.message || 'Invalid credentials.');
          setAlertVisible(true);
        }
      } catch (error: any) {
        // loginUser never throws, so anything here failed on the device
        // (device info, storage, redux): don't report it as a network error.
        console.error('iCampus: login failed on device:', error);
        setAlertType('error');
        setAlertMessage(
          `Sign in failed: ${error?.message || 'unexpected error'}. Please try again.`,
        );
        setAlertVisible(true);
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, navigation],
  );

  const handlePasswordLogin = () => {
    setIsSocialsLogin(false);
    const cleanIdentifier = normalizeIdentifier(identifier);
    const passwords = passwordAttempts(password);
    if (!cleanIdentifier || passwords.length === 0) {
      setAlertMessage('Ensure required fields are not empty.');
      setAlertType('error');
      setAlertVisible(true);
      return;
    }
    setIdentifier(cleanIdentifier);
    performLogin(
      { identifier: cleanIdentifier, socialProvider: 'password' },
      passwords,
    );
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
        identifier: normalizeIdentifier(email),
        idToken: token,
        socialProvider: provider,
      });
    } catch (err: any) {
      // Closing the Google/GitHub sheet is not an error.
      const cancelled =
        err?.code === 'SIGN_IN_CANCELLED' ||
        err?.code === '12501' ||
        /cancel/i.test(String(err?.message || ''));
      if (!cancelled) {
        setAlertMessage(
          `Could not sign in with ${provider === 'google' ? 'Google' : 'GitHub'}. Please try again.`,
        );
        setAlertType('error');
        setAlertVisible(true);
      }
    } finally {
      setIsLoading(false);
    }
  };
  // Validate the trimmed email: a trailing space from autofill used to make a
  // correct address "invalid" and disable the button.
  const trimmedIdentifier = normalizeIdentifier(identifier);
  const canSubmit = useMemo(() => {
    return (
      isSocialsLogin ||
      (isValidEmail(trimmedIdentifier) && password.trim().length > 0)
    );
  }, [trimmedIdentifier, password, isSocialsLogin]);

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
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <FloatingSuccessIcon iconName="lock" size={30} haloSize={92} />
            <Text style={styles.mainHeader}>Login</Text>
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
                value={identifier}
                onChangeText={setIdentifier}
                onEndEditing={() => setIdentifier(prev => prev.trim())}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />
            </View>
            {trimmedIdentifier.length > 0 && !isValidEmail(trimmedIdentifier) && (
              <Text style={styles.validationText}>Invalid email format</Text>
            )}

            <View style={styles.passwordInput}>
              <TouchableOpacity
                activeOpacity={0.7}
                hitSlop={10}
                onPress={() => setShowPassword(prev => !prev)}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={20}
                  color={PRIMARY_COLOR_TINT}
                  style={{ marginRight: 7 }}
                />
              </TouchableOpacity>

              <TextInput
                placeholder="Enter your password..."
                placeholderTextColor={PRIMARY_COLOR_TINT}
                style={styles.input2}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={8}
              style={styles.forgotPasswordBtn}
              onPress={() => navigation.navigate('ForgotPasswordScreen')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
            <CustomButton
              title="Login"
              style={[
                styles.toggleBtns,
                {
                  opacity: isLoading ? 0.7 : 1,
                },
              ]}
              onPress={handlePasswordLogin}
              disabled={isLoading || !canSubmit}
            />
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            <View style={styles.socialButtonRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.socialButton}
                onPress={() => handleSocialLogin('google')}
                disabled={isLoading}
              >
                <IconOutline name="google" size={24} color={PRIMARY_COLOR} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.socialButton}
                onPress={() => handleSocialLogin('github')}
                disabled={isLoading}
              >
                <IconOutline name="github" size={24} color={PRIMARY_COLOR} />
              </TouchableOpacity>
            </View>
            <View style={styles.footerDiv}>
              <Text style={[styles.footerDivText, { color: '#222' }]}>
                Don't have an account?
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                hitSlop={10}
                onPress={() => navigation.navigate('SignUp')}
              >
                <Text style={styles.footerDivText2}>Signup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
    position: 'relative',
  },
  bkg: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  toggleBtns: {
    height: 50,
    paddingHorizontal: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: PRIMARY_COLOR,
    marginBottom: 14,
  },
  validationText: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: 800,
    marginBottom: 10,
    width: '100%',
    marginTop: -6,
  },
  toggleBtnsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    padding: 22,
    backgroundColor: '#fff',
    zIndex: 10,
    borderRadius: 20,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainHeader: {
    fontSize: 23,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 18,
  },
  passwordInput: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  input2: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    backgroundColor: 'transparent',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 14,
  },
  socialButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: 14,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  footerDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  footerDivText: {
    fontSize: 14,
    marginRight: 4,
  },
  footerDivText2: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: PRIMARY_COLOR_TINT,
  },
  dividerText: {
    marginHorizontal: 10,
    color: PRIMARY_COLOR_TINT,
    fontSize: 14,
  },
});
export default Login;

