import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Modal,
  Image,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import type { User } from '../types/firebase';
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
  StudentSignupStyles,
} from '../assets/styles/colors';
import DeviceInfo from 'react-native-device-info';
import { useDispatch } from 'react-redux';
import { setUser } from './UserSlice';
import LogoBigger from '../assets/images/Logo';
import {
  ProgressBar,
  Institution,
  Footer,
  isValidEmail,
  isValidPassword,
  getPasswordRequirements,
  generateId,
  generateId2,
} from './StudentSignup';

type VerifiedInstructor = {
  firstname: string;
  lastname: string;
  department: string;
  current_level: string;
  phone_number: string;
  staff_id: string;
  school_name: string;
};

export type SignupResponse = {
  verified?: boolean;
  email?: string;
  message?: string;
  token?: string;
  // Add any other fields your backend returns
};

const InstructorSignup = () => {
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
  const [timer, setTimer] = useState(900);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [staffId, setStaffId] = useState('');
  const [verifiedInstructor, setVerifiedInstructor] =
    useState<VerifiedInstructor | null>(null);
  const [instructorNotFound, setInstructorNotFound] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [hasUploadedAvatar, setHasUploadedAvatar] = useState(false);
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' + secs : secs}`;
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
        setTimer(900);
        setEmailCode('');
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
      setHasUploadedAvatar(true);
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
  const userType = 'lecturer';
  const handleSubmit = async () => {
    setCreating(true);
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
          userType === 'lecturer' && verifiedInstructor
            ? verifiedInstructor.firstname
            : '',
        lastname:
          userType === 'lecturer' && verifiedInstructor
            ? verifiedInstructor.lastname
            : '',
        schoolName: institution || '',
        email,
        ipAddress: [ipAddress],
        deviceType: [deviceType],
        accessToken: tokenId,
        password, // ideally hash on backend
        department:
          userType === 'lecturer' && verifiedInstructor
            ? verifiedInstructor.department
            : '',
        pointsBalance: 0,
        hasSubscribed: false,
        createdAt: new Date().toISOString(),
        country: country || '',
        ...(userType === 'lecturer' && verifiedInstructor
          ? {
              phone_number: verifiedInstructor.phone_number,
              staffId: verifiedInstructor.staff_id,
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
      setTimer(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]); // ← empty dependency array

  return (
    <View style={[StudentSignupStyles.container, { height: height * 0.75 }]}>
      <>
        <ProgressBar step={step} setStep={setStep} totalSteps={2} />
        <LogoBigger />

        <Text style={StudentSignupStyles.title}>Instructor signup</Text>
        {/* STEP 0 — Email or Password */}
        {step === 0 && (
            <>
                {/* The main 'Next' button from your previous flow */}
                <TouchableOpacity
                   onPress={nextStep}
    style={styles.primaryButton}
  >
    <Text style={styles.primaryButtonText}>Next</Text>
  </TouchableOpacity>

  {/* The 'OR' Divider */}
  <View style={styles.dividerContainer}>
    <View style={styles.dividerLine} />
    <Text style={styles.dividerText}>or</Text>
    <View style={styles.dividerLine} />
  </View>

  {/* Social Buttons Section */}
  <View style={styles.socialContainer}>
    <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('Google')}>
      <Icon name="logo-google" size={20} color="#DB4437" />
      <Text style={styles.socialButtonText}>Continue with Google</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('Github')}>
      <Icon name="logo-github" size={20} color="#333" />
      <Text style={styles.socialButtonText}>Continue with Github</Text>
    </TouchableOpacity>
  </View>

  {/* Footer Login Link */}
  <View style={styles.footerContainer}>
    <Text style={styles.footerText}>Already have an account? </Text>
    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
      <Text style={styles.footerLink}>Log in</Text>
    </TouchableOpacity>
  </View>
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

        {/* STEP 2 — Staff ID Confirmation */}
        {step === 2 && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Enter your Staff ID:
            </Text>
            <TextInput
              placeholder="Staff ID"
              placeholderTextColor="#929191"
              value={staffId}
              onChangeText={setStaffId}
              style={StudentSignupStyles.input}
            />
            {instructorNotFound && (
              <Text style={StudentSignupStyles.errorText}>
                User Staff ID not found.
              </Text>
            )}

            <TouchableOpacity
              onPress={verifyInstructor}
              disabled={staffId.length < 3 || verifying}
              style={[
                StudentSignupStyles.nextButton,
                {
                  backgroundColor:
                    staffId.length < 3 || verifying ? '#fa9265' : '#f54b02',
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
              Welcome {verifiedInstructor?.firstname}, create your password:
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
const styles = StyleSheet.create({
  // ... existing styles for primaryButton
  
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#888',
    fontSize: 14,
  },
  socialContainer: {
    width: '100%',
    gap: 12, // Space between social buttons
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  socialButtonText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#888',
    fontSize: 14,
  },
  footerLink: {
    color: '#f54b02', // Your brand orange
    fontWeight: '700',
    fontSize: 14,
  },
});

export default InstructorSignup;
