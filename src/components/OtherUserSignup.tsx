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
import { CountryPicker } from 'react-native-country-codes-picker';
import { useEffect, useState } from 'react';
import { baseUrl } from './HomeScreenComponents';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import SweetAlertModal from './alertscomponent';
import Toast from 'react-native-toast-message';
import toastConfig from './ToastConfig';
import { selectImage } from './SelectImage';
import { uploadImageToCloudinary } from './HomeScreenComponents';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { WEB_CLIENT_ID } from '@env';
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
  Footer,
  isValidEmail,
  isValidPassword,
  getPasswordRequirements,
  generateId2,
} from './StudentSignup';
import { authorize } from 'react-native-app-auth';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '@env';

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  offlineAccess: true,
});
const githubConfig = {
  issuer: 'https://github.com',
  clientId: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET, // In prod, keep this on backend!
  redirectUrl: 'iCampus://oauth', // This MUST match your GitHub App settings
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
  const { height } = Dimensions.get('window');
  const [ipAddress, setIpAddress] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [country, setCountry] = useState('');
  const [isSocialSignup, setIsSocialSignup] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [verifiedEmail, setVerifiedEmail] = useState(false);
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
  const isProfessionalEmail = (email: string) => {
    const forbiddenDomains = [
      'gmail.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    return domain && !forbiddenDomains.includes(domain);
  };

  // Use it like this:
  const canProceed = isValidEmail(email) && isProfessionalEmail(email);
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
        nextStep();
        setVerifiedEmail(true);
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
  const handleSubmit = async () => {
    setCreating(true);
    try {
      await fetchIP();
      const deviceType = DeviceInfo.getDeviceType();

      // Build the user object dynamically
      const registrationData = {
        uid: generateId2(),
        deviceType: [deviceType],
        iScore: subType === 'enterprise' ? '' : '5', // Enterprises start with 1000 iScore
        ipAddress: [ipAddress],
        hasSubscribed: false,
        usertype: subType === 'enterprise' ? 'enterprise' : 'otherUser',
        firstname,
        lastname: subType === 'enterprise' ? '' : lastname, // Or use rep name
        email,
        password: isSocialSignup ? 'SOCIAL_AUTH' : password,
        country: country || '',
        organizationName: subType === 'enterprise' ? orgName : '',
        website: subType === 'enterprise' ? website : '',
        jobTitle: subType === 'enterprise' ? jobTitle : '',
        createdAt: new Date().toISOString(),
        profilePic: [avatar || ''],
      };

      const response = await fetch(`${baseUrl}users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();

      if (response.status === 409) {
        setCreating(false);
        setAlertType('error');
        setAlertMessage(result.message || 'User or Enterprise already exists.');
        setAlertVisible(true);
        return;
      }
      if (response.ok) {
        setAlertType('success');
        const message =
          subType === 'enterprise'
            ? 'Enterprise account created successfully!'
            : 'Account created successfully!';
        setAlertMessage(message);
        // result should contain: { message, user, accessToken, refreshToken }
        const { accessToken, refreshToken, user: newUser } = result;

        // Save locally
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
        navigation.navigate('Home');
      } else {
        console.warn('Signup failed:', result.message);
        setAlertType('error');
        setAlertMessage(result.message || 'Account creation failed.');
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
  const handleSocialLogin = async (provider: 'Google' | 'Github') => {
    try {
      if (provider === 'Google') {
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();
        const user = response.data?.user;

        if (user) {
          setFirstname(user.givenName || '');
          setLastname(user.familyName || '');
          setEmail(user.email || '');
          setAvatar(user.photo || null);
          setIsSocialSignup(true);
          setStep(3); // Skip straight to Nationality
        }
      } else if (provider === 'Github') {
        // 2. Start the OAuth flow
        const authState = await authorize(githubConfig);
        // 3. Fetch User Profile using the Access Token
        const userResponse = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${authState.accessToken}` },
        });
        const githubUser = await userResponse.json();
        // 4. Fetch User Email (GitHub often returns null email in the main profile)
        const emailResponse = await fetch(
          'https://api.github.com/user/emails',
          {
            headers: { Authorization: `Bearer ${authState.accessToken}` },
          },
        );
        const emails = await emailResponse.json();
        const primaryEmail =
          emails.find((e: any) => e.primary)?.email || emails[0]?.email;
        if (githubUser) {
          const fullName = githubUser.name || githubUser.login;
          const nameParts = fullName.trim().split(/\s+/);
          setFirstname(nameParts[0] || '');
          setLastname(nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
          setEmail(primaryEmail || '');
          setAvatar(githubUser.avatar_url || null);
          setIsSocialSignup(true);
          setStep(3);
        }
      }
    } catch (error: any) {
      console.error(`${provider} Auth Error:`, error);
      if (error.code === 'auth/user-cancelled') return;
      if (error.code !== 'auth/user-cancelled') {
        setAlertMessage(`${provider} signup failed. Please try again.`);
        setAlertType('error');
        setAlertVisible(true);
      }
    }
  };
  // Check if website has a dot and at least two characters after it
  const isValidWebsite = (url: string) => {
    const websiteRegex = /\.[a-z]{2,}$/i;
    return websiteRegex.test(url.trim());
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
        <ProgressBar step={step} setStep={setStep} totalSteps={6} />
        <LogoBigger />
        {step === 0 && !subType && (
          <View style={StudentSignupStyles.selectionContainer}>
            <TouchableOpacity
              style={StudentSignupStyles.card}
              onPress={() => {
                setSubType('individual');
                setStep(1); // Start the OtherUserSignup flow you already built
              }}
            >
              <Icon name="person-outline" size={40} color="#f54b02" />
              <Text style={StudentSignupStyles.cardTitle}>Individual User</Text>
              <Text style={StudentSignupStyles.cardSub}>
                {' '}
                Guest or independent learners.
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={StudentSignupStyles.card}
              onPress={() => {
                setSubType('enterprise');
                setStep(1); // This will lead to the Organization form
              }}
            >
              <Icon name="business-outline" size={40} color="#f54b02" />
              <Text style={StudentSignupStyles.cardTitle}>Organization</Text>
              <Text style={StudentSignupStyles.cardSub}>
                Institutions, schools, or corporate partners.
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={{ color: '#f54b02', marginTop: 10 }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 1 — Credentials (Email & Password) */}
        {subType === 'individual' && step === 1 && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Create your account
            </Text>
            <TextInput
              placeholder="Email"
              placeholderTextColor="#929191"
              value={email}
              onChangeText={setEmail}
              style={StudentSignupStyles.input}
            />
            <View
              style={[StudentSignupStyles.passwordInput, { marginTop: 15 }]}
            >
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
            <Text style={StudentSignupStyles.errorText}>
              {!isValidEmail(email) && email.length > 0
                ? 'Invalid email format'
                : ''}
            </Text>
            <TouchableOpacity
              onPress={verifyEmail}
              disabled={!isValidEmail(email) || !isValidPassword(password)}
              style={[
                StudentSignupStyles.nextButton4,
                {
                  backgroundColor:
                    !isValidEmail(email) || !isValidPassword(password)
                      ? '#fa9265'
                      : '#f54b02',
                },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
            </TouchableOpacity>
            {/* The "OR" Divider */}
            <View style={StudentSignupStyles.dividerContainer}>
              <View style={StudentSignupStyles.dividerLine} />
              <Text style={StudentSignupStyles.dividerText}>or</Text>
              <View style={StudentSignupStyles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={StudentSignupStyles.socialContainer}>
              <TouchableOpacity
                style={StudentSignupStyles.socialButton}
                onPress={() => handleSocialLogin('Google')}
              >
                <Icon name="logo-google" size={20} color="#DB4437" />
                <Text style={StudentSignupStyles.socialButtonText}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={StudentSignupStyles.socialButton}
                onPress={() => handleSocialLogin('Github')}
              >
                <Icon name="logo-github" size={20} color="#333" />
                <Text style={StudentSignupStyles.socialButtonText}>
                  Continue with Github
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* STEP 2 — Confirm Email */}
        {subType === 'individual' && step === 2 && (
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
                disabled={verifying}
                onPress={verifyCode}
              >
                <Text style={StudentSignupStyles.nextButtonText}>
                  {verifying ? 'Verifying...' : 'Verify'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* STEP 3 — Personal Details (New Step) */}
        {subType === 'individual' && step === 3 && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              {isSocialSignup ? 'Confirm your details' : 'Tell us your name'}
            </Text>
            <TextInput
              placeholder="First Name"
              value={firstname}
              placeholderTextColor="#929191"
              onChangeText={setFirstname}
              style={StudentSignupStyles.input}
            />
            <TextInput
              placeholder="Last Name"
              value={lastname}
              placeholderTextColor="#929191"
              onChangeText={setLastname}
              style={[StudentSignupStyles.input, { marginTop: 15 }]}
            />
            <Text style={StudentSignupStyles.inputHeader}>Nationality</Text>
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

            <TouchableOpacity
              onPress={nextStep}
              disabled={!country || !firstname || !lastname}
              style={[
                StudentSignupStyles.nextButton,
                {
                  backgroundColor:
                    country && firstname && lastname ? '#f54b02' : '#fa9265',
                },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 4 - Avatar upload (Can skip) */}
        {subType === 'individual' && step === 4 && (
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
        {subType === 'individual' && step === 5 && (
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

        {/* ENTERPRISE STEP 0: Organization Identity */}
        {step === 1 && subType === 'enterprise' && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Create Organization Account
            </Text>
            <TextInput
              placeholder="Legal Organization Name"
              placeholderTextColor="#929191"
              style={[StudentSignupStyles.input, { marginBottom: 15 }]}
              value={orgName}
              onChangeText={setOrgName}
            />
            <TextInput
              placeholder="Official Website (e.g. www.school.com)"
              placeholderTextColor="#929191"
              style={StudentSignupStyles.input}
              value={website}
              onChangeText={setWebsite}
            />
            <TouchableOpacity
              onPress={nextStep}
              disabled={!orgName || isValidWebsite(website) === false}
              style={[
                StudentSignupStyles.nextButton,
                { backgroundColor: orgName && website ? '#f54b02' : '#fa9265' },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ENTERPRISE STEP 1: Representative Identity */}
        {step === 2 && subType === 'enterprise' && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Authorized Representative
            </Text>
            <TextInput
              placeholder="Your Full Name"
              placeholderTextColor="#929191"
              style={[StudentSignupStyles.input, { marginBottom: 15 }]}
              value={firstname}
              onChangeText={setFirstname}
            />
            <TextInput
              placeholder="Job Title (e.g. IT Admin, Principal)"
              placeholderTextColor="#929191"
              style={StudentSignupStyles.input}
              value={jobTitle}
              onChangeText={setJobTitle}
            />
            <TouchableOpacity
              onPress={nextStep}
              disabled={!firstname || !jobTitle}
              style={[
                StudentSignupStyles.nextButton,
                {
                  backgroundColor:
                    firstname && jobTitle ? '#f54b02' : '#fa9265',
                },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ENTERPRISE STEP 2: Account Credentials */}
        {step === 3 && subType === 'enterprise' && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Login Credentials
            </Text>
            <TextInput
              placeholder="Official Business Email"
              placeholderTextColor="#929191"
              style={StudentSignupStyles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            {/* Use your existing Password input logic here */}
            <TouchableOpacity
              onPress={verifyEmail} // Use your existing verification logic
              disabled={
                !isValidEmail(email) ||
                !isProfessionalEmail(email) ||
                !canProceed
              }
              style={[
                StudentSignupStyles.nextButton,
                {
                  backgroundColor: canProceed ? '#f54b02' : '#fa9265',
                },
              ]}
            >
              <Text style={StudentSignupStyles.nextButtonText}>
                Verify Email
              </Text>
            </TouchableOpacity>
          </>
        )}
        {subType === 'enterprise' && step === 4 && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Verify Organization Email
            </Text>
            <Text style={StudentSignupStyles.inputHeader2}>
              Enter the 6‑digit verification code that has been sent to: {email}
            </Text>
            <TextInput
              placeholder="6‑digit code"
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
            {emailCode.length === 6 && (
              <TouchableOpacity
                style={[
                  StudentSignupStyles.nextButton,
                  { backgroundColor: '#f54b02' },
                ]}
                onPress={verifyCode}
              >
                <Text style={StudentSignupStyles.nextButtonText}>
                  Verify & Continue
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
        {subType === 'enterprise' && step === 5 && (
          <>
            <Text style={StudentSignupStyles.inputHeader}>
              Organization Agreement
            </Text>
            <ScrollView style={StudentSignupStyles.termsBox}>
              <Text style={StudentSignupStyles.termsText}>
                By registering {orgName}, you agree to our Enterprise Service
                Level Agreement...
              </Text>
            </ScrollView>
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
                {creating ? 'Creating Account...' : 'Complete Signup'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </>
      {step !== 5 && <Footer />}
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


export default OtherUserSignup;
