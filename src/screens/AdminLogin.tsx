import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { loginAdmin } from '../api/localPostApis';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { setAdmin } from '../context/AdminSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SweetAlertModal from '../components/alertscomponent';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { IconBackground } from '../assets/styles/BackgroundIconPattern';
import DeviceInfo from 'react-native-device-info';
import { isValidEmail } from '../utils/SignupHelpers';
import { CustomButton } from '../assets/components/AppUIComponents';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
export const AdminLogin = () => {
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

  const performLogin = useCallback(
    async (payload: any) => {
      setIsLoading(true);
      try {
        const deviceId = await DeviceInfo.getUniqueId();
        const deviceName = DeviceInfo.getModel();
        const brand = DeviceInfo.getBrand();

        const response = await loginAdmin({
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
            setAdmin({ ...user, accessToken, tokenCreatedAt: Date.now() }),
          );
          navigation.navigate('AdminDashboard');
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
    if (!identifier || !password) {
      setAlertMessage('Ensure required fields are not empty.');
      setAlertType('error');
      setAlertVisible(true);
      return;
    }
    performLogin({ identifier, password, socialProvider: 'password' });
  };

  const canSubmit = useMemo(() => {
    return isValidEmail(identifier) && password.length > 0;
  }, [identifier, password]);

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
            <Text style={styles.mainHeader}>Admin Login</Text>

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
            <CustomButton
              title={isLoading ? 'Logging in...' : 'Login'}
              style={[
                styles.toggleBtns,
                {
                  opacity: isLoading ? 0.6 : 1,
                },
              ]}
              onPress={handlePasswordLogin}
              disabled={isLoading || !canSubmit}
            />
          </View>
        </ScrollView>

        <SweetAlertModal
          visible={alertVisible}
          onConfirm={() => setAlertVisible(false)}
          title={alertType === 'error' ? 'Oops!' : 'Notice'}
          message={alertMessage}
          type={alertType}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
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
    backgroundColor: 'transparent',
    color: '#222',
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
  },
  toggleBtnsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
    position: 'relative',
  },
});