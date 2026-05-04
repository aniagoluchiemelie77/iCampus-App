import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
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
import { uploadToCloudinary } from '../utils/CloudinaryPresetHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HomeScreenComponentStyles,
  ProfileComponentStyles,
  StudentSignupStyles,
} from '../assets/styles/colors';
import DeviceInfo from 'react-native-device-info';
import { useDispatch } from 'react-redux';
import { setUser } from './UserSlice';
import LogoBigger from '../assets/images/Logo';
import {
  verifySignupEmail,
  verifySignupEmailCode,
  handleRegisterUser,
  verifySignupStudent,
} from '../api/localPostApis';
import {
  isValidEmail,
  isValidPassword,
  getPasswordRequirements,
} from '../utils/SignupHelpers';

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
};

export const Footer = () => {
  const navigation = useNavigation<any>();
  return (
    <View style={StudentSignupStyles.footerDiv}>
      <Text style={StudentSignupStyles.footerDivText}>
        Already have an account?
      </Text>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={StudentSignupStyles.footerDivText2}>Login</Text>
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
    <View style={StudentSignupStyles.progressBarDiv}>
      {steps.map(s => (
        <TouchableOpacity
          key={s}
          onPress={() => {
            if (s < step) {
              setStep(s);
            }
          }}
          style={[
            StudentSignupStyles.progressClickable,
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
  const [_verifiedEmail, setVerifiedEmail] = useState(false);
  const [timer, setTimer] = useState(900); // 15 minutes = 900 seconds

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [matric, setMatric] = useState('');
  const [verifiedStudent, setVerifiedStudent] =
    useState<VerifiedStudent | null>(null);
  const [studentNotFound, setStudentNotFound] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [hasUploadedAvatar, setHasUploadedAvatar] = useState(false);
  const [creating, setCreating] = useState(false);
  const [institutionItems, setInstitutionItems] = useState<
    { label: string; value: string }[]
  >([]);

  const [emailCode, setEmailCode] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [_verifiedInstitution, setVerifiedInstitution] = useState(false);

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
      const response = await verifySignupStudent(
        institution,
        matric,
        controller.signal,
      );
      if (response.success) {
        console.log('✅ Student verified:', response.data);
        setVerifiedStudent(response.data);
        setStudentNotFound(false);
        nextStep();
      } else {
        message = response.message || 'Student not found';
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
      const response = await verifySignupEmail(email);
      if (response.success) {
        nextStep();
      } else {
        message =
          response?.message || 'Email verification failed, please retry.';
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
      const response = await verifySignupEmail(email);
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Email verification resent successfully!',
          position: 'bottom',
          bottomOffset: 5,
          visibilityTime: 3000,
        });
        setTimer(900);
        setEmailCode('');
      } else {
        message =
          response?.message ||
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
      const response = await verifySignupEmailCode(email, emailCode);
      if (response.verified) {
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
        message = response?.message || 'Invalid or expired verification code';
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
      const imageUrl = await uploadToCloudinary(imageUri);

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
      setAvatar(selectedImage);
      setHasUploadedAvatar(true);
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
  const handleSubmit = async () => {
    setCreating(true);
    const userType = 'student';
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceName = DeviceInfo.getModel();
      const brand = DeviceInfo.getBrand();

      const registrationData = {
        currentIScore: 5,
        isVerified: true,
        profilePic: avatar || '',
        usertype: userType,
        schoolCode,
        firstname: userType === 'student' ? verifiedStudent?.firstname : '',
        lastname: userType === 'student' ? verifiedStudent?.lastname : '',
        schoolName: institution || '',
        email,
        deviceId,
        deviceName: `${brand} ${deviceName}`,
        password,
        department: userType === 'student' ? verifiedStudent?.department : '',
        country: country || '',
        itagusername: verifiedStudent?.firstname,
        ...(userType === 'student' && verifiedStudent
          ? {
              current_level: verifiedStudent.current_level,
              phone_number: verifiedStudent.phone_number,
              matriculation_number: verifiedStudent.matriculation_number,
            }
          : {}),
      };

      const response = await handleRegisterUser(registrationData);

      if (response.status === 409) {
        setCreating(false);
        setAlertType('error');
        setAlertMessage(response.message || 'User already exists.');
        setAlertVisible(true);
        return;
      }

      if (response.success) {
        setAlertType('success');
        setAlertMessage('Your account has been successfully created.');
        const { accessToken, refreshToken, user } = response;
        await AsyncStorage.setItem('hasLaunched', 'true');
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(user));

        dispatch(
          setUser({
            ...user,
            accessToken,
            tokenCreatedAt: Date.now().toString(),
          }),
        );

        setCreating(false);
        navigation.navigate('Home');
      } else {
        console.warn('Signup failed:', response.message);
        setAlertType('error');
        setAlertMessage(response.message || 'Account creation failed.');
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
      setTimer(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);
  return (
    <View style={[StudentSignupStyles.container, { height: height * 0.75 }]}>
      <>
        <ProgressBar step={step} setStep={setStep} totalSteps={8} />
        <LogoBigger />

        <Text style={StudentSignupStyles.title}>Student signup</Text>
        {/* STEP 0 — Select Country */}
        {step === 0 && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Select your country
            </Text>

            <TouchableOpacity
              onPress={() => setShowCountryPicker(true)}
              style={StudentSignupStyles.selector}
            >
              <Text style={StudentSignupStyles.selectorHeader2}>
                {country || 'Select Country'}
              </Text>
              <Icon name="chevron-forward" size={20} color="#838282ff" />
            </TouchableOpacity>

            <CountryPicker
              show={showCountryPicker}
              lang="en"
              searchMessage="Search country..."
              enableModalAvoiding={true} // Helps with keyboard/search bar
              onBackdropPress={() => setShowCountryPicker(false)}
              style={{
                // This makes it a bottom sheet at a set height
                modal: {
                  height: 400, // Adjust this value to your preferred height
                },
                // Modern styling for the search input
                textInput: {
                  height: 45,
                  borderRadius: 10,
                  paddingHorizontal: 15,
                },
                countryButtonStyles: {
                  height: 50,
                },
              }}
              pickerButtonOnPress={item => {
                setCountry(item.name.en);
                setShowCountryPicker(false);
                fetchInstitutionsByCountry(item.name.en);
              }}
            />

            <TouchableOpacity
              onPress={nextStep}
              disabled={!country}
              style={[
                StudentSignupStyles.nextButton,
                { backgroundColor: country ? '#f54b02' : '#fa9265' },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 1 — Select Institution */}
        {step === 1 && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Select Institution:
            </Text>
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
              style={StudentSignupStyles.dropdown}
            />
            <TouchableOpacity
              onPress={async () => await checkICampusOperationalInSchool()}
              disabled={!institution}
              style={[
                StudentSignupStyles.nextButton,
                { backgroundColor: country ? '#f54b02' : '#fa9265' }, // gray when disabled
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 2 — Matric Number */}
        {step === 2 && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Enter your Matriculation Number:
            </Text>
            <TextInput
              placeholder="Matric Number"
              placeholderTextColor="#929191"
              value={matric}
              onChangeText={setMatric}
              style={StudentSignupStyles.input}
            />
            {studentNotFound && (
              <Text style={StudentSignupStyles.errorText}>
                Matriculation number not found.
              </Text>
            )}

            <TouchableOpacity
              onPress={verifyStudent}
              disabled={matric.length < 3 || verifying}
              style={[
                StudentSignupStyles.nextButton,
                {
                  backgroundColor:
                    matric.length < 3 || verifying ? '#fa9265' : '#f54b02',
                },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>
                {verifying ? 'Verifying...' : 'Verify'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 3 — Password */}
        {step === 3 && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Welcome {verifiedStudent?.firstname}, create your password:
            </Text>
            <View style={StudentSignupStyles.passwordInput}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#929191"
                style={StudentSignupStyles.input2}
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
            <View style={StudentSignupStyles.strengthBarContainer}>
              <View
                style={[
                  StudentSignupStyles.strengthSegment,
                  { backgroundColor: hasUppercase ? '#f54b02' : '#929191' },
                ]}
              />
              <View
                style={[
                  StudentSignupStyles.strengthSegment,
                  { backgroundColor: hasLowercase ? '#f54b02' : '#929191' },
                ]}
              />
              <View
                style={[
                  StudentSignupStyles.strengthSegment,
                  { backgroundColor: hasNumber ? '#f54b02' : '#929191' },
                ]}
              />
              <View
                style={[
                  StudentSignupStyles.strengthSegment,
                  { backgroundColor: hasSymbol ? '#f54b02' : '#929191' },
                ]}
              />
              <View
                style={[
                  StudentSignupStyles.strengthSegment,
                  { backgroundColor: hasMinLength ? '#f54b02' : '#929191' },
                ]}
              />
            </View>
            <View style={StudentSignupStyles.passwordInput}>
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor="#929191"
                style={StudentSignupStyles.input2}
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
              <Text style={StudentSignupStyles.errorText}>
                Passwords do not match.
              </Text>
            )}

            <TouchableOpacity
              onPress={nextStep}
              disabled={
                !isValidPassword(password) || confirmPassword !== password
              }
              style={[
                StudentSignupStyles.nextButton,
                {
                  backgroundColor:
                    !isValidPassword(password) || confirmPassword !== password
                      ? '#fa9265'
                      : '#f54b02',
                },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 4 — Email */}
        {step === 4 && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Enter your email:
            </Text>
            <TextInput
              placeholder="Email"
              placeholderTextColor="#929191"
              value={email}
              onChangeText={setEmail}
              style={StudentSignupStyles.input}
            />

            <Text style={StudentSignupStyles.errorText}>
              {!isValidEmail(email) && email.length > 0
                ? 'Invalid email format'
                : ''}
            </Text>

            <TouchableOpacity
              onPress={verifyEmail}
              disabled={!isValidEmail(email)}
              style={[
                StudentSignupStyles.nextButton,
                {
                  backgroundColor: !isValidEmail(email) ? '#fa9265' : '#f54b02',
                },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 5 — Confirm Email */}
        {step === 5 && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Confirm Your Email
            </Text>
            <Text style={StudentSignupStyles.inputHeader2}>
              Enter the 6‑digit verification code that has been sent to: {email}
            </Text>
            {/* Code Input */}
            <TextInput
              placeholder="Enter 6‑digit code"
              placeholderTextColor="#929191"
              value={emailCode}
              onChangeText={setEmailCode}
              maxLength={6}
              style={StudentSignupStyles.input}
            />
            <View style={StudentSignupStyles.rowDiv2}>
              <Text style={StudentSignupStyles.rowDivText}>
                Code expires in {formatTime(timer)}
              </Text>
              {/* Resend Code Button */}
              <TouchableOpacity onPress={resendCode}>
                <Text style={StudentSignupStyles.rowDivBtn}>Resend Code?</Text>
              </TouchableOpacity>
            </View>
            {/* NEXT BUTTON — only appears when code is 6 digits */}
            {emailCode.length === 6 && (
              <TouchableOpacity
                style={[
                  StudentSignupStyles.nextButton,
                  { backgroundColor: '#f54b02' },
                ]}
                onPress={verifyCode}
              >
                <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* STEP 6 - Avatar upload (Can skip) */}
        {step === 6 && (
          <>
            <Text style={StudentSignupStyles.header}>Upload Profile Photo</Text>

            {/* Main Container for the Avatar and Icon Overlay */}
            <View style={StudentSignupStyles.avatarContainer}>
              <TouchableOpacity onPress={handleImageUpdate} activeOpacity={0.8}>
                <View style={StudentSignupStyles.avatarWrapper}>
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      style={StudentSignupStyles.avatarImage}
                    />
                  ) : (
                    <Icon name="person-circle" size={120} color="#E0E0E0" />
                  )}

                  {/* The Camera Icon Overlay */}
                  <View style={StudentSignupStyles.cameraIconBadge}>
                    <Icon name="camera" size={20} color="#FFFFFF" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                StudentSignupStyles.nextButton,
                { backgroundColor: '#f54b02' },
              ]}
              onPress={handleImageUpdate}
            >
              <Text style={StudentSignupStyles.nextButtonText}>
                {hasUploadedAvatar ? 'Change Photo' : 'Upload Photo'}
              </Text>
            </TouchableOpacity>

            {/* Secondary Skip Action */}
            <TouchableOpacity
              style={StudentSignupStyles.skipLink}
              onPress={nextStep}
            >
              <Text style={StudentSignupStyles.skipLinkText}>
                {hasUploadedAvatar ? 'Next' : 'Skip for now'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/*FINAL STEP - iCampus Terms and conditions*/}
        {step === 7 && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Terms & Conditions
            </Text>

            {/* Scrollable Terms */}
            <ScrollView style={StudentSignupStyles.termsBox}>
              <Text style={StudentSignupStyles.termsText}>
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
              style={StudentSignupStyles.checkboxContainer}
              onPress={() => setAgreed(prev => !prev)}
              activeOpacity={0.7}
            >
              {/* The Checkbox Box */}
              <View
                style={[
                  StudentSignupStyles.checkbox,
                  agreed && StudentSignupStyles.checkboxChecked,
                ]}
              >
                {agreed && <Icon name="checkmark" size={14} color="#FFF" />}
              </View>

              {/* The Label */}
              <Text style={StudentSignupStyles.checkboxLabel}>
                I agree to the{' '}
                <Text style={StudentSignupStyles.linkText}>
                  Terms & Conditions
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Next Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!agreed || creating}
              style={[
                StudentSignupStyles.nextButton,
                {
                  backgroundColor: agreed || creating ? '#f54b02' : '#fa9265',
                },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>
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

export default StudentSignup;
