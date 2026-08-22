import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  StyleSheet,
} from 'react-native';
import { CountryPicker } from 'react-native-country-codes-picker';
import { useState } from 'react';
import { Dropdown } from 'react-native-element-dropdown';
import { useNavigation } from '@react-navigation/native';
import SweetAlertModal from './alertscomponent';
import Toast from 'react-native-toast-message';
import { selectImage } from './SelectImage';
import { uploadToFirebase } from '../utils/CloudinaryPresetHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomButton } from '../assets/components/AppUIComponents';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { UserProfileCard } from './ProfileConfirmer';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
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
import { ProgressBar } from '../components/SignupComponents';
import { VerifiedStudent } from '../types/firebase';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

const StudentSignup = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const [step, setStep] = useState(0);

  const [country, setCountry] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const [institution, setInstitution] = useState('');

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
    <>
      <View style={styles.container}>
        <>
          <ProgressBar step={step} setStep={setStep} totalSteps={7} />
          <LogoBigger />

          <Text style={styles.mainHeader}>Student signup</Text>
          {/* STEP 0 — Select Country */}
          {step === 0 && (
            <Animated.View
              entering={FadeInRight.duration(400).springify()}
              exiting={FadeOutLeft}
              style={{ width: '100%' }}
            >
              <Text style={styles.inputHeader}>Select your country</Text>

              <TouchableOpacity
                onPress={() => setShowCountryPicker(true)}
                style={styles.selector}
              >
                <Text
                  style={[styles.selectorHeader2, country && { color: '#222' }]}
                >
                  {country || 'Select Country'}
                </Text>
                <MaterialIcons
                  name="chevron-right"
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
              <CustomButton
                title="Next"
                onPress={nextStep}
                disabled={!country}
                style={[
                  styles.nextButton,
                  {
                    backgroundColor: country
                      ? PRIMARY_COLOR
                      : PRIMARY_COLOR_TINT,
                  },
                ]}
              />
            </Animated.View>
          )}

          {/* STEP 1 — Select Institution */}
          {step === 1 && (
            <Animated.View
              entering={FadeInRight.duration(400).springify()}
              exiting={FadeOutLeft}
              style={{ width: '100%' }}
            >
              <Text style={styles.inputHeader}>Select Institution:</Text>
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
                style={styles.dropdown}
              />
              <CustomButton
                title="Next"
                onPress={async () => await checkICampusOperationalInSchool()}
                disabled={!institution}
                style={[
                  styles.nextButton,
                  {
                    backgroundColor: country
                      ? PRIMARY_COLOR
                      : PRIMARY_COLOR_TINT,
                  },
                ]}
              />
            </Animated.View>
          )}

          {/* STEP 2 — Matric Number */}
          {step === 2 && (
            <Animated.View
              entering={FadeInRight.duration(400).springify()}
              exiting={FadeOutLeft}
              style={{ width: '100%' }}
            >
              <Text style={styles.inputHeader}>
                Enter your Matriculation Number:
              </Text>
              <TextInput
                placeholder="Matric Number"
                placeholderTextColor={PRIMARY_COLOR_TINT}
                value={matric}
                onChangeText={setMatric}
                style={styles.input}
              />
              {studentNotFound && (
                <Text style={styles.errorText}>
                  Matriculation number not found.
                </Text>
              )}
              <CustomButton
                title={verifying ? 'Verifying...' : 'Verify'}
                onPress={verifyStudent}
                disabled={matric.length < 3 || verifying}
                style={[
                  styles.nextButton,
                  {
                    backgroundColor:
                      matric.length < 3 || verifying
                        ? PRIMARY_COLOR_TINT
                        : PRIMARY_COLOR,
                  },
                ]}
              />
            </Animated.View>
          )}
          {/* STEP 3 — Identity Confirmation */}
          {step === 3 && (
            <Animated.View
              entering={FadeInRight.duration(400).springify()}
              exiting={FadeOutLeft}
              style={{ width: '100%' }}
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
              <CustomButton
                title="Confirm"
                onPress={nextStep}
                style={[styles.nextButton]}
              />
            </Animated.View>
          )}

          {/* STEP 4 — Password */}
          {step === 4 && (
            <Animated.View
              entering={FadeInRight.duration(400).springify()}
              exiting={FadeOutLeft}
              style={{ width: '100%' }}
            >
              <Text style={styles.inputHeader}>
                Welcome {verifiedStudent?.firstname}, create your password:
              </Text>
              <View style={styles.passwordInput}>
                <TouchableOpacity
                  onPress={() => setShowPassword(prev => !prev)}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={PRIMARY_COLOR_TINT}
                    style={{ marginRight: 7 }}
                  />
                </TouchableOpacity>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor={PRIMARY_COLOR_TINT}
                  style={styles.input2}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
              <View style={styles.strengthBarContainer}>
                <View
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor: hasUppercase
                        ? PRIMARY_COLOR
                        : PRIMARY_COLOR_TINT,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor: hasLowercase
                        ? PRIMARY_COLOR
                        : PRIMARY_COLOR_TINT,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor: hasNumber
                        ? PRIMARY_COLOR
                        : PRIMARY_COLOR_TINT,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor: hasSymbol
                        ? PRIMARY_COLOR
                        : PRIMARY_COLOR_TINT,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor: hasMinLength ? '#f54b02' : '#929191',
                    },
                  ]}
                />
              </View>
              <View style={styles.passwordInput}>
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(prev => !prev)}
                >
                  <MaterialIcons
                    name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={PRIMARY_COLOR_TINT}
                    style={{ marginRight: 7 }}
                  />
                </TouchableOpacity>
                <TextInput
                  placeholder="Confirm Password"
                  placeholderTextColor={PRIMARY_COLOR_TINT}
                  style={styles.input2}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
              </View>
              {confirmPassword.length > 0 && confirmPassword !== password && (
                <Text style={styles.errorText}>Passwords do not match.</Text>
              )}
              <CustomButton
                title="Next"
                onPress={nextStep}
                disabled={
                  !isValidPassword(password) || confirmPassword !== password
                }
                style={[
                  styles.nextButton,
                  {
                    backgroundColor:
                      !isValidPassword(password) || confirmPassword !== password
                        ? PRIMARY_COLOR_TINT
                        : PRIMARY_COLOR,
                  },
                ]}
              />
            </Animated.View>
          )}

          {/* STEP 5 - Avatar upload (Can skip) */}
          {step === 5 && (
            <Animated.View
              entering={FadeInRight.duration(400).springify()}
              exiting={FadeOutLeft}
              style={{ width: '100%' }}
            >
              <Text style={styles.header}>Upload Profile Photo</Text>
              <View style={styles.avatarContainer}>
                <TouchableOpacity
                  onPress={handleImageUpdate}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatarWrapper}>
                    <Image
                      source={{
                        uri: avatar ? avatar : verifiedStudent?.schoolAvatarUrl,
                      }}
                      style={styles.avatarImage}
                    />
                    {/* The Camera Icon Overlay */}
                    <View style={styles.cameraIconBadge}>
                      <MaterialIcons
                        name="camera-alt"
                        size={20}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
              <CustomButton
                title="Change Photo"
                style={styles.nextButton}
                onPress={handleImageUpdate}
              />
              <TouchableOpacity style={styles.skipLink} onPress={nextStep}>
                <Text style={styles.skipLinkText}>
                  {hasUploadedAvatar ? 'Next' : 'Skip for now'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/*FINAL STEP - iCampus Terms and conditions*/}
          {step === 6 && (
            <>
              <Text style={styles.inputHeader}>Terms & Conditions</Text>

              {/* Scrollable Terms */}
              <ScrollView
                style={styles.termsBox}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.termsTitle}>Terms & Conditions</Text>

                <Text style={styles.termsDescription}>
                  By creating an iCampus account, you acknowledge and agree to
                  our framework guidelines:
                </Text>

                {[
                  'You confirm that all profile and academic information provided is accurate and authentic.',
                  'You agree not to misuse platform services, compromise security, or engage in fraudulent activity (including iCash wallet misuse).',
                  'You consent to receive automated notifications and critical updates related to your account activity.',
                  'You understand that violating platform terms or safety policies will result in immediate account restriction or suspension.',
                  'You agree to our data protection guidelines and privacy policy regarding digital records.',
                ].map((term, index) => (
                  <View key={index} style={styles.termItem}>
                    <Text style={styles.termBullet}>•</Text>
                    <Text style={styles.termText}>{term}</Text>
                  </View>
                ))}

                <Text style={styles.termsFooter}>
                  Please review our{' '}
                  <Text
                    style={styles.linkText}
                    onPress={() => navigation.navigate('TermsOfService')}
                  >
                    Terms of Service
                  </Text>{' '}
                  and{' '}
                  <Text
                    style={styles.linkText}
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                  >
                    Privacy Policy
                  </Text>{' '}
                  before proceeding.
                </Text>
              </ScrollView>

              {/* Agree Checkbox */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAgreed(prev => !prev)}
                activeOpacity={0.7}
              >
                {/* The Checkbox Box */}
                <View
                  style={[styles.checkbox, agreed && styles.checkboxChecked]}
                >
                  {agreed && (
                    <MaterialIcons name="check" size={14} color="#FFF" />
                  )}
                </View>

                {/* The Label */}
                <Text style={styles.checkboxLabel}>
                  I agree to the{' '}
                  <Text style={styles.linkText}>Terms & Conditions</Text>
                </Text>
              </TouchableOpacity>
              <CustomButton
                title={creating ? 'Creating Account...' : 'Finish'}
                onPress={handleSubmit}
                disabled={!agreed || creating}
                style={[
                  styles.nextButton,
                  {
                    backgroundColor:
                      agreed || creating ? PRIMARY_COLOR : PRIMARY_COLOR_TINT,
                  },
                ]}
              />
            </>
          )}
        </>
        {step !== 6 && (
          <View style={styles.footerDiv}>
            <Text style={[styles.footerDivText, { color: '#222' }]}>
              Aleady have an account?
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerDivText2}>Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    </>
  );
};
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    padding: 25,
    backgroundColor: '#fff',
    zIndex: 10,
    borderRadius: 15,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainHeader: {
    fontSize: 25,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    marginVertical: 25,
    alignSelf: 'center',
  },
  inputHeader: {
    fontSize: 14,
    color: '#222',
    fontWeight: 'bold',
    marginVertical: 12,
    width: '100%',
  },
  selector: {
    width: '100%',
    padding: 13,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectorHeader2: {
    fontSize: 14,
    color: PRIMARY_COLOR_TINT,
  },
  dropdown: {
    width: '100%',
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 13,
    color: '#222',
    fontSize: 14,
  },
  nextButton: {
    flex: 1,
    paddingHorizontal: 15,
    marginTop: 30,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#222',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    color: PRIMARY_COLOR,
    width: '100%',
  },
  passwordInput: {
    width: '100%',
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    height: 60,
  },
  input2: {
    flex: 1,
    fontSize: 14,
    color: '#222',
    backgroundColor: 'transparent',
  },
  strengthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    marginHorizontal: 5,
    width: '100%',
    alignSelf: 'flex-start',
  },
  strengthSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  header: {
    fontSize: 22,
    color: '#222',
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  avatarWrapper: {
    position: 'relative',
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderStyle: 'dashed',
    borderRadius: 75,
    padding: 5,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: PRIMARY_COLOR,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4, // Shadow for Android
    shadowColor: PRIMARY_COLOR_TINT, // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  skipLink: {
    marginTop: 10,
    alignItems: 'center',
  },
  skipLinkText: {
    color: PRIMARY_COLOR,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  termsBox: {
    height: 160,
    width: '100%',
    padding: 10,
    borderWidth: 0.7,
    borderColor: PRIMARY_COLOR_TINT,
    marginVertical: 10,
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginBottom: 9,
  },
  termsDescription: {
    fontSize: 12,
    color: '#333',
    marginBottom: 10,
    lineHeight: 18,
  },
  termsText: {
    color: '#222',
    fontSize: 14,
    paddingBottom: 30,
    lineHeight: 30,
  },
  termItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 4,
  },
  termBullet: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginRight: 6,
  },
  termText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
    flex: 1,
  },
  termsFooter: {
    fontSize: 12,
    color: '#333',
    marginTop: 10,
    fontStyle: 'italic',
  },
  linkText: {
    color: PRIMARY_COLOR,
    textDecorationLine: 'underline',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15, // Better spacing for modern UI
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 22, // Slightly larger for better tap targets
    height: 22,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderRadius: 6, // Slightly more rounded for a modern look
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10, // Space between box and text
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: PRIMARY_COLOR,
  },
  checkboxLabel: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500', // Medium weight feels cleaner
  },
  footerDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 30,
  },
  footerDivText: {
    fontSize: 14,
    marginRight: 4,
  },
  footerDivText2: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
export default StudentSignup;