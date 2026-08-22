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
import { useEffect, useState } from 'react';
import { IconOutline } from '@ant-design/icons-react-native';
import { useNavigation } from '@react-navigation/native';
import SweetAlertModal from './alertscomponent';
import Toast from 'react-native-toast-message';
import { selectImage } from './SelectImage';
import { uploadToFirebase } from '../utils/CloudinaryPresetHelper';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { WEB_CLIENT_ID } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { setUser } from '../context/UserSlice';
import { ProgressBar } from './SignupComponents';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CustomButton } from '../assets/components/AppUIComponents';
import {
  isValidEmail,
  isValidPassword,
  getPasswordRequirements,
  isValidWebsite,
} from '../utils/SignupHelpers';
import { authorize } from 'react-native-app-auth';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '@env';
import DeviceInfo from 'react-native-device-info';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { formatSignupTime } from '../utils/ChatTimestampFormatter';
import {
  verifySignupEmail,
  verifySignupEmailCode,
  handleRegisterUser,
} from '../api/localPostApis';
import { ImageConfirmationModal } from './ImageConfirmationModal';

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  offlineAccess: true,
});
export const githubConfig = {
  issuer: 'https://github.com',
  clientId: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  redirectUrl: 'iCampus://oauth',
  scopes: ['read:user', 'user:email'],
};

