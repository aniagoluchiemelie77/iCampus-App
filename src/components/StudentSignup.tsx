import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import type { User } from '../types/firebase';
import { CountryPicker } from 'react-native-country-codes-picker'; // if you use this library
import { useEffect, useState } from 'react';
import { baseUrl } from './HomeScreenComponents';
import { Dropdown } from 'react-native-element-dropdown';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import SweetAlertModal from './alertscomponent';
import Toast from 'react-native-toast-message';
import toastConfig from './ToastConfig';
import { selectImage } from './SelectImage';
import { uploadImageToCloudinary } from './HomeScreenComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HomeScreenComponentStyles,
  ProfileComponentStyles,
} from '../assets/styles/colors';
import DeviceInfo from 'react-native-device-info';
import { useDispatch } from 'react-redux';
import { setUser } from './UserSlice';
import LogoBigger from '../assets/images/Logo';

export type ProgressBarProps = {
  step: number;
  setStep: (s: number) => void;
  totalSteps: number;
};
export interface Institution {
  name: string;
}

export type VerifiedStudent = {
  firstname: string;
  lastname: string;
  department: string;
  current_level: string;
  phone_number: string;
  matriculation_number: string;
  school_name: string;
};

export type SignupResponse = {
  verified?: boolean;
  email?: string;
  message?: string;
  token?: string;
  // Add any other fields your backend returns
};

//Universal email regex
export const isValidEmail = (inputEmail: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(inputEmail);
};

//Universal password regex
export const isValidPassword = (inputPassword: string) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{13,}$/;
  return passwordRegex.test(inputPassword);
};

export const getPasswordRequirements = (password: string) => ({
  hasUppercase: /[A-Z]/.test(password),
  hasLowercase: /[a-z]/.test(password),
  hasNumber: /\d/.test(password),
  hasSymbol: /[\W_]/.test(password),
  hasMinLength: password.length >= 10,
});

//tokenId generation
export const generateId = (length = 14) => {
  const chars =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
//Generating userId
export const generateId2 = (length = 10) => {
  const chars =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const Footer = () => {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.footerDiv}>
      <Text style={styles.footerDivText}>Already have an account?</Text>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.footerDivText2}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};

export const ProgressBar = ({
  step,
  setStep,
  totalSteps,
}: ProgressBarProps) => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i);
  return (
    <View style={styles.progressBarDiv}>
      {steps.map(s => (
        <TouchableOpacity
          key={s}
          onPress={() => {
            if (s < step) {
              setStep(s);
            }
          }}
          style={[
            styles.progressClickable,
            { backgroundColor: s <= step ? '#f54b02' : '#ffb393' },
          ]}
        />
      ))}
    </View>
  );
};

