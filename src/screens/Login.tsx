import 'react-native-get-random-values';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch } from 'react-redux';
import { setUser } from '../components/UserSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SweetAlertModal from '../components/alertscomponent';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { SignupScreenStyles } from '../assets/styles/colors';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;


const Login = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>(
    'success',
  );
  const [alertMessage, setAlertMessage] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isValidEmail = (inputEmail: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(inputEmail);
  };
  const handleLogin = async () => {
    if (!identifier || !password) {
      setAlertType('warning');
      setAlertMessage('Please enter your Email and Password.');
      setAlertVisible(true);
      return;
    }

    try {
      // Step 1: Get public IP
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipRes.json();
      console.log(ip);

      // Step 2: Get location from IP
      const locationRes = await fetch(
        `https://ipinfo.io/${ip}?token=0812a745a27433`,
      );
      const locationData = await locationRes.json();
      console.log('Location data:', locationData);

      // Format location string
      const location =
        [locationData.city, locationData.region, locationData.country]
          .filter(Boolean)
          .join(', ') || 'Unknown location';

      console.log('Formatted location:', location);

      // Step 3: Send login request with IP and location
      const response = await fetch('http://192.168.1.98:5000/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password, ipAddress: ip, location }),
      });

      const contentType = response.headers.get('content-type');
      if (response.ok && contentType?.includes('application/json')) {
        const result = await response.json();
        const token = result.token;

        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('user', JSON.stringify(result.user));

        dispatch(
          setUser({ ...result.user, token, tokenCreatedAt: Date.now() }),
        );
        navigation.navigate('Home');
      } else {
        const errorText = await response.text();
        setAlertType('error');
        setAlertMessage('Invalid credentials. Please try again.');
        setAlertVisible(true);
        console.warn('Login failed:', errorText);
      }
    } catch (error) {
      setAlertType('error');
      setAlertMessage('Network error. Please check your connection.');
      setAlertVisible(true);
      console.error('Login error:', error);
    }
  };

  return (
    <KeyboardAvoidingView style={SignupScreenStyles.bkg} behavior="padding">  
    <ScrollView
            contentContainerStyle={SignupScreenStyles.bkg3}
            keyboardShouldPersistTaps="handled"
          >
        <View style={SignupScreenStyles.container2}>
            <View style={
                SignupScreenStyles.headerBtnsContainerLogin
              }>
                <Text
                  style={[
                    SignupScreenStyles.activeTabText, SignupScreenStyles.welcomeHeader
                  ]}
                >
                  Login
                </Text>
                <Text
                  style={
                    SignupScreenStyles.welcomeText
                  }
                >
                  Good to see you again! Let’s pick up where you left off.
                </Text>
            </View>
            <View style={SignupScreenStyles.inputContainerLogin}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                  <Text style={SignupScreenStyles.inputHeader}>
                    Enter your Email:
                  </Text>
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor="#000"
                    value={identifier}
                    onChangeText={setIdentifier}
                    style={SignupScreenStyles.input}
                  />
                  <Text style={SignupScreenStyles.validationText}>
                    {!isValidEmail(identifier) && identifier.length > 0
                      ? 'Invalid email format'
                      : ''}
                  </Text>
                  <Text style={SignupScreenStyles.inputHeader}>Password:</Text>
                  <View style={SignupScreenStyles.passwordInputWrapper}>
                    <TextInput
                      placeholder="Password"
                      placeholderTextColor="#000"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      style={[SignupScreenStyles.input2]}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Icon
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={22}
                        color="#000"
                        style={{ marginRight: 30 }}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[SignupScreenStyles.forgotPassDiv]}
                    onPress={() => navigation.navigate('ForgotPasswordScreen')}
                  >
                    <Text style={[SignupScreenStyles.forgotPassParagraph]}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={SignupScreenStyles.toggleBtns}
                    onPress={handleLogin}
                  >
                    <Text style={SignupScreenStyles.selectorHeader}>Login</Text>
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
                </KeyboardAvoidingView>
          </View>
        </View>
        </ScrollView>  
    </KeyboardAvoidingView>
  );
};
export default Login;