const OtherUserSignup = () => {
  const [subType, setSubType] = useState<'individual' | 'enterprise' | null>(
    null,
  );
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [country, setCountry] = useState('');
  const [isSocialSignup, setIsSocialSignup] = useState(false);

  const [_verifiedEmail, setVerifiedEmail] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [website, setWebsite] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [timer, setTimer] = useState(900);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [hasUploadedAvatar, setHasUploadedAvatar] = useState(false);
  const [creating, setCreating] = useState(false);

  const [emailCode, setEmailCode] = useState('');

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [idToken, setIdToken] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>(
    'success',
  );
  const [alertMessage, setAlertMessage] = useState('');
  // Add this near your other useState hooks
  const [socialProvider, setSocialProvider] = useState<
    'google' | 'github' | 'password'
  >('password');

  const nextStep = () => setStep(prev => Math.min(prev + 1, 8));
  //const prevStep = () => setStep(prev => Math.max(prev - 1, 0));
  const { hasUppercase, hasLowercase, hasNumber, hasSymbol, hasMinLength } =
    getPasswordRequirements(password);

  const isProfessionalEmail = (em: string) => {
    const forbiddenDomains = [
      'gmail.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
    ];
    const domain = em.split('@')[1]?.toLowerCase();
    return domain && !forbiddenDomains.includes(domain);
  };
  const canProceed = isValidEmail(email) && isProfessionalEmail(email);
  const verifyEmail = async () => {
    let message;
    try {
      const response = await verifySignupEmail(email);
      if (response.success) {
        nextStep();
      } else {
        message =
          response.message || 'Email verification failed, please retry.';
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
        nextStep();
        setVerifiedEmail(true);
      } else {
        message = response.message || 'Invalid or expired verification code';
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
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceName = DeviceInfo.getModel();
      const brand = DeviceInfo.getBrand();
      const registrationData = {
        currentIScore: 5,
        usertype: subType === 'enterprise' ? 'enterprise' : 'otherUser',
        firstname: subType === 'enterprise' ? '' : firstname,
        lastname: subType === 'enterprise' ? '' : lastname,
        email: email.toLowerCase().trim(),
        deviceId,
        deviceName: `${brand} ${deviceName}`,
        password: isSocialSignup ? 'SOCIAL_AUTH' : password,
        providerId: isSocialSignup ? socialProvider : 'password',
        idToken,
        isSocialSignup,
        country: country || '',
        organizationName: subType === 'enterprise' ? orgName : '',
        website: subType === 'enterprise' ? website : '',
        jobTitle: subType === 'enterprise' ? jobTitle : '',
        createdAt: new Date().toISOString(),
        profilePic: [avatar || ''],
      };
      const response = await handleRegisterUser(registrationData);
      if (response.status === 409) {
        setCreating(false);
        setAlertType('error');
        setAlertMessage(
          response.message || 'User or Enterprise already exists.',
        );
        setAlertVisible(true);
        return;
      }
      if (response.success) {
        setAlertType('success');
        const message =
          subType === 'enterprise'
            ? 'Enterprise account created successfully!'
            : 'Account created successfully!';
        setAlertMessage(message);
        const { accessToken, refreshToken, user: newUser } = response;
        await AsyncStorage.setItem('hasLaunched', 'true');
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);
        await AsyncStorage.setItem('user', JSON.stringify(newUser));

        dispatch(
          setUser({
            ...newUser,
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
  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      if (provider === 'google') {
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();
        const user = response.data?.user;
        const token = response.data?.idToken;
        if (user && token) {
          setIdToken(token);
          setFirstname(user.givenName || '');
          setLastname(user.familyName || '');
          setEmail(user.email || '');
          setAvatar(user.photo || null);
          setIsSocialSignup(true);
          setSocialProvider('google');
          setStep(3);
        }
      } else if (provider === 'github') {
        const authState = await authorize(githubConfig);
        const userResponse = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${authState.accessToken}` },
        });
        const githubUser = await userResponse.json();

        // Email Fetch
        const emailResponse = await fetch(
          'https://api.github.com/user/emails',
          {
            headers: { Authorization: `Bearer ${authState.accessToken}` },
          },
        );
        const emails = await emailResponse.json();

        const primaryEmail = Array.isArray(emails)
          ? emails.find((e: any) => e.primary)?.email || emails[0]?.email
          : githubUser.email;

        if (githubUser) {
          const fullName = githubUser.name || githubUser.login || '';
          const nameParts = fullName.trim().split(/\s+/);
          const socialPayload = {
            email: primaryEmail,
            firstname: nameParts[0] || '',
            lastname: nameParts.slice(1).join(' ') || '',
            providerId: 'github',
            providerUserId: githubUser.id.toString(), // Save this in your DB!
            accessToken: authState.accessToken, // Send this to verify on backend
            avatar: githubUser.avatar_url,
          };
          setAvatar(socialPayload.avatar || null);
          setIsSocialSignup(true);
          setSocialProvider('github');
          setFirstname(socialPayload.firstname);
          setLastname(socialPayload.lastname);
          setEmail(socialPayload.email);
          setIdToken(socialPayload.accessToken);
          setStep(3);
        }
      }
    } catch (error: any) {
      // Standardize error checking across different auth providers
      const isCancelled =
        error.message?.includes('cancel') ||
        error.code === 'RNAppAuthError' ||
        error.code === 'SIGN_IN_CANCELLED';

      if (isCancelled) return;

      console.error(`${provider} Auth Error:`, error);
      setAlertMessage(`Could not connect to ${provider}. Please try again.`);
      setAlertType('error');
      setAlertVisible(true);
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
    <>
      <View style={styles.container}>
        <>
          <ProgressBar step={step} setStep={setStep} totalSteps={6} />

          <Text style={styles.mainHeader}>Signup</Text>

          {step === 0 && !subType && (
            <View style={styles.selectionContainer}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => {
                  setSubType('individual');
                  setStep(1);
                }}
              >
                <MaterialIcons name="person" size={40} color={PRIMARY_COLOR} />
                <Text style={styles.cardTitle}>Individual User</Text>
                <Text style={styles.cardSub}>
                  {' '}
                  Guest or independent learners.
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.card}
                onPress={() => {
                  setSubType('enterprise');
                  setStep(1);
                }}
              >
                <MaterialIcons
                  name="business"
                  size={40}
                  color={PRIMARY_COLOR}
                />
                <Text style={styles.cardTitle}>Organization</Text>
                <Text style={styles.cardSub}>
                  Institutions, schools, or corporate partners.
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={{ color: PRIMARY_COLOR, marginTop: 10 }}>
                  Go Back
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 1 — Credentials (Email & Password) */}
          {subType === 'individual' && step === 1 && (
            <Animated.View
              entering={FadeInRight.duration(400).springify()}
              exiting={FadeOutLeft}
              style={{ width: '100%' }}
            >
              <Text style={styles.inputHeader}>Create your account</Text>
              <View style={styles.passwordInput}>
                <MaterialIcons
                  name="email"
                  size={20}
                  color={PRIMARY_COLOR_TINT}
                  style={{ marginRight: 7 }}
                />

                <TextInput
                  placeholder="Enter your email..."
                  placeholderTextColor={PRIMARY_COLOR_TINT}
                  style={styles.input2}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {!isValidEmail(email) && email.length > 0 && (
                <Text style={styles.errorText}>Invalid Email</Text>
              )}
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
                  placeholder="Enter your password..."
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
                      backgroundColor: hasUppercase ? PRIMARY_COLOR : '#929191',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor: hasLowercase ? PRIMARY_COLOR : '#929191',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor: hasNumber ? PRIMARY_COLOR : '#929191',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor: hasSymbol ? PRIMARY_COLOR : '#929191',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor: hasMinLength ? PRIMARY_COLOR : '#929191',
                    },
                  ]}
                />
              </View>
              <CustomButton
                title="Next"
                onPress={verifyEmail}
                disabled={!isValidEmail(email) || !isValidPassword(password)}
                style={[
                  styles.nextButton4,
                  {
                    backgroundColor:
                      !isValidEmail(email) || !isValidPassword(password)
                        ? PRIMARY_COLOR_TINT
                        : PRIMARY_COLOR,
                  },
                ]}
              />
              {/* The "OR" Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtonRow}>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialLogin('google')}
                >
                  <IconOutline name="google" size={24} color={PRIMARY_COLOR} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialLogin('github')}
                >
                  <IconOutline name="github" size={24} color={PRIMARY_COLOR} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* STEP 2 — Confirm Email */}
          {subType === 'individual' && step === 2 && (
            <Animated.View
              entering={FadeInRight.duration(400).springify()}
              exiting={FadeOutLeft}
              style={{ width: '100%' }}
            >
              <Text style={styles.inputHeader}>Confirm Your Email</Text>
              <Text style={styles.inputHeader2}>
                Enter the 6‑digit verification code that has been sent to:{' '}
                {email}
              </Text>
              {/* Code Input */}
              <TextInput
                placeholder="Enter 6‑digit code"
                placeholderTextColor={PRIMARY_COLOR_TINT}
                value={emailCode}
                onChangeText={setEmailCode}
                maxLength={6}
                style={styles.input}
              />
              <View style={styles.rowDiv2}>
                <Text style={styles.rowDivText}>
                  Code expires in {formatSignupTime(timer)}
                </Text>
                {/* Resend Code Button */}
                <TouchableOpacity onPress={resendCode}>
                  <Text style={styles.rowDivBtn}>Resend Code?</Text>
                </TouchableOpacity>
              </View>
              {/* NEXT BUTTON — only appears when code is 6 digits */}
              {emailCode.length === 6 && (
                <CustomButton
                  title={verifying ? 'Verifying...' : 'Verify'}
                  disabled={verifying}
                  onPress={verifyCode}
                  style={styles.nextButton}
                />
              )}
            </Animated.View>
          )}

          {/* STEP 3 — Personal Details (New Step) */}
          {subType === 'individual' && step === 3 && (
            <Animated.View
              entering={FadeInRight.duration(400).springify()}
              exiting={FadeOutLeft}
              style={{ width: '100%' }}
            >
              <Text style={styles.inputHeader}>
                {isSocialSignup ? 'Confirm your details' : 'Tell us your name'}
              </Text>
              <TextInput
                placeholder="First Name"
                value={firstname}
                placeholderTextColor={PRIMARY_COLOR_TINT}
                onChangeText={setFirstname}
                style={styles.input}
                editable={!isSocialSignup}
              />
              <TextInput
                placeholder="Last Name"
                value={lastname}
                placeholderTextColor={PRIMARY_COLOR_TINT}
                onChangeText={setLastname}
                style={[styles.input, { marginTop: 15 }]}
                editable={!isSocialSignup}
              />
              <Text style={styles.inputHeader}>Nationality</Text>
              <TouchableOpacity
                onPress={() => setShowCountryPicker(true)}
                style={styles.selector}
              >
                <Text style={styles.selectorHeader2}>
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
                }}
              />
              <CustomButton
                  title='Next'
                  onPress={nextStep}
                  disabled={!country || !firstname || !lastname}
                  style={[
                    styles.nextButton,
                    {
                      backgroundColor:
                        country && firstname && lastname
                          ? PRIMARY_COLOR
                          : PRIMARY_COLOR_TINT,
                    },
                  ]}
                />
            </Animated.View>
          )}

          {/* STEP 4 - Avatar upload (Can skip) */}
          {subType === 'individual' && step === 4 && (
            <Animated.View
              entering={FadeInRight.duration(400).springify()}
              exiting={FadeOutLeft}
              style={{ width: '100%' }}
            >
              <Text style={styles.header}>Upload Profile Photo</Text>

              {/* Main Container for the Avatar and Icon Overlay */}
              <View style={styles.avatarContainer}>
                <TouchableOpacity
                  onPress={handleImageUpdate}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatarWrapper}>
                    {avatar ? (
                      <Image
                        source={{ uri: avatar }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <MaterialIcons
                        name="account-circle"
                        size={120}
                        color={PRIMARY_COLOR}
                      />
                    )}

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

              {/* Primary Action Button */}
              <CustomButton
                  title={hasUploadedAvatar ? 'Change Photo' : 'Upload Photo'}
                  onPress={handleImageUpdate}
                  disabled={!country || !firstname || !lastname}
                  style={[
                    styles.nextButton
                  ]}
                />

              {/* Secondary Skip Action */}
              <TouchableOpacity style={styles.skipLink} onPress={nextStep}>
                <Text style={styles.skipLinkText}>
                  {hasUploadedAvatar ? 'Next' : 'Skip for now'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/*FINAL STEP - iCampus Terms and conditions*/}
          {subType === 'individual' && step === 5 && (
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

              {/* Next Button */}
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

          {/* ENTERPRISE STEP 0: Organization Identity */}
          {step === 1 && subType === 'enterprise' && (
            <Animated.View
              entering={FadeInRight.duration(400).springify()}
              exiting={FadeOutLeft}
              style={{ width: '100%' }}
            >
              <Text style={styles.inputHeader}>
                Create Organization Account
              </Text>
              <TextInput
                placeholder="Legal Organization Name"
                placeholderTextColor={PRIMARY_COLOR_TINT}
                style={[styles.input, { marginBottom: 15 }]}
                value={orgName}
                onChangeText={setOrgName}
              />
              <TextInput
                placeholder="Official Website (e.g. www.school.com)"
                placeholderTextColor={PRIMARY_COLOR_TINT}
                style={styles.input}
                value={website}
                onChangeText={setWebsite}
              />
              <CustomButton
                title='Next'
                onPress={nextStep}
                disabled={!orgName || isValidWebsite(website) === false}
                style={[
                  styles.nextButton,
                  {
                    backgroundColor:
                      orgName && website ? PRIMARY_COLOR : PRIMARY_COLOR_TINT,
                  },
                ]}
              />
            </Animated.View>
          )}

          {/* ENTERPRISE STEP 1: Representative Identity */}
          {step === 2 && subType === 'enterprise' && (
            <Animated.View
              entering={FadeInRight.duration(400).springify()}
              exiting={FadeOutLeft}
              style={{ width: '100%' }}
            >
              <Text style={styles.inputHeader}>Authorized Representative</Text>
              <TextInput
                placeholder="Your Full Name"
                placeholderTextColor={PRIMARY_COLOR_TINT}
                style={[styles.input, { marginBottom: 15 }]}
                value={firstname}
                onChangeText={setFirstname}
              />
              <TextInput
                placeholder="Job Title (e.g. IT Admin, Principal)"
                placeholderTextColor={PRIMARY_COLOR_TINT}
                style={styles.input}
                value={jobTitle}
                onChangeText={setJobTitle}
              />
              <CustomButton
                title='Next'
                onPress={nextStep}
                disabled={!firstname || !jobTitle}
                style={[
                  styles.nextButton,
                  {
                    backgroundColor:
                      firstname && jobTitle
                        ? PRIMARY_COLOR
                        : PRIMARY_COLOR_TINT,
                  },
                ]}
              />
            </Animated.View>
          )}

          {/* ENTERPRISE STEP 2: Account Credentials */}
          {step === 3 && subType === 'enterprise' && (
            <Animated.View
              entering={FadeInRight.duration(400).springify()}
              exiting={FadeOutLeft}
              style={{ width: '100%' }}
            >
              <Text style={styles.inputHeader}>Login Credentials</Text>
              <TextInput
                placeholder="Official Business Email"
                placeholderTextColor={PRIMARY_COLOR_TINT}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
              <CustomButton
                title='Verify Email'
                onPress={verifyEmail} // Use your existing verification logic
                disabled={
                  !isValidEmail(email) ||
                  !isProfessionalEmail(email) ||
                  !canProceed
                }
                style={[
                  styles.nextButton,
                  {
                    backgroundColor: canProceed
                      ? PRIMARY_COLOR
                      : PRIMARY_COLOR_TINT,
                  },
                ]}
              />
            </Animated.View>
          )}
          {subType === 'enterprise' && step === 4 && (
            <Animated.View
              entering={FadeInRight.duration(400).springify()}
              exiting={FadeOutLeft}
              style={{ width: '100%' }}
            >
              <Text style={styles.inputHeader}>Verify Organization Email</Text>
              <Text style={styles.inputHeader2}>
                Enter the 6‑digit verification code that has been sent to:{' '}
                {email}
              </Text>
              <TextInput
                placeholder="6‑digit code"
                value={emailCode}
                onChangeText={setEmailCode}
                maxLength={6}
                style={styles.input}
              />
              <View style={styles.rowDiv2}>
                <Text style={styles.rowDivText}>
                  Code expires in {formatSignupTime(timer)}
                </Text>
                {/* Resend Code Button */}
                <TouchableOpacity onPress={resendCode}>
                  <Text style={styles.rowDivBtn}>Resend Code?</Text>
                </TouchableOpacity>
              </View>
              {emailCode.length === 6 && (
                <CustomButton
                title='Verify & Continue'
                style={[
                    styles.nextButton
                  ]}
                  onPress={verifyCode}
              />
              )}
            </Animated.View>
          )}
          {subType === 'enterprise' && step === 5 && (
            <>
              <Text style={styles.inputHeader}>Organization Agreement</Text>
              <ScrollView style={styles.termsBox}>
                <Text style={styles.termsText}>
                  By registering {orgName}, you agree to our Enterprise Service
                  Level Agreement...
                </Text>
              </ScrollView>
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
                title={creating ? 'Creating Account...' : 'Complete Signup'}
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
        {step !== 5 && (
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
    marginBottom: 15,
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
    marginTop: 20,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  input: {
    height: 60,
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#222',
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    paddingHorizontal: 10,
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
    marginHorizontal: 5,
    width: '90%',
    alignSelf: 'flex-start',
    marginVertical: 15,
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
  selectionContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    elevation: 3,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardSelected: {
    borderColor: PRIMARY_COLOR,
    borderWidth: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 10,
  },
  cardSub: {
    fontSize: 14,
    color: '#222',
    textAlign: 'center',
    marginTop: 5,
  },
  nextButton4: {
    flex: 1,
    paddingHorizontal: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: PRIMARY_COLOR_TINT,
  },
  dividerText: {
    marginHorizontal: 10,
    color: PRIMARY_COLOR_TINT,
    fontSize: 14,
  },
  inputHeader2: {
    fontSize: 12,
    color: '#222',
    marginBottom: 15,
  },
  rowDiv2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  rowDivText: {
    color: PRIMARY_COLOR_TINT,
    fontSize: 12,
  },
  rowDivBtn: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: '800',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 10,
  },
  socialButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
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
export default OtherUserSignup;