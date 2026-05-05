import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { CountryPicker } from 'react-native-country-codes-picker';
import { useEffect, useState } from 'react';
import { Dropdown } from 'react-native-element-dropdown';
import { useNavigation } from '@react-navigation/native';
import SweetAlertModal from './alertscomponent';
import Toast from 'react-native-toast-message';
import toastConfig from './ToastConfig';
import { selectImage } from './SelectImage';
import { uploadToCloudinary } from '../utils/CloudinaryPresetHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
  StudentSignupStyles,
} from '../assets/styles/colors';
import DeviceInfo from 'react-native-device-info';
import { useDispatch } from 'react-redux';
import { setUser } from './UserSlice';
import LogoBigger from '../assets/images/Logo';
import { ProgressBar, Footer } from './SignupComponents';
import {
  isValidEmail,
  isValidPassword,
  getPasswordRequirements,
} from '../utils/SignupHelpers';
import {
  verifySignupEmail,
  verifySignupEmailCode,
  handleRegisterUser,
  verifySignupInstructor,
  signupValidateInstitution,
} from '../api/localPostApis';
import { signupFetchInstitutions } from '../api/localGetApis';
import { formatSignupTime } from '../utils/ChatTimestampFormatter';
import { VerifiedInstructor } from '../types/firebase';
import { ImageConfirmationModal } from './ImageConfirmationModal';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

