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
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import baseUrl from '../../App';

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

  const isValidEmail = (inputEmail: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(inputEmail);
  };

  const handleVerifyEmail = async () => {
    if (!email) {
      setAlertType('warning');
      setAlertMessage('Please enter your Email');
      setAlertVisible(true);
      return;
    }
    setVerifying(true);
    try {
      const response = await fetch(`${baseUrl}users/forgotPassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (response.ok) {
          setEmailVerified(true);
          setAlertType('success');
          setAlertMessage(
            data.message || 'Check your Email, for a 6-digit verification code',
          );
        } else if (response.status === 404) {
          setAlertType('error');
          setAlertMessage(data.message || 'User Not Found');
        } else {
          setAlertType('error');
          setAlertMessage(
            data.message || 'Error, Failed to send verification code',
          );
        }
      } else {
        const text = await response.text();
        console.warn('Unexpected response:', text);
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
    const response = await fetch(`${baseUrl}users/verifyCode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    if (response.ok) {
      const data = await response.json(); // Extract response body
      const verifiedEmail = data.email;
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
    <KeyboardAvoidingView style={SignupScreenStyles.bkg} behavior="padding">
      <ScrollView
        contentContainerStyle={SignupScreenStyles.bkg3}
        keyboardShouldPersistTaps="handled"
      >
        <View style={SignupScreenStyles.container}>
          <View style={SignupScreenStyles.headerBtnsContainer}>
            <Text style={SignupScreenStyles.activeTabText}>
              Forgot Password
            </Text>
          </View>
          <View style={SignupScreenStyles.inputContainer}>
            {!emailVerified && (
              <>
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  style={SignupScreenStyles.inputKAVContainer}
                >
                  <Text style={SignupScreenStyles.inputHeader}>
                    Enter your Email:
                  </Text>
                  <TextInput
                    style={SignupScreenStyles.input}
                    placeholder="Email"
                    placeholderTextColor="#000"
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
                </KeyboardAvoidingView>
              </>
            )}
            {emailVerified && (
              <>
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  style={SignupScreenStyles.inputKAVContainer}
                >
                  <Text style={SignupScreenStyles.inputHeader}>
                    Enter the 6-digit verification code sent to your email:
                  </Text>
                  <TextInput
                    style={SignupScreenStyles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#000"
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
                </KeyboardAvoidingView>
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
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
