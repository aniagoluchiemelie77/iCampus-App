import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { CountryPicker } from 'react-native-country-codes-picker'; // if you use this library
import { useState } from 'react';
import { Dropdown } from 'react-native-element-dropdown';
import { useNavigation } from '@react-navigation/native';
import SweetAlertModal from './alertscomponent';
import Toast from 'react-native-toast-message';
import { selectImage } from './SelectImage';
import { uploadToFirebase } from '../utils/CloudinaryPresetHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { UserProfileCard } from './ProfileConfirmer';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
  StudentSignupStyles,
} from '../assets/styles/colors';
import DeviceInfo from 'react-native-device-info';
import { useDispatch } from 'react-redux';
import { setUser } from '../context/UserSlice';
import LogoBigger from '../assets/images/Logo';
import { ImageConfirmationModal } from './ImageConfirmationModal';
import {
  handleRegisterUser,
  verifySignupStudent,
  signupValidateInstitution,
} from '../api/localPostApis';
import { signupFetchInstitutions } from '../api/localGetApis';
import {
  isValidPassword,
  getPasswordRequirements,
} from '../utils/SignupHelpers';
import { ProgressBar, Footer } from '../components/SignupComponents';
import { VerifiedStudent } from '../types/firebase';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

const StudentSignup = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const [step, setStep] = useState(0);

  const [country, setCountry] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const [institution, setInstitution] = useState('');
  const { height } = Dimensions.get('window');

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
  const [institutionName, setInstitutionName] = useState<string>('');

  const nextStep = () => setStep(prev => Math.min(prev + 1, 7));
  const { hasUppercase, hasLowercase, hasNumber, hasSymbol, hasMinLength } =
    getPasswordRequirements(password);

  const checkICampusOperationalInSchool = async () => {
    const response = await signupValidateInstitution(institution);
    if (response.success) {
      setVerifiedInstitution(true);
      setSchoolCode(response.schoolCode);
      setInstitutionName(response.schoolName);
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
        const listWithOther = [
          ...response.data,
          { label: 'Other / Not Listed', value: 'OTHER' },
        ];
        setInstitutionItems(listWithOther);
      }
    } catch (error) {
      console.error('Error fetching institutions:', error);
    }
  };
  const verifyStudent = async () => {
    setVerifying(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let message;
    try {
      const response = await verifySignupStudent(
        schoolCode,
        matric,
        controller.signal,
      );
      if (response.success && response.verified) {
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
  const handleImageUpdate = async () => {
    const imageUri = await selectImage();

    if (imageUri) {
      const imageUrl = await uploadToFirebase(imageUri);

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
        profilePic: avatar || verifiedStudent?.schoolAvatarUrl,
        usertype: userType,
        schoolCode,
        ...verifiedStudent,
        schoolName: institutionName || '',
        deviceId,
        deviceName: `${brand} ${deviceName}`,
        password,
        country: country || '',
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
        navigation.navigate('Home', { activeTab: 'home' });
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
  return (
    <View style={[StudentSignupStyles.container, { height: height * 0.75 }]}>
      <>
        <ProgressBar step={step} setStep={setStep} totalSteps={7} />
        <LogoBigger />

        <Text style={StudentSignupStyles.mainHeader}>Student signup</Text>
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
                },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 2 — Matric Number */}
        {step === 2 && (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
            <Text style={StudentSignupStyles.inputHeader}>
              Enter your Matriculation Number:
            </Text>
            <TextInput
              placeholder="Matric Number"
              placeholderTextColor={PRIMARY_COLOR_TINT}
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
                    matric.length < 3 || verifying
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
        {/* STEP 3 — Identity Confirmation */}
        {step === 3 && (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
            <UserProfileCard
              profilePic={verifiedStudent?.schoolAvatarUrl}
              firstName={verifiedStudent?.firstname}
              lastName={verifiedStudent?.lastname}
              isVerified={verifiedStudent?.isVerified}
              department={verifiedStudent?.department}
              identifierNumber={verifiedStudent?.matricNumber}
              identifierLabel={'Matric Number'}
              currentLevel={verifiedStudent?.current_level}
              size="medium"
            />
            <TouchableOpacity
              onPress={nextStep}
              style={[
                StudentSignupStyles.nextButton,
                {
                  backgroundColor: PRIMARY_COLOR,
                },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>Confirm</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* STEP 4 — Password */}
        {step === 4 && (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
            <Text style={StudentSignupStyles.inputHeader}>
              Welcome {verifiedStudent?.firstname}, create your password:
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
                  { backgroundColor: hasMinLength ? '#f54b02' : '#929191' },
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

        {/* STEP 5 - Avatar upload (Can skip) */}
        {step === 5 && (
          <Animated.View
            entering={FadeInRight.duration(400).springify()}
            exiting={FadeOutLeft}
          >
            <Text style={StudentSignupStyles.header}>Upload Profile Photo</Text>
            <View style={StudentSignupStyles.avatarContainer}>
              <TouchableOpacity onPress={handleImageUpdate} activeOpacity={0.8}>
                <View style={StudentSignupStyles.avatarWrapper}>
                  <Image
                    source={{
                      uri: avatar ? avatar : verifiedStudent?.schoolAvatarUrl,
                    }}
                    style={StudentSignupStyles.avatarImage}
                  />
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
            <TouchableOpacity
              style={[
                StudentSignupStyles.nextButton,
                { backgroundColor: PRIMARY_COLOR },
              ]}
              onPress={handleImageUpdate}
            >
              <Text style={StudentSignupStyles.nextButtonText}>
                Change Photo
              </Text>
            </TouchableOpacity>
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
        {step === 6 && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Terms & Conditions
            </Text>

            {/* Scrollable Terms */}
            <ScrollView
              style={StudentSignupStyles.termsBox}
              showsVerticalScrollIndicator={false}
            >
              <Text style={StudentSignupStyles.termsTitle}>
                Terms & Conditions
              </Text>

              <Text style={StudentSignupStyles.termsDescription}>
                By creating an iCampus account, you acknowledge and agree to our
                framework guidelines:
              </Text>

              {[
                'You confirm that all profile and academic information provided is accurate and authentic.',
                'You agree not to misuse platform services, compromise security, or engage in fraudulent activity (including iCash wallet misuse).',
                'You consent to receive automated notifications and critical updates related to your account activity.',
                'You understand that violating platform terms or safety policies will result in immediate account restriction or suspension.',
                'You agree to our data protection guidelines and privacy policy regarding digital records.',
              ].map((term, index) => (
                <View key={index} style={StudentSignupStyles.termItem}>
                  <Text style={StudentSignupStyles.termBullet}>•</Text>
                  <Text style={StudentSignupStyles.termText}>{term}</Text>
                </View>
              ))}

              <Text style={StudentSignupStyles.termsFooter}>
                Please review our{' '}
                <Text
                  style={StudentSignupStyles.linkText}
                  onPress={() => navigation.navigate('TermsOfService')}
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text
                  style={StudentSignupStyles.linkText}
                  onPress={() => navigation.navigate('PrivacyPolicy')}
                >
                  Privacy Policy
                </Text>{' '}
                before proceeding.
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
                {agreed && (
                  <MaterialIcons name="check-outlined" size={14} color="#FFF" />
                )}
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
      {step !== 6 && <Footer />}
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

export default StudentSignup;
