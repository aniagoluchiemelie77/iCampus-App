import React, { useState } from 'react';
import {
  Platform,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SignupScreenStyles } from '../assets/styles/colors';
import { StackNavigationProp } from '@react-navigation/stack';
import SweetAlertModal from '../components/alertscomponent';
import { useNavigation, useRoute, RouteProp  } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'ChangePasswordScreen'
>;
type ChangePasswordParams = {
  email: string;
};

export default function ChangePasswordScreen() {
  const route = useRoute<RouteProp<{ params: ChangePasswordParams }, 'params'>>();
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
  const isValidPassword = (inputPassword: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{13,}$/;
    return passwordRegex.test(inputPassword);
  };

  const handleChangePassword = async () => {
    if (!password && !confirmPassword) {
      setAlertType('warning');
      setAlertMessage('Please fill in all fields');
      setAlertVisible(true);
      return;
    }
    setVerifying(true);
    const response = await fetch('http://192.168.1.98:5000/users/changePassword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, confirmPassword, email }),
    });

    if (response.ok) {
      setVerifying(false);
      setAlertType('success');
      setAlertMessage('Code verified. You will be redirected to login Page.');
      setAlertVisible(true);
      setTimeout(() => {
        navigation.navigate('SignUp');
      }, 3000);
    } else {
      setVerifying(false);
      setAlertType('error');
      setAlertMessage('Password reset attempt unsuccessful.');
      setAlertVisible(true);
    }
  };

  return (
    <KeyboardAvoidingView style={SignupScreenStyles.bkg} behavior="padding">
      <ScrollView
        contentContainerStyle={SignupScreenStyles.bkg3}
        keyboardShouldPersistTaps="handled"
      >
        <View style={SignupScreenStyles.container}>
          <View style={SignupScreenStyles.headerBtnsContainer}>
            <Text style={SignupScreenStyles.activeTabText}>Forgot Password</Text>
          </View>
          <View style={SignupScreenStyles.inputContainer}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={SignupScreenStyles.inputKAVContainer}
            >
                <Text style={SignupScreenStyles.inputHeader}>
                    Enter your New Password:
                </Text>
                <View style={SignupScreenStyles.passwordContainer}>
                    <View style={SignupScreenStyles.passwordInputWrapper}>
                        <TextInput
                            placeholder="Password"
                            placeholderTextColor="#000"
                            style={SignupScreenStyles.passwordInput}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Icon
                                name={showPassword ? 'eye-off' : 'eye'}
                                size={25}
                                color="#000"
                                style={SignupScreenStyles.passwordIcons}
                            />
                        </TouchableOpacity>
                    </View>
                    {!isValidPassword(password) && password.length > 0 && (
                        <Text style={SignupScreenStyles.validationText}>
                            Password must be at least 13 characters and include uppercase, lowercase, number, and symbol.
                        </Text>
                    )}
                </View>
                <View style={SignupScreenStyles.passwordContainer}>
                    <View style={SignupScreenStyles.passwordInputWrapper}>
                        <TextInput
                            placeholder="Confirm Password"
                            placeholderTextColor="#000"
                            style={SignupScreenStyles.passwordInput}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showConfirmPassword}
                        />
                        <TouchableOpacity
                            onPress={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                            }
                        >
                            <Icon
                                name={showConfirmPassword ? 'eye-off' : 'eye'}
                                size={25}
                                color="#000"
                                style={SignupScreenStyles.passwordIcons}
                            />
                        </TouchableOpacity>
                    </View>            
                    {confirmPassword.length > 0 && confirmPassword !== password && (
                        <Text style={SignupScreenStyles.validationText}>
                            Passwords do not match.
                        </Text>
                    )}
                </View>
                <TouchableOpacity
                    style={[
                        SignupScreenStyles.toggleBtns,
                        (!isValidPassword(password) ||
                            confirmPassword !== password) &&
                        SignupScreenStyles.disabledBtn,
                    ]}
                    onPress={handleChangePassword}
                    disabled={
                        !isValidPassword(password) || confirmPassword !== password || isVerifying
                    }
                >
                    <Text style={SignupScreenStyles.selectorHeader}>
                        {isVerifying ? 'Changing...' : 'Change'}
                    </Text>
                </TouchableOpacity>
                <SweetAlertModal
                    visible={alertVisible}
                    onClose={() => setAlertVisible(false)}
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
}
