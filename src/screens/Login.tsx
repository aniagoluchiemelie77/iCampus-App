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
import SweetAlertModal from '../components/alertscomponent';
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

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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
          } else if (user.role === 'admin' || user.role === 'master_admin') {
            navigation.navigate('AdminDashboard');
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
            <MaterialIcons
              name="lock-outline"
              size={60}
              color={PRIMARY_COLOR}
            />
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
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {identifier.length > 0 && !isValidEmail(identifier) && (
              <Text style={styles.validationText}>Invalid email format</Text>
            )}

            <View style={styles.passwordInput}>
              <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
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
                style={styles.socialButton}
                onPress={() => handleSocialLogin('google')}
                disabled={isLoading}
              >
                <IconOutline name="google" size={24} color={PRIMARY_COLOR} />
              </TouchableOpacity>

              <TouchableOpacity
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
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.footerDivText2}>Signup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SweetAlertModal
        visible={alertVisible}
        onConfirm={() => setAlertVisible(false)}
        title={alertType === 'error' ? 'Oops!' : 'Notice'}
        message={alertMessage}
        type={alertType}
      />
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: PRIMARY_COLOR,
    marginBottom: 20,
  },
  validationText: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: 800,
    marginBottom: 15,
    width: '100%',
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
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 10,
  },
  socialButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 30,
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
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
    marginBottom: 20,
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

