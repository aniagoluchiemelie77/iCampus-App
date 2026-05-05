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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { changePassword } from '../api/localPostApis';
import { IconBackground } from '../assets/styles/BackgroundIconPattern';
import { isValidPassword } from '../utils/SignupHelpers';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'ChangePasswordScreen'
>;
type ChangePasswordParams = {
  email: string;
};

export default function ChangePasswordScreen() {
  const route =
    useRoute<RouteProp<{ params: ChangePasswordParams }, 'params'>>();
  const { email } = route.params;
  const navigation = useNavigation<NavigationProp>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>(
    'success',
  );
  const [alertMessage, setAlertMessage] = useState('');
  const [isVerifying, setVerifying] = useState(false);

  const handleChangePassword = async () => {
    if (!password && !confirmPassword) {
      setAlertType('warning');
      setAlertMessage('Please fill in all fields');
      setAlertVisible(true);
      return;
    }
    setVerifying(true);
    const response = await changePassword(email, password, confirmPassword);
    if (response.success) {
      setVerifying(false);
      setAlertType('success');
      setAlertMessage('Code verified. You will be redirected to login Page.');
      setAlertVisible(true);
      setTimeout(() => {
        navigation.navigate('Login');
      }, 3000);
    } else {
      setVerifying(false);
      setAlertType('error');
      setAlertMessage('Password reset attempt unsuccessful.');
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
        <Text style={StudentSignupStyles.inputHeaderLogin}>
          Enter your New Password:
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
        {!isValidPassword(password) && password.length > 0 && (
          <Text style={SignupScreenStyles.validationText}>
            Password must be at least 13 characters and include uppercase,
            lowercase, number, and symbol.
          </Text>
        )}
        <Text style={StudentSignupStyles.inputHeaderLogin}>
          Confirm your New Password:
        </Text>
        <View style={StudentSignupStyles.passwordInput}>
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(prev => !prev)}
          >
            <MaterialIcons
              name={
                showConfirmPassword
                  ? 'visibility-off-outlined'
                  : 'visibility-outlined'
              }
              size={20}
              color={PRIMARY_COLOR_TINT}
              style={{ marginHorizontal: 5 }}
            />
          </TouchableOpacity>
          <TextInput
            placeholder="Confirm your new password..."
            placeholderTextColor={PRIMARY_COLOR_TINT}
            style={StudentSignupStyles.input2}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
        </View>
        {confirmPassword.length > 0 && confirmPassword !== password && (
          <Text style={SignupScreenStyles.validationText}>
            Passwords do not match.
          </Text>
        )}
        <TouchableOpacity
          style={[
            SignupScreenStyles.toggleBtns,
            (!isValidPassword(password) || confirmPassword !== password) &&
              SignupScreenStyles.disabledBtn,
          ]}
          onPress={handleChangePassword}
          disabled={
            !isValidPassword(password) ||
            confirmPassword !== password ||
            isVerifying
          }
        >
          <Text style={SignupScreenStyles.selectorHeader}>
            {isVerifying ? 'Changing...' : 'Change'}
          </Text>
        </TouchableOpacity>
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