const InstructorSignup = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [institution, setInstitution] = useState('');
  const [email, setEmail] = useState('');
  const { height } = Dimensions.get('window');
  const [_verifiedEmail, setVerifiedEmail] = useState(false);
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
    const response = await signupValidateInstitution(institution);
    if (response.success) {
      setVerifiedInstitution(true);
      setSchoolCode(response.schoolCode);
      nextStep();
    } else {
      setVerifiedInstitution(false);
      console.log(response?.message || 'Failed to validate institution');
      setAlertType('error');
      setAlertMessage(response?.message || 'Failed to validate institution');
      setAlertVisible(true);
    }
  };
  const fetchInstitutionsByCountry = async (selectedCountry: string) => {
    try {
      const response = await signupFetchInstitutions(selectedCountry);
      if (response.success) {
        setInstitutionItems(response.data);
      }
    } catch (error) {
      console.error('Error fetching institutions:', error);
    }
  };
  const verifyInstructor = async () => {
    setVerifying(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let message;
    try {
      const response = await verifySignupInstructor(
        institution,
        staffId,
        controller.signal,
      );
      if (response.verified) {
        console.log('✅ Instructor verified:', response.data);
        setVerifiedInstructor(response.data);
        setInstructorNotFound(false);
        nextStep();
      } else {
        message = response.message || 'Instructor not found';
        setInstructorNotFound(true);
        setAlertMessage(message);
        setAlertType('error');
        setAlertVisible(true);
      }
    } catch (error) {
      message = (error as Error).message;
      console.error('Verification error:', message);
      setInstructorNotFound(true);
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
      const response = await verifySignupEmailCode(email, emailCode);

      if (response.verified) {
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
  const userType = 'lecturer';
  const handleSubmit = async () => {
    setCreating(true);
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
        firstname: userType === 'lecturer' ? verifiedInstructor?.firstname : '',
        lastname: userType === 'lecturer' ? verifiedInstructor?.lastname : '',
        schoolName: institution || '',
        email,
        deviceId,
        deviceName: `${brand} ${deviceName}`,
        password,
        department:
          userType === 'lecturer' ? verifiedInstructor?.department : '',
        country: country || '',
        itagusername: verifiedInstructor?.firstname,
        ...(userType === 'lecturer' && verifiedInstructor
          ? {
              phone_number: verifiedInstructor.phone_number,
              staff_id: verifiedInstructor.staff_id,
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
  }, [timer]); // ← empty dependency array

  return (
    <View style={[StudentSignupStyles.container, { height: height * 0.75 }]}>
      <>
        <ProgressBar step={step} setStep={setStep} totalSteps={8} />
        <LogoBigger />
        <Text style={StudentSignupStyles.title}>Instructor signup</Text>
        {/* STEP 0 — Select Country */}
        {step === 0 && (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
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
              <MaterialIcons
                name="chevron-right-outlined"
                size={20}
                color={PRIMARY_COLOR_TINT}
              />
            </TouchableOpacity>
            <CountryPicker
              show={showCountryPicker}
              lang="en"
              searchMessage="Search country..."
              enableModalAvoiding={true}
              onBackdropPress={() => setShowCountryPicker(false)}
              style={{
                modal: {
                  height: 400,
                },
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
                {
                  backgroundColor: country ? PRIMARY_COLOR : PRIMARY_COLOR_TINT,
                },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 1 — Select Institution */}
        {step === 1 && (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
            <Text style={StudentSignupStyles.inputHeader}>
              Select Institution:
            </Text>
            <Dropdown
              data={institutionItems}
              labelField="label"
              valueField="value"
              search
              placeholder="Select your institution"
              searchPlaceholderTextColor={PRIMARY_COLOR_TINT}
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
                {
                  backgroundColor: country ? PRIMARY_COLOR : PRIMARY_COLOR_TINT,
                }, // gray when disabled
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 2 — Staff ID Confirmation */}
        {step === 2 && (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
            <Text style={StudentSignupStyles.inputHeader}>
              Enter your Staff ID:
            </Text>
            <TextInput
              placeholder="Staff ID"
              placeholderTextColor={PRIMARY_COLOR_TINT}
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
                    staffId.length < 3 || verifying
                      ? PRIMARY_COLOR_TINT
                      : PRIMARY_COLOR,
                },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>
                {verifying ? 'Verifying...' : 'Verify'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 3 — Password */}
        {step === 3 && (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
            <Text style={StudentSignupStyles.inputHeader}>
              Welcome {verifiedInstructor?.firstname}, create your password:
            </Text>
            <View style={StudentSignupStyles.passwordInput}>
              <TextInput
                placeholder="Password"
                placeholderTextColor={PRIMARY_COLOR_TINT}
                style={StudentSignupStyles.input2}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
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
            <View style={StudentSignupStyles.strengthBarContainer}>
              <View
                style={[
                  StudentSignupStyles.strengthSegment,
                  {
                    backgroundColor: hasUppercase
                      ? PRIMARY_COLOR
                      : PRIMARY_COLOR_TINT,
                  },
                ]}
              />
              <View
                style={[
                  StudentSignupStyles.strengthSegment,
                  {
                    backgroundColor: hasLowercase
                      ? PRIMARY_COLOR
                      : PRIMARY_COLOR_TINT,
                  },
                ]}
              />
              <View
                style={[
                  StudentSignupStyles.strengthSegment,
                  {
                    backgroundColor: hasNumber
                      ? PRIMARY_COLOR
                      : PRIMARY_COLOR_TINT,
                  },
                ]}
              />
              <View
                style={[
                  StudentSignupStyles.strengthSegment,
                  {
                    backgroundColor: hasSymbol
                      ? PRIMARY_COLOR
                      : PRIMARY_COLOR_TINT,
                  },
                ]}
              />
              <View
                style={[
                  StudentSignupStyles.strengthSegment,
                  {
                    backgroundColor: hasMinLength
                      ? PRIMARY_COLOR
                      : PRIMARY_COLOR_TINT,
                  },
                ]}
              />
            </View>
            <View style={StudentSignupStyles.passwordInput}>
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor={PRIMARY_COLOR_TINT}
                style={StudentSignupStyles.input2}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
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
                  style={{ marginHorizontal: 7 }}
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
                      ? PRIMARY_COLOR_TINT
                      : PRIMARY_COLOR,
                },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 4 — Email */}
        {step === 4 && (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
            <Text style={StudentSignupStyles.inputHeader}>
              Enter your email:
            </Text>
            <TextInput
              placeholder="Email"
              placeholderTextColor={PRIMARY_COLOR_TINT}
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
                  backgroundColor: !isValidEmail(email)
                    ? PRIMARY_COLOR_TINT
                    : PRIMARY_COLOR,
                },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 5 — Confirm Email */}
        {step === 5 && (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
            <Text style={StudentSignupStyles.inputHeader}>
              Confirm Your Email
            </Text>
            <Text style={StudentSignupStyles.inputHeader2}>
              Enter the 6‑digit verification code that has been sent to: {email}
            </Text>
            {/* Code Input */}
            <TextInput
              placeholder="Enter 6‑digit code"
              placeholderTextColor={PRIMARY_COLOR_TINT}
              value={emailCode}
              onChangeText={setEmailCode}
              maxLength={6}
              style={StudentSignupStyles.input}
            />
            <View style={StudentSignupStyles.rowDiv2}>
              <Text style={StudentSignupStyles.rowDivText}>
                Code expires in {formatSignupTime(timer)}
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
                  { backgroundColor: PRIMARY_COLOR },
                ]}
                onPress={verifyCode}
              >
                <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* STEP 6 - Avatar upload (Can skip) */}
        {step === 6 && (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
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
                    <MaterialIcons
                      name="account-circle-outlined"
                      size={120}
                      color={PRIMARY_COLOR}
                    />
                  )}

                  {/* The Camera Icon Overlay */}
                  <View style={StudentSignupStyles.cameraIconBadge}>
                    <MaterialIcons
                      name="camera-alt-outlined"
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                StudentSignupStyles.nextButton,
                { backgroundColor: PRIMARY_COLOR },
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
          </Animated.View>
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
                {agreed && <MaterialIcons name="check-outlined" size={14} color="#FFF" />}
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
                  backgroundColor:
                    agreed || creating ? PRIMARY_COLOR : PRIMARY_COLOR_TINT,
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
      <ImageConfirmationModal
        isVisible={showModal}
        imageUri={selectedImage}
        onClose={() => setShowModal(false)}
        onConfirm={confirmUpload}
        isUploading={uploading}
      />
    </View>
  );
};

export default InstructorSignup;
