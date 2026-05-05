import React, { useState } from 'react';
import {
  Platform,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SignupScreenStyles } from '../assets/styles/colors';
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
      <View style={SignupScreenStyles.container2}>
        <View style={SignupScreenStyles.headerBtnsContainer}>
          <Text style={SignupScreenStyles.activeTabText}>Forgot Password</Text>
        </View>
        <View style={SignupScreenStyles.inputContainer}>
          <Text style={SignupScreenStyles.inputHeader}>
            Enter your New Password:
          </Text>
          <View style={SignupScreenStyles.passwordInputWrapper}>
            <TextInput
              placeholder="Password"
              placeholderTextColor={PRIMARY_COLOR_TINT}
              style={SignupScreenStyles.passwordInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <MaterialIcons
                name={
                  showPassword
                    ? 'visibility-off-outlined'
                    : 'visibility-outlined'
                }
                size={20}
                color={PRIMARY_COLOR_TINT}
                style={{ marginHorizontal: 7 }}
              />
            </TouchableOpacity>
          </View>
          {!isValidPassword(password) && password.length > 0 && (
            <Text style={SignupScreenStyles.validationText}>
              Password must be at least 13 characters and include uppercase,
              lowercase, number, and symbol.
            </Text>
          )}
          <View style={SignupScreenStyles.passwordInputWrapper}>
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor={PRIMARY_COLOR_TINT}
              style={SignupScreenStyles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <MaterialIcons
                name={
                  showConfirmPassword
                    ? 'visibility-off-outlined'
                    : 'visibility-outlined'
                }
                size={20}
                color={PRIMARY_COLOR_TINT}
                style={{ marginHorizontal: 7 }}
              />
            </TouchableOpacity>
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
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
