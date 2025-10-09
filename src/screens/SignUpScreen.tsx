import 'react-native-get-random-values';
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
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CountryPicker } from 'react-native-country-codes-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { useDispatch } from 'react-redux';
import { setUser } from '../components/UserSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import type { User } from '../types/firebase';
import SweetAlertModal from '../components/alertscomponent';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { v4 as uuidv4 } from 'uuid';
import { StackNavigationProp } from '@react-navigation/stack';

type NavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;
type VerifiedStudent = {
  firstname: string;
  lastname: string;
  department: string;
  current_level: string;
  phone_number: string;
  matriculation_number: string;
  school_name: string;
};
type VerifiedLecturer = {
  firstname: string;
  lastname: string;
  department: string;
  phone_number: string;
  school_name: string;
  staff_id: string;
};
type SignupResponse = {
  verified?: boolean;
  email?: string;
  message?: string;
  // Add any other fields your backend returns
};

const SignUpScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const dispatch = useDispatch();

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
  const [verifiedStudent, setVerifiedStudent] =
    useState<VerifiedStudent | null>(null);
  const [studentNotFound, setStudentNotFound] = useState(false);
  const [lecturerNotFound, setLecturerNotFound] = useState(false);
  const [isVerifying, setVerifying] = useState(false);
  const [verifiedLecturer, setVerifiedLecturer] =
    useState<VerifiedLecturer | null>(null);

  const [ipAddress, setIpAddress] = useState('');
  const [activeTab, setActiveTab] = useState<'signup' | 'login'>('signup');

  const generateId = (length = 14) => {
    const chars =
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  const isValidEmail = (inputEmail: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(inputEmail);
  };
  const isValidPassword = (inputPassword: string) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{13,}$/;
    return passwordRegex.test(inputPassword);
  };

  const generateId2 = (length = 10) => {
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
    console.log('Submit Btn Clicked');
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
        profilePic: ' ',
        usertype: payload.userType || '',
        isFirstLogin: isFirstSignUp,
        firstname:
          userType === 'student' && verifiedStudent
            ? verifiedStudent.firstname
            : userType === 'lecturer' && verifiedLecturer
            ? verifiedLecturer.firstname
            : '',
        lastname:
          userType === 'student' && verifiedStudent
            ? verifiedStudent.lastname
            : userType === 'lecturer' && verifiedLecturer
            ? verifiedLecturer.lastname
            : '',
        schoolName: payload.institution || '',
        email: payload.email || '',
        ipAddress: [ipAddress],
        deviceType: [deviceType],
        accessToken: tokenId,
        password: payload.password || '',
        department:
          userType === 'student' && verifiedStudent
            ? verifiedStudent.department
            : userType === 'lecturer' && verifiedLecturer
            ? verifiedLecturer.department
            : '',
        pointsBalance: 0,
        hasSubscribed: false,
        createdAt: new Date().toISOString(),
        country: payload.country || '',
        ...(userType === 'student' && verifiedStudent
          ? {
              current_level: verifiedStudent.current_level,
              phone_number: verifiedStudent.phone_number,
              matriculation_number: verifiedStudent.matriculation_number,
            }
          : {}),
        ...(userType === 'lecturer' && verifiedLecturer
          ? {
              phone_number: verifiedLecturer.phone_number,
              staff_id: verifiedLecturer.staff_id,
            }
          : {}),
      };

      const response = await fetch('http://192.168.1.98:5000/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });
      const contentType = response.headers.get('content-type');
      if (response.status === 409) {
        const result = await response.json();
        setAlertType('warning');
        setAlertMessage(result.message || 'User already exists.');
        setAlertVisible(true);
        return;
      } else if (response.ok && contentType?.includes('application/json')) {
        const result = (await response.json()) as SignupResponse;
        setAlertType('success');
        setAlertMessage(
          'Your account has been created. Please check your email to verify your account.',
        );
        console.log('Server response:', result);
        navigation.navigate('VerifyEmail', { email: result.email });
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
    console.log('Submit Btn Clicked');
    if (!identifier || !password) {
      setAlertType('warning');
      setAlertMessage('Please enter your Email and Password.');
      setAlertVisible(true);
      return;
    }

    try {
      console.log('Login 1');
      const response = await fetch('http://192.168.1.98:5000/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });
      const contentType = response.headers.get('content-type');
      if (response.ok && contentType?.includes('application/json')) {
        console.log('Submit Btn Clicked, Login 2');
        const result = await response.json();
        const token = uuidv4();
        // ✅ Store token and user info
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('user', JSON.stringify(result.user));
        console.log(result.user);
        console.log('authToken:', token);
        // ✅ Optionally set user in Context or Redux
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
  const verifyStudent = async () => {
    console.log('🔍 Verify button pressed');
    setVerifying(true);
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch('http://10.0.2.2:5000/verifyStudent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: institution,
          matriculation_number: matricNumber,
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (response.ok) {
        console.log('Student verified:', data);
        setVerifiedStudent(data);
        setStudentNotFound(false); // optional state to hold result
        nextStep(); // move to next screen or step
      } else {
        setStudentNotFound(true);
      }
    } catch (error) {
      setStudentNotFound(true);
      const err = error as Error;
      console.error('Verification error:', err.message);
    } finally {
      setVerifying(false); // stop loading
    }
  };
  const verifyLecturer = async () => {
    try {
      const response = await fetch('http://10.0.2.2:5000/verifyLecturer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: institution,
          staff_id: staffId,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setVerifiedLecturer(data);
        setLecturerNotFound(false);
        nextStep(); // ✅ move forward
      } else {
        setLecturerNotFound(true);
      }
    } catch (error) {
      console.error('Lecturer verification error:', error);
      setLecturerNotFound(true);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.bkg} behavior="padding">
      <ScrollView
        contentContainerStyle={styles.bkg3}
        keyboardShouldPersistTaps="handled"
      >
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
                      <Text style={styles.selectorHeader2}>
                        {country || 'Select Country'}
                      </Text>
                    </TouchableOpacity>
                    <CountryPicker
                      show={showCountryPicker}
                      lang="en"
                      pickerButtonOnPress={item => {
                        setCountry(item.name.en);
                        setShowCountryPicker(false);
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
                      searchPlaceholderTextColor="#000"
                      placeholder="Select Institution"
                      placeholderStyle={{ color: '#000' }}
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
                        <Text style={styles.selectorHeader}>A student</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.toggleBtns}
                        onPress={() => {
                          setUserType('lecturer');
                          nextStep();
                        }}
                      >
                        <Text style={styles.selectorHeader}>A lecturer</Text>
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
                      <Text style={styles.inputHeader}>
                        Enter your Password:
                      </Text>
                      <View style={styles.passwordContainer}>
                        <View style={styles.passwordInputWrapper}>
                          <TextInput
                            placeholder="Password"
                            placeholderTextColor="#000"
                            style={styles.passwordInput}
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
                              style={styles.passwordIcons}
                            />
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
                            placeholderTextColor="#000"
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
                            <Icon
                              name={showConfirmPassword ? 'eye-off' : 'eye'}
                              size={25}
                              color="#000"
                              style={styles.passwordIcons}
                            />
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
                        onChangeText={text => {
                          setMatricNumber(text);
                          setStudentNotFound(false); // clear error on change
                        }}
                        style={styles.input}
                      />
                      {studentNotFound && (
                        <Text style={styles.validationText}>
                          Student not found
                        </Text>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.toggleBtns,
                          isVerifying && styles.disabledBtn,
                        ]}
                        onPress={verifyStudent}
                        disabled={isVerifying}
                      >
                        <Text style={styles.selectorHeader}>
                          {isVerifying ? 'Verifying...' : 'Verify'}
                        </Text>
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
                      <Text style={styles.inputHeader}>
                        Enter your Staff Id:
                      </Text>
                      <TextInput
                        placeholderTextColor="#fff"
                        style={styles.input}
                        placeholder="Staff ID"
                        value={staffId}
                        onChangeText={text => {
                          setStaffId(text);
                          setLecturerNotFound(false); // clear error on change
                        }}
                      />
                      {lecturerNotFound && (
                        <Text style={styles.validationText}>
                          User not found
                        </Text>
                      )}

                      <TouchableOpacity
                        style={styles.toggleBtns}
                        onPress={verifyLecturer}
                      >
                        <Text style={styles.selectorHeader}>Verify</Text>
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
                    placeholderTextColor="#000"
                    value={identifier}
                    onChangeText={setIdentifier}
                    style={styles.input}
                  />
                  <Text style={styles.validationText}>
                    {!isValidEmail(identifier) && identifier.length > 0
                      ? 'Invalid email format'
                      : ''}
                  </Text>
                  <Text style={styles.inputHeader}>Password:</Text>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      placeholder="Password"
                      placeholderTextColor="#000"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      style={[styles.input2]}
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
                    style={[styles.forgotPassDiv]}
                    onPress={() => navigation.navigate('ForgotPasswordScreen')}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export const styles = StyleSheet.create({
  bkg: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee',
    flex: 1,
  },
  bkg3: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    width: '93%',
    minHeight: '60%',
    borderRadius: 10,
    padding: 20,
    justifyContent: 'space-evenly',
    backgroundColor: '#fff',
    position: 'relative',
  },
  activeTabText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#f54b02',
  },
  disabledBtn: {
    backgroundColor: '#222',
    opacity: 0.6,
  },
  tabButton: {
    padding: 5,
    color: '#000',
  },
  header: {
    fontSize: 20,
    color: '#000',
  },
  headerBtnsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 5,
    padding: 8,
    top: 0,
  },
  inputContainer: {
    fontSize: 17,
    padding: 10,
    color: '#000',
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  inputHeader: {
    fontSize: 14,
    marginBottom: 10,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    padding: 10,
    minWidth: '100%',
    borderColor: '#000',
    color: '#000',
    marginBottom: 8,
    fontSize: 14,
  },
  input2: {
    padding: 10,
    minWidth: '85%',
    color: '#000',
  },
  validationText: {
    fontSize: 13,
    color: '#fd1515ff',
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
    color: '#000',
    width: '100%',
  },
  passwordInputWrapper: {
    borderWidth: 1,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#000',
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
    backgroundColor: '#f54b02',
  },
  selector: {
    padding: 15,
    backgroundColor: 'inherit',
    borderWidth: 1,
    width: '90%',
    borderColor: '#000',
    color: '#fff',
  },
  selectorHeader: {
    color: '#fff',
  },
  passwordIcons: {
    marginRight: 9,
  },
  selectorHeader2: {
    color: '#000',
  },
  termsParagraph: {
    marginBottom: 10,
    fontSize: 17,
  },
  forgotPassParagraph: {
    fontSize: 14,
    color: '#000',
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
    borderColor: '#000',
  },
});

export default SignUpScreen;