const StudentSignup = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const [step, setStep] = useState(0);

  const [country, setCountry] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const [institution, setInstitution] = useState('');
  const [email, setEmail] = useState('');
  const { height } = Dimensions.get('window');
  const [ipAddress, setIpAddress] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [verifiedEmail, setVerifiedEmail] = useState(false);
  const [timer, setTimer] = useState(900); // 15 minutes = 900 seconds

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [matric, setMatric] = useState('');
  const [verifiedStudent, setVerifiedStudent] =
    useState<VerifiedStudent | null>(null);
  const [studentNotFound, setStudentNotFound] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [creating, setCreating] = useState(false);
  const [institutionItems, setInstitutionItems] = useState<
    { label: string; value: string }[]
  >([]);

  const [emailCode, setEmailCode] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [verifiedInstitution, setVerifiedInstitution] = useState(false);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>(
    'success',
  );
  const [alertMessage, setAlertMessage] = useState('');

  const nextStep = () => setStep(prev => Math.min(prev + 1, 8));
  //const prevStep = () => setStep(prev => Math.max(prev - 1, 0));
  const { hasUppercase, hasLowercase, hasNumber, hasSymbol, hasMinLength } =
    getPasswordRequirements(password);

  const checkICampusOperationalInSchool = async () => {
    console.log('Starting fetch...');
    const response = await fetch(`${baseUrl}users/institutions/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolName: institution }),
    });
    const data = await response.json();
    if (response.ok) {
      setVerifiedInstitution(true);
      setSchoolCode(data.schoolCode);
      nextStep();
    } else {
      setVerifiedInstitution(false);
      console.log(data?.message || 'Failed to validate institution');
      setAlertType('error');
      setAlertMessage(data?.message || 'Failed to validate institution');
      setAlertVisible(true);
    }
  };
  const fetchInstitutionsByCountry = async (selectedCountry: string) => {
    try {
      console.log(`Fetching institutions for country: ${selectedCountry}`);
      const response = await fetch(
        `${baseUrl}users/institutions?country=${selectedCountry}`,
      );
      const data = await response.json();
      console.log('Fetched institutions:', data);

      if (response.ok) {
        const formatted = data.institutions.map((i: Institution) => ({
          label: i.name,
          value: i.name,
        }));

        console.log('Formatted institution items:', formatted);
        setInstitutionItems(formatted);
      }
    } catch (error) {
      console.error('Error fetching institutions:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' + secs : secs}`;
  };

  const verifyStudent = async () => {
    console.log('🔍 Verifying matric number...');
    setVerifying(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let message;
    try {
      const response = await fetch(`${baseUrl}verifyStudent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: institution,
          matriculation_number: matric,
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (response.ok) {
        console.log('✅ Student verified:', data);
        setVerifiedStudent(data);
        setStudentNotFound(false);
        nextStep();
      } else {
        message = 'Student not found';
        console.log('❌ ', message);
        setStudentNotFound(true);
        setAlertMessage(message);
        setAlertType('error');
        setAlertVisible(true);
      }
    } catch (error) {
      message = (error as Error).message;
      console.error('Verification error:', message);
      setStudentNotFound(true);
      setAlertType('error');
      setAlertMessage(message);
      setAlertVisible(true);
    } finally {
      clearTimeout(timeout);
      setVerifying(false);
    }
  };
  const verifyEmail = async () => {
    let message;
    try {
      const response = await fetch(`${baseUrl}users/verifyEmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        nextStep();
      } else {
        message = data?.message || 'Email verification failed, please retry.';
        console.log('❌ ', message);
        setAlertMessage(message);
        setAlertType('error');
        setAlertVisible(true);
      }
    } catch (error) {
      message = (error as Error).message;
      console.error('Verification error:', message);
      setAlertType('error');
      setAlertMessage(message);
      setAlertVisible(true);
    } finally {
      setVerifying(false);
    }
  };
  const resendCode = async () => {
    let message;
    try {
      const response = await fetch(`${baseUrl}users/verifyEmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Email verification resent successfully!',
          position: 'bottom',
          bottomOffset: 5,
          visibilityTime: 3000,
        });
        setTimer(3600);
      } else {
        message =
          data?.message ||
          'Error resending email verification code, please retry.';
        console.log('❌ ', message);
        setAlertMessage(message);
        setAlertType('error');
        setAlertVisible(true);
      }
    } catch (err) {
      message = (err as Error).message;
      console.error('Verification error:', message);
      setAlertType('error');
      setAlertMessage(message);
      setAlertVisible(true);
    }
  };
  const verifyCode = async () => {
    let message;
    try {
      const response = await fetch(`${baseUrl}users/verifyEmailCode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: emailCode,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Email verified successfully!',
          position: 'bottom',
          bottomOffset: 5,
          visibilityTime: 3000,
        });
        console.log('Pre next');
        nextStep();
        setVerifiedEmail(true);
        console.log('Post Next');
      } else {
        message = data?.message || 'Invalid or expired verification code';
        console.log('❌ ', message);
        setVerifiedEmail(false);
        setAlertMessage(message);
        setAlertType('error');
        setAlertVisible(true);
      }
    } catch (err) {
      message = (err as Error).message;
      console.error('Verification error:', message);
      setAlertType('error');
      setVerifiedEmail(false);
      setAlertMessage(message);
      setAlertVisible(true);
    }
  };
  const handleImageUpdate = async () => {
    const imageUri = await selectImage();

    if (imageUri) {
      const imageUrl = await uploadImageToCloudinary(imageUri);

      if (imageUrl) {
        console.log('Uploaded to Cloudinary:', imageUrl);
        setSelectedImage(imageUrl);
        setShowModal(true);
      }
    }
  };
  const confirmUpload = async () => {
    if (!selectedImage) return;
    setUploading(true);
    try {
      // Save the selected image as the final avatar
      setAvatar(selectedImage);
      // Close modal
      setShowModal(false);
      Toast.show({
        type: 'success',
        text1: 'Profile photo updated!',
        position: 'bottom',
        bottomOffset: 5,
        visibilityTime: 3000,
      });
    } finally {
      setUploading(false);
    }
  };
  const fetchIP = async () => {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    setIpAddress(data.ip);
  };
  const userType = 'student';
  const handleSubmit = async () => {
    setCreating(true);
    console.log('Submit Btn Clicked');
    try {
      await fetchIP();
      const deviceType = DeviceInfo.getDeviceType();
      const tokenId = generateId();
      const userId = generateId2();
      // Build user object
      const user: User = {
        uid: userId,
        iScore: '5',
        profilePic: [avatar || ''], // not array unless backend expects array
        usertype: userType,
        schoolCode,
        isFirstLogin: true,
        firstname:
          userType === 'student' && verifiedStudent
            ? verifiedStudent.firstname
            : '',
        lastname:
          userType === 'student' && verifiedStudent
            ? verifiedStudent.lastname
            : '',
        schoolName: institution || '',
        email,
        ipAddress: [ipAddress],
        deviceType: [deviceType],
        accessToken: tokenId,
        password, // ideally hash on backend
        department:
          userType === 'student' && verifiedStudent
            ? verifiedStudent.department
            : '',
        pointsBalance: 0,
        hasSubscribed: false,
        isCourseRep: false,
        createdAt: new Date().toISOString(),
        country: country || '',
        ...(userType === 'student' && verifiedStudent
          ? {
              current_level: verifiedStudent.current_level,
              phone_number: verifiedStudent.phone_number,
              matriculation_number: verifiedStudent.matriculation_number,
            }
          : {}),
      };
      // Send to backend
      const response = await fetch(`${baseUrl}users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      const contentType = response.headers.get('content-type');
      if (response.status === 409) {
        const result = await response.json();
        setCreating(false);
        setAlertType('error');
        setAlertMessage(result.message || 'User already exists.');
        setAlertVisible(true);
        return;
      }
      if (response.ok && contentType?.includes('application/json')) {
        const result = (await response.json()) as SignupResponse;
        setAlertType('success');
        setAlertMessage('Your account has been successfully created.');
        setCreating(false);
        // Save user locally
        await AsyncStorage.setItem('hasLaunched', 'true');
        await AsyncStorage.setItem('user', JSON.stringify(user));
        await AsyncStorage.setItem('authToken', result.token ?? '');
        dispatch(
          setUser({
            ...user,
            tokenCreatedAt: Date.now().toString(),
          }),
        );
        navigation.navigate('Home');
      } else {
        const text = await response.text();
        console.warn('Unexpected response:', text);
        setAlertType('error');
        setAlertMessage('Account creation failed. Please try again.');
        setCreating(false);
      }
      setAlertVisible(true);
    } catch (error) {
      console.error('Error:', error);
      setAlertType('error');
      setAlertMessage('Network error. Please check your connection.');
      setAlertVisible(true);
      setCreating(false);
    }
  };

  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  return (
    <View style={[styles.container, { height: height * 0.75 }]}>
      <>
        <ProgressBar step={step} setStep={setStep} totalSteps={8} />
        <LogoBigger />

        <Text style={styles.title}>Student signup</Text>
        {/* STEP 0 — Select Country */}
        {step === 0 && (
          <>
            <Text style={styles.inputHeader}>Select your country</Text>

            <TouchableOpacity
              onPress={() => setShowCountryPicker(true)}
              style={styles.selector}
            >
              <Text style={styles.selectorHeader2}>
                {country || 'Select Country'}
              </Text>
              <Icon name="chevron-forward" size={20} color="#838282ff" />
            </TouchableOpacity>

            <Modal
              visible={showCountryPicker}
              transparent
              animationType="slide"
            >
              <View
                style={{
                  height: 100,
                  marginTop: 'auto',
                  backgroundColor: '#fff',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  overflow: 'hidden',
                }}
              >
                <CountryPicker
                  show={true}
                  lang="en"
                  searchMessage="Search country"
                  pickerButtonOnPress={item => {
                    setCountry(item.name.en);
                    setShowCountryPicker(false);
                    fetchInstitutionsByCountry(item.name.en);
                  }}
                />
              </View>
            </Modal>

            <TouchableOpacity
              onPress={nextStep}
              disabled={!country}
              style={[
                styles.nextButton,
                { backgroundColor: country ? '#f54b02' : '#fa9265' }, // gray when disabled
              ]}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 1 — Select Institution */}
        {step === 1 && (
          <>
            <Text style={styles.inputHeader}>Select Institution:</Text>
            <Dropdown
              data={institutionItems}
              labelField="label"
              valueField="value"
              search
              placeholder="Select your institution"
              searchPlaceholderTextColor="#222"
              value={institution}
              onChange={async item => {
                setInstitution(item.value);
              }}
              style={styles.dropdown}
            />
            <TouchableOpacity
              onPress={async () => await checkICampusOperationalInSchool()}
              disabled={!institution}
              style={[
                styles.nextButton,
                { backgroundColor: country ? '#f54b02' : '#fa9265' }, // gray when disabled
              ]}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 2 — Matric Number */}
        {step === 2 && (
          <>
            <Text style={styles.inputHeader}>
              Enter your Matriculation Number:
            </Text>
            <TextInput
              placeholder="Matric Number"
              placeholderTextColor="#929191"
              value={matric}
              onChangeText={setMatric}
              style={styles.input}
            />
            {studentNotFound && (
              <Text style={styles.errorText}>
                Matriculation number not found.
              </Text>
            )}

            <TouchableOpacity
              onPress={verifyStudent}
              disabled={matric.length < 3 || verifying}
              style={[
                styles.nextButton,
                {
                  backgroundColor:
                    matric.length < 3 || verifying ? '#fa9265' : '#f54b02',
                },
              ]}
            >
              {' '}
              <Text style={styles.nextButtonText}>
                {' '}
                {verifying ? 'Verifying...' : 'Verify'}{' '}
              </Text>{' '}
            </TouchableOpacity>
          </>
        )}

        {/* STEP 3 — Password */}
        {step === 3 && (
          <>
            <Text style={styles.inputHeader}>
              Welcome {verifiedStudent?.firstname}, create your password:
            </Text>
            <View style={styles.passwordInput}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#929191"
                style={styles.input2}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
                <Icon
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#929191"
                  style={{ marginRight: 7 }}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.strengthBarContainer}>
              <View
                style={[
                  styles.strengthSegment,
                  { backgroundColor: hasUppercase ? '#f54b02' : '#929191' },
                ]}
              />
              <View
                style={[
                  styles.strengthSegment,
                  { backgroundColor: hasLowercase ? '#f54b02' : '#929191' },
                ]}
              />
              <View
                style={[
                  styles.strengthSegment,
                  { backgroundColor: hasNumber ? '#f54b02' : '#929191' },
                ]}
              />
              <View
                style={[
                  styles.strengthSegment,
                  { backgroundColor: hasSymbol ? '#f54b02' : '#929191' },
                ]}
              />
              <View
                style={[
                  styles.strengthSegment,
                  { backgroundColor: hasMinLength ? '#f54b02' : '#929191' },
                ]}
              />
            </View>
            <View style={styles.passwordInput}>
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor="#929191"
                style={styles.input2}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(prev => !prev)}
              >
                <Icon
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#929191"
                  style={{ marginRight: 7 }}
                />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && confirmPassword !== password && (
              <Text style={styles.errorText}>Passwords do not match.</Text>
            )}

            <TouchableOpacity
              onPress={nextStep}
              disabled={
                !isValidPassword(password) || confirmPassword !== password
              }
              style={[
                styles.nextButton,
                {
                  backgroundColor:
                    !isValidPassword(password) || confirmPassword !== password
                      ? '#fa9265'
                      : '#f54b02',
                },
              ]}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 4 — Email */}
        {step === 4 && (
          <>
            <Text style={styles.inputHeader}>Enter your email:</Text>
            <TextInput
              placeholder="Email"
              placeholderTextColor="#929191"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
            />

            <Text style={styles.errorText}>
              {!isValidEmail(email) && email.length > 0
                ? 'Invalid email format'
                : ''}
            </Text>

            <TouchableOpacity
              onPress={verifyEmail}
              disabled={!isValidEmail(email)}
              style={[
                styles.nextButton,
                {
                  backgroundColor: !isValidEmail(email) ? '#fa9265' : '#f54b02',
                },
              ]}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 5 — Confirm Email */}
        {step === 5 && (
          <>
            <Text style={styles.inputHeader}>Confirm Your Email</Text>
            <Text style={styles.inputHeader2}>
              Enter the 6‑digit verification code that has been sent to: {email}
            </Text>
            {/* Code Input */}
            <TextInput
              placeholder="Enter 6‑digit code"
              placeholderTextColor="#929191"
              value={emailCode}
              onChangeText={setEmailCode}
              maxLength={6}
              style={styles.input}
            />
            <View style={styles.rowDiv2}>
              <Text style={styles.rowDivText}>
                Code expires in {formatTime(timer)}
              </Text>
              {/* Resend Code Button */}
              <TouchableOpacity onPress={resendCode}>
                <Text style={styles.rowDivBtn}>Resend Code?</Text>
              </TouchableOpacity>
            </View>
            {/* NEXT BUTTON — only appears when code is 6 digits */}
            {emailCode.length === 6 && (
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: '#f54b02' }]}
                onPress={verifyCode}
              >
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* STEP 6 - Avatar upload (Can skip) */}
        {step === 6 && (
          <>
            <Text style={styles.inputHeader}>Upload Profile Photo</Text>
            <View style={styles.rowDiv}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <Icon name="person-circle-outline" size={100} color="#f54b02" />
              )}
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: '#f54b02' }]}
                onPress={handleImageUpdate}
              >
                <Text style={styles.nextButtonText}>Tap to upload</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: '#f54b02' }]}
              onPress={nextStep}
            >
              <Text style={styles.nextButtonText}>Skip</Text>
            </TouchableOpacity>
          </>
        )}

        {/*FINAL STEP - iCampus Terms and conditions*/}
        {step === 7 && (
          <>
            <Text style={styles.inputHeader}>Terms & Conditions</Text>

            {/* Scrollable Terms */}
            <ScrollView style={styles.termsBox}>
              <Text style={styles.termsText}>
                By creating an iCampus account, you agree to the following
                terms:
                {'\n'} 1. You confirm that all information provided is accurate.
                {'\n'}2. You agree not to misuse the platform or engage in
                fraudulent activity.
                {'\n'}3. You consent to receive notifications related to your
                account.
                {'\n'}4. You understand that violating these terms may lead to
                account suspension.
                {'\n'}5. You agree to our privacy policy and data usage
                guidelines.
                {'\n'}
                Please read carefully before proceeding.
              </Text>
            </ScrollView>

            {/* Agree Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreed(prev => !prev)}
            >
              <Text style={styles.checkboxLabel}>
                I agree to the Terms & Conditions
              </Text>
              <View
                style={[styles.checkbox, agreed && styles.checkboxChecked]}
              />
            </TouchableOpacity>

            {/* Next Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!agreed || creating}
              style={[
                styles.nextButton,
                {
                  backgroundColor: !agreed || creating ? '#f54b02' : '#fa9265',
                },
              ]}
            >
              <Text style={styles.nextButtonText}>
                {creating ? 'Creating Account...' : 'Finish'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </>
      {step !== 7 && <Footer />}
      <SweetAlertModal
        visible={alertVisible}
        onConfirm={() => setAlertVisible(false)}
        title={
          alertType === 'success'
            ? 'Success!'
            : alertType === 'error'
            ? 'Oops!'
            : alertType === 'info'
            ? 'Warning!'
            : 'Notice'
        }
        message={alertMessage}
        type={alertType}
      />
      <Toast config={toastConfig} />
      <Modal visible={showModal} transparent animationType="slide">
        <View style={HomeScreenComponentStyles.overlayCenter}>
          <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
            <View style={HomeScreenComponentStyles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={HomeScreenComponentStyles.popupCenter}>
            <View style={HomeScreenComponentStyles.topHeader2}>
              <Text style={HomeScreenComponentStyles.welcomeText2}>
                Confirm Profile Photo
              </Text>
            </View>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={ProfileComponentStyles.modalImage}
              />
            )}
            <View style={ProfileComponentStyles.modalButtons}>
              <TouchableOpacity
                style={ProfileComponentStyles.confirmButton}
                onPress={confirmUpload}
              >
                <Text style={ProfileComponentStyles.buttonText}>
                  {uploading ? 'Uploading...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={ProfileComponentStyles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={ProfileComponentStyles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
  },
  progressClickable: {
    flex: 1,
    height: 6,
    marginHorizontal: 4,
    borderRadius: 3,
  },
  title: {
    fontSize: 30,
    color: '#222',
    fontWeight: '700',
    marginVertical: 24,
    textAlign: 'center',
  },
  inputHeader: {
    fontSize: 15,
    color: '#222',
    fontWeight: '700',
    marginVertical: 12,
    width: '100%',
    alignSelf: 'flex-start',
  },
  inputHeader2: {
    fontSize: 15,
    color: '#222',
    marginVertical: 10,
    maxWidth: '100%',
    flexWrap: 'wrap',
  },
  progressBarDiv: {
    flexDirection: 'row',
    marginVertical: 20,
    width: '90%',
  },
  selector: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#929191',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectorHeader2: {
    fontSize: 15,
    color: '#929191',
  },
  dropdown: {
    minWidth: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#929191',
    color: '#222',
  },
  input: {
    minWidth: '100%',
    padding: 10,
    borderWidth: 1,
    color: '#222',
    borderColor: '#929191',
    borderRadius: 5,
  },
  input2: {
    flex: 1,
    padding: 10,
    color: '#222',
  },
  passwordInput: {
    width: '100%',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#929191',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextButton: {
    width: 'auto',
    alignSelf: 'center',
    padding: 12,
    marginTop: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignContent: 'center',
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  errorText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    width: '100%',
    color: 'red',
  },
  footerDiv: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'center',
    position: 'absolute',
    bottom: 30,
    left: 20,
  },
  footerDivText: {
    fontSize: 15,
    color: '#222',
    marginRight: 5,
  },
  footerDivText2: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f54b02',
  },
  strengthBarContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
    width: '80%',
    alignSelf: 'flex-start',
  },
  strengthSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  rowDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  rowDiv2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  rowDivText: {
    color: '#929191',
    fontSize: 12,
  },
  rowDivBtn: {
    fontSize: 12,
    color: '#f54b02',
    fontWeight: '800',
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: '#f54b02',
  },
  termsBox: {
    height: 150,
    width: '100%',
    padding: 10,
    borderWidth: 0.7,
    borderColor: '#929191',
    marginVertical: 10,
  },
  termsText: {
    color: '#222',
    fontSize: 15,
    paddingBottom: 30,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#f54b02',
    borderRadius: 4,
    marginLeft: 6,
  },
  checkboxChecked: {
    backgroundColor: '#f54b02',
  },
  checkboxLabel: {
    color: '#444',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default StudentSignup;
