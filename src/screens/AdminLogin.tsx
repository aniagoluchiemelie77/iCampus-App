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
import { loginAdmin } from '../api/localPostApis';
import { useDispatch } from 'react-redux';
import { setAdmin } from '../context/AdminSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SweetAlertModal from '../components/alertscomponent';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import {
  SignupScreenStyles,
  StudentSignupStyles,
} from '../assets/styles/colors';
import { IconBackground } from '../assets/styles/BackgroundIconPattern';
import DeviceInfo from 'react-native-device-info';
import { isValidEmail } from '../utils/SignupHelpers';

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
    return isValidEmail(identifier) && password.length > 0
  }, [identifier, password]);

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
        <Text style={StudentSignupStyles.mainHeader}>Admin Login</Text>

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
            <ActivityIndicator color="#fff" size={'small'} />
          ) : (
            <Text style={SignupScreenStyles.toggleBtnsText}>Login</Text>
          )}
        </TouchableOpacity>
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