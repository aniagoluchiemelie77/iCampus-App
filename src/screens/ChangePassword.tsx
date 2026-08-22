import React, { useState, useRef, useEffect } from 'react';
import {
  Platform,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Pressable,
} from 'react-native';
import SweetAlertModal from '../components/alertscomponent';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { changePassword } from '../api/localPostApis';
import { IconBackground } from '../assets/styles/BackgroundIconPattern';
import { isValidPassword } from '../utils/SignupHelpers';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../assets/components/AppUIComponents';

type ChangePasswordParams = {
  email: string;
};

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ChangePasswordScreen() {
  const { colors } = useTheme();
  const route =
    useRoute<RouteProp<{ params: ChangePasswordParams }, 'params'>>();
  const navigation = useNavigation<any>();
  const email = route.params?.email || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>(
    'success',
  );
  const [alertMessage, setAlertMessage] = useState('');
  const [isVerifying, setVerifying] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChangePassword = async () => {
    if (!password.trim() || !confirmPassword.trim()) {
      setAlertType('warning');
      setAlertMessage('Please fill in all security parameter fields.');
      setAlertVisible(true);
      return;
    }

    if (!isValidPassword(password)) {
      setAlertType('warning');
      setAlertMessage(
        'Password parameters fail to fulfill global security constraints.',
      );
      setAlertVisible(true);
      return;
    }

    try {
      setVerifying(true);
      const response = await changePassword(email, password, confirmPassword);

      if (response && response.success) {
        setAlertType('success');
        setAlertMessage(
          'Password updated successfully. Redirecting to login context...',
        );
        setAlertVisible(true);
        timeoutRef.current = setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }, 2500);
      } else {
        setAlertType('error');
        setAlertMessage(
          response?.message || 'Upstream identity validation rejected update.',
        );
        setAlertVisible(true);
      }
    } catch (err: any) {
      setAlertType('error');
      setAlertMessage(
        err.message || 'Password reset attempt unsuccessful. Try again.',
      );
      setAlertVisible(true);
    } finally {
      setVerifying(false);
    }
  };
  const isFormValid =
    isValidPassword(password) && confirmPassword === password && !isVerifying;

  return (
    <SafeAreaView style={styles.safeArea}>
      <IconBackground />
      <KeyboardAvoidingView
        style={styles.bkg}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.cardContainer}>
            <MaterialIcons
              name="lock-outline"
              size={60}
              color={PRIMARY_COLOR}
            />
            <Text style={styles.mainHeader}>Change Password</Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Enter your New Password:
            </Text>
            <View style={styles.passwordInput}>
              <TouchableOpacity
                onPress={() => setShowPassword(prev => !prev)}
                accessibilityLabel="Toggle password visibility"
                activeOpacity={0.6}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 7 }}
                />
              </TouchableOpacity>
              <TextInput
                placeholder="Enter your password..."
                placeholderTextColor={colors.inputTextHolder || '#A0A0A0'}
                style={[styles.input2, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCorrect={false}
                textContentType="newPassword"
                editable={!isVerifying}
              />
            </View>

            {password.length > 0 && !isValidPassword(password) && (
              <Text style={styles.validationText}>
                Password must be at least 13 characters, include uppercase,
                lowercase, a number, and a symbol.
              </Text>
            )}

            {/* Field Two: Password Confirmation Match Input */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Confirm your New Password:
            </Text>
            <View style={styles.passwordInput}>
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(prev => !prev)}
                accessibilityLabel="Toggle confirmation visibility"
                activeOpacity={0.6}
              >
                <MaterialIcons
                  name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 7 }}
                />
              </TouchableOpacity>
              <TextInput
                placeholder="Confirm your new password..."
                placeholderTextColor={colors.inputTextHolder || '#A0A0A0'}
                style={[styles.input2, { color: colors.text }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCorrect={false}
                textContentType="newPassword"
                editable={!isVerifying}
              />
            </View>

            {confirmPassword.length > 0 && confirmPassword !== password && (
              <Text style={styles.validationText}>Passwords do not match.</Text>
            )}

            <CustomButton
              title="Change Password"
              style={[styles.submitBtn]}
              onPress={handleChangePassword}
              disabled={!isFormValid}
            />
          </View>
        </ScrollView>

        <SweetAlertModal
          visible={alertVisible}
          onConfirm={() => setAlertVisible(false)}
          title={
            alertType === 'success'
              ? 'Success!'
              : alertType === 'error'
                ? 'Oops!'
                : 'Warning!'
          }
          message={alertMessage}
          type={alertType}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  bkg: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  cardContainer: {
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 15,
    width: '100%',
  },
  input2: {
    flex: 1,
    fontSize: 14,
    backgroundColor: 'transparent',
    color: '#222',
  },
  iconPadding: {
    padding: 4,
  },
  validationText: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    marginBottom: 15,
    width: '100%',
  },
  submitBtn: {
    paddingHorizontal: 15,
    marginTop: 12,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  mainHeader: {
    fontSize: 25,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    marginVertical: 25,
    alignSelf: 'center',
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
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f0eb',
    position: 'relative',
  },
});
