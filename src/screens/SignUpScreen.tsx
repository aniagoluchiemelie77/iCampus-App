import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Animated,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CountryPicker } from 'react-native-country-codes-picker';
import { Dropdown } from 'react-native-element-dropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import type { User } from '../types/firebase';
import SweetAlertModal from '../components/alertscomponent';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
type NavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;

const SignUpScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchTab = (tab: 'signup' | 'login') => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500, // fade out over 2.5s
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(tab); // switch tab after fade out
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500, // fade in over 2.5s
        useNativeDriver: true,
      }).start();
    });
  };
  const [step, setStep] = useState(0);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [country, setCountry] = useState('');
  const [institution, setInstitution] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>(
    'success',
  );
  const [alertMessage, setAlertMessage] = useState('');
  const [institutionItems, setInstitutionItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [userType, setUserType] = useState<'student' | 'lecturer' | null>(null);
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [staffId, setStaffId] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [ipAddress, setIpAddress] = useState('');
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');

  const generateId = (length = 13) => {
    const chars =
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  const isValidPassword = (password: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{13,}$/;
    return passwordRegex.test(password);
  };

  const generateId2 = (length = 9) => {
    const chars =
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  // Fetch universities based on selected country
  useEffect(() => {
    if (country === 'Nigeria') {
      fetch(
        'https://raw.githubusercontent.com/Stutern/world-universities/master/nigerian-universities.csv',
      )
        .then(res => res.text())
        .then(text => {
          const lines = text.split('\n');
          const formatted = lines.map(line => ({
            label: line.trim(),
            value: line.trim(),
          }));
          setInstitutionItems(formatted);
        });
    } else {
      fetch(
        'https://raw.githubusercontent.com/Asjad-Ilahi/world-universities-data/main/updated_universities.json',
      )
        .then(res => res.json())
        .then(data => {
          const filtered = data
            .filter((uni: any) => uni.country === country)
            .map((uni: any) => ({
              label: uni.name,
              value: uni.name,
            }));
          setInstitutionItems(filtered);
        });
    }
  }, [country]);

  const nextStep = () => setStep(prev => prev + 1);
  const fetchIP = async () => {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    setIpAddress(data.ip);
  };
  const saveUserData = async (tokenId: string) => {
    try {
      await AsyncStorage.setItem('hasLaunched', 'true');
      await AsyncStorage.setItem('accessToken', tokenId);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };
  let isFirstSignUp;
  const handleSubmit = async () => {
    try {
      if (!termsAccepted) {
        setAlertType('warning');
        setAlertMessage('Please accept the terms and conditions.');
        setAlertVisible(true);
        return;
      }

      await fetchIP(); // wait for IP to be set

      const payload = {
        country,
        institution,
        userType,
        email,
        password,
        ...(userType === 'student' && { matricNumber, hobbies }),
        ...(userType === 'lecturer' && { staffId }),
      };

      const deviceType = DeviceInfo.getDeviceType();
      const tokenId = generateId();
      const userId = generateId2();
      isFirstSignUp = true;
      await saveUserData(tokenId); // wait for storage to complete
      const user: User = {
        uid: userId,
        usertype: payload.userType || '',
        isFirstLogin: isFirstSignUp,
        firstname: '',
        lastname: '',
        schoolName: payload.institution || '',
        email: payload.email || '',
        ipAddress: [ipAddress],
        deviceType: [deviceType],
        accessToken: tokenId,
        password: payload.password || '',
        department: '',
        pointsBalance: 0,
        hasSubscribed: false,
        createdAt: new Date().toISOString(),
        country: payload.country || '',
      };

      const response = await fetch('http://192.168.1.98:5000/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });

      const contentType = response.headers.get('content-type');
      if (response.ok && contentType?.includes('application/json')) {
        const result = await response.json();
        setAlertType('success');
        setAlertMessage('Your account has been created.');
        console.log('Server response:', result);
        navigation.navigate('Home');
      } else {
        const text = await response.text();
        setAlertType('error');
        setAlertMessage('Account creation failed. Please try again.');
        console.warn('Unexpected response:', text);
      }
      setAlertVisible(true);
    } catch (error) {
      console.error('Error:', error);
      setAlertType('error');
      setAlertMessage('Network error. Please check your connection.');
      setAlertVisible(true);
    }
  };
  const handleLogin = async () => {
    if (!identifier || !password) {
      setAlertType('warning');
      setAlertMessage('Please enter your Email and Password.');
      setAlertVisible(true);
      return;
    }

    try {
      const response = await fetch('http://192.168.1.98:5000/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });

      const contentType = response.headers.get('content-type');
      if (response.ok && contentType?.includes('application/json')) {
        const result = await response.json();
        console.log(result);
        setAlertType('success');
        setAlertMessage('Login successful. Welcome back!');
        setAlertVisible(true);
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
    <View style={styles.bkg}>
      <View style={styles.container}>
        <View>
          <Animated.View
            style={[styles.headerBtnsContainer, { opacity: fadeAnim }]}
          >
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => switchTab('signup')}
            >
              <Text
                style={[
                  styles.header,
                  activeTab === 'signup' && styles.activeTabText,
                ]}
              >
                Sign Up
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => switchTab('login')}
            >
              <Text
                style={[
                  styles.header,
                  activeTab === 'login' && styles.activeTabText,
                ]}
              >
                Login
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
        <View style={styles.inputContainer}>
          {activeTab === 'signup' ? (
            <>
              {step === 0 && (
                <>
                  <Text style={styles.inputHeader}>Select Country:</Text>
                  <TouchableOpacity
                    onPress={() => setShowCountryPicker(true)}
                    style={styles.selector}
                  >
                    <Text style={styles.selectorHeader}>
                      {country || 'Select Country'}
                    </Text>
                  </TouchableOpacity>
                  <CountryPicker
                    show={showCountryPicker}
                    lang="en" // ✅ Required prop
                    pickerButtonOnPress={item => {
                      setCountry(item.name.en);
                      setShowCountryPicker(true);
                      nextStep();
                    }}
                  />
                </>
              )}
              {step === 1 && (
                <>
                  <Text style={styles.inputHeader}>
                    Select Institution Name:
                  </Text>
                  <Dropdown
                    data={institutionItems}
                    labelField="label"
                    valueField="value"
                    search
                    placeholder="Select Institution"
                    value={institution}
                    onChange={item => {
                      setInstitution(item.value);
                      nextStep();
                    }}
                    style={styles.dropdown}
                  />
                </>
              )}
              {step === 2 && (
                <>
                  <Text style={styles.inputHeader}>Are You?:</Text>
                  <View style={styles.toggle}>
                    <TouchableOpacity
                      style={styles.toggleBtns}
                      onPress={() => {
                        setUserType('student');
                        nextStep();
                      }}
                    >
                      <Text style={styles.selectorHeader}>A Student</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.toggleBtns}
                      onPress={() => {
                        setUserType('lecturer');
                        nextStep();
                      }}
                    >
                      <Text style={styles.selectorHeader}>A Lecturer</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              {step === 3 && (
                <>
                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.inputKAVContainer}
                  >
                    <Text style={styles.inputHeader}>Enter your Email:</Text>
                    <TextInput
                      placeholder="Email"
                      placeholderTextColor="#fff"
                      value={email}
                      onChangeText={setEmail}
                      style={styles.input}
                    />
                    <Text style={styles.validationText}>
                      {!isValidEmail(email) && email.length > 0
                        ? 'Invalid email format'
                        : ''}
                    </Text>
                    <TouchableOpacity
                      style={styles.toggleBtns}
                      onPress={nextStep}
                      disabled={!isValidEmail(email) && email.length > 0}
                    >
                      <Text style={styles.selectorHeader}>Next</Text>
                    </TouchableOpacity>
                  </KeyboardAvoidingView>
                </>
              )}
              {step === 4 && (
                <>
                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.inputKAVContainer}
                  >
                    <Text style={styles.inputHeader}>Enter your Password:</Text>
                    <View style={styles.passwordContainer}>
                      <View style={styles.passwordInputWrapper}>
                        <TextInput
                          placeholder="Password"
                          placeholderTextColor="#fff"
                          style={styles.passwordInput}
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          <Text style={styles.selectorHeader}>
                            {showPassword ? 'Hide' : 'Show'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {!isValidPassword(password) && password.length > 0 && (
                        <Text style={styles.validationText}>
                          Password must be at least 13 characters and include
                          uppercase, lowercase, number, and symbol.
                        </Text>
                      )}
                    </View>
                    <View style={styles.passwordContainer}>
                      <View style={styles.passwordInputWrapper}>
                        <TextInput
                          placeholder="Confirm Password"
                          placeholderTextColor="#fff"
                          style={styles.passwordInput}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!showConfirmPassword}
                        />
                        <TouchableOpacity
                          onPress={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          <Text style={styles.selectorHeader}>
                            {showConfirmPassword ? 'Hide' : 'Show'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {confirmPassword.length > 0 &&
                        confirmPassword !== password && (
                          <Text style={styles.validationText}>
                            Passwords do not match.
                          </Text>
                        )}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.toggleBtns,
                        (!isValidPassword(password) ||
                          confirmPassword !== password) &&
                          styles.disabledBtn,
                      ]}
                      onPress={nextStep}
                      disabled={
                        !isValidPassword(password) ||
                        confirmPassword !== password
                      }
                    >
                      <Text style={styles.selectorHeader}>Next</Text>
                    </TouchableOpacity>
                  </KeyboardAvoidingView>
                </>
              )}
              {userType === 'student' && step === 5 && (
                <>
                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.inputKAVContainer}
                  >
                    <Text style={styles.inputHeader}>
                      Enter your Matriculation Number:
                    </Text>
                    <TextInput
                      placeholderTextColor="#fff"
                      placeholder="Matric Number"
                      value={matricNumber}
                      onChangeText={setMatricNumber}
                      style={styles.input}
                    />
                    <TouchableOpacity
                      style={styles.toggleBtns}
                      onPress={nextStep}
                    >
                      <Text style={styles.selectorHeader}>Next</Text>
                    </TouchableOpacity>
                  </KeyboardAvoidingView>
                </>
              )}
              {userType === 'student' && step === 6 && (
                <>
                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.inputKAVContainer}
                  >
                    <Text style={styles.inputHeader}>
                      What are your Hobbies? (optional):
                    </Text>
                    <TextInput
                      placeholderTextColor="#fff"
                      style={styles.input}
                      placeholder="Hobbies (optional)"
                      value={hobbies}
                      onChangeText={setHobbies}
                    />
                    <View style={styles.toggle}>
                      <TouchableOpacity
                        style={styles.toggleBtns}
                        onPress={() => {
                          nextStep();
                        }}
                      >
                        <Text style={styles.selectorHeader}>Next</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.toggleBtns}
                        onPress={() => {
                          nextStep();
                        }}
                      >
                        <Text style={styles.selectorHeader}>Skip</Text>
                      </TouchableOpacity>
                    </View>
                  </KeyboardAvoidingView>
                </>
              )}
              {userType === 'lecturer' && step === 5 && (
                <>
                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.inputKAVContainer}
                  >
                    <Text style={styles.inputHeader}>Enter your Staff Id:</Text>
                    <TextInput
                      placeholderTextColor="#fff"
                      style={styles.input}
                      placeholder="Staff ID"
                      value={staffId}
                      onChangeText={setStaffId}
                    />
                    <TouchableOpacity
                      style={styles.toggleBtns}
                      onPress={nextStep}
                    >
                      <Text style={styles.selectorHeader}>Next</Text>
                    </TouchableOpacity>
                  </KeyboardAvoidingView>
                </>
              )}
              {(step === 7 || (userType === 'lecturer' && step === 6)) && (
                <>
                  <Text style={styles.inputHeader}>Terms and Conditions</Text>
                  <TouchableOpacity
                    onPress={() => setTermsAccepted(!termsAccepted)}
                  >
                    <Text
                      style={[
                        styles.termsParagraph,
                        { color: termsAccepted ? 'green' : 'red' }, // ✅ dynamic override
                      ]}
                    >
                      {termsAccepted
                        ? '✓ Terms Accepted'
                        : '☐ Accept Terms & Conditions'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.toggleBtns}
                    onPress={handleSubmit}
                  >
                    <Text style={styles.selectorHeader}>Sign Up</Text>
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
                </>
              )}
            </>
          ) : (
            <>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inputKAVContainer}
              >
                <Text style={styles.inputHeader}>Enter your Email:</Text>
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#fff"
                  value={identifier}
                  onChangeText={setIdentifier}
                  style={styles.input}
                />
                <Text style={styles.inputHeader}>Password:</Text>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#fff"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={styles.input}
                />
                <TouchableOpacity
                  style={[styles.forgotPassDiv]}
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={[styles.forgotPassParagraph]}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.toggleBtns}
                  onPress={handleLogin}
                >
                  <Text style={styles.selectorHeader}>Login</Text>
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
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bkg: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    flex: 1,
  },
  container: {
    alignItems: 'center',
    width: '90%',
    height: '55%',
    borderRadius: 10,
    padding: 25,
    justifyContent: 'space-between',
    backgroundColor: '#41644A',
    position: 'relative',
  },
  activeTabText: {
    fontSize: 37,
    fontWeight: 'bold',
    color: '#f8b736ff',
  },
  disabledBtn: {
    backgroundColor: '#f8b736ff',
    opacity: 0.6,
  },
  tabButton: {
    padding: 5,
    marginBottom: 10,
    color: '#f8c662',
  },
  header: {
    fontSize: 20,
    color: '#f8c662',
  },
  headerBtnsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 10,
    padding: 8,
    top: 0,
  },
  inputContainer: {
    fontSize: 20,
    padding: 10,
    color: '#f8c662',
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  inputHeader: {
    fontSize: 20,
    marginBottom: 15,
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    padding: 10,
    width: '100%',
    borderColor: '#fff',
    color: '#fff',
    marginBottom: 15,
  },
  validationText: {
    fontSize: 14,
    color: '#f8b736ff',
    fontWeight: 800,
  },
  inputKAVContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  passwordContainer: {
    width: '100%',
    justifyContent: 'center',
  },
  passwordInput: {
    flex: 1,
    color: '#fff',
    height: '100%',
  },
  passwordInputWrapper: {
    marginBottom: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#fff',
    padding: 10,
  },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    padding: 10,
    width: '100%',
  },
  toggleBtns: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8b736ff',
  },
  selector: {
    padding: 15,
    backgroundColor: 'inherit',
    borderWidth: 1,
    width: '90%',
    borderColor: '#fff',
    color: '#fff',
  },
  selectorHeader: {
    color: '#41644A',
  },
  termsParagraph: {
    marginBottom: 10,
    fontSize: 19,
  },
  forgotPassParagraph: {
    fontSize: 19,
    color: '#f8b736ff',
  },
  forgotPassDiv: {
    padding: 10,
    alignSelf: 'flex-end',
  },
  dropdown: {
    width: '100%',
    backgroundColor: 'inherit',
    borderWidth: 1,
    padding: 10,
    borderColor: '#fff',
  },
});

export default SignUpScreen;
