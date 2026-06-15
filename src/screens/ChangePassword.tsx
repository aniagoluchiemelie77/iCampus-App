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
} from 'react-native';
import SweetAlertModal from '../components/alertscomponent';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { changePassword } from '../api/localPostApis';
import { IconBackground } from '../assets/styles/BackgroundIconPattern';
import { isValidPassword } from '../utils/SignupHelpers';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

type ChangePasswordParams = {
  email: string;
};

export default function ChangePasswordScreen() {
  const { colors } = useTheme();
  const route =
    useRoute<RouteProp<{ params: ChangePasswordParams }, 'params'>>();
  const navigation = useNavigation<any>();
  const email = route.params?.email || '';

  // Core Inputs State Matrix
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Alert Component Layer State Tracking
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>(
    'success',
  );
  const [alertMessage, setAlertMessage] = useState('');
  const [isVerifying, setVerifying] = useState(false);

  // Structural Ref to track asynchronous unmount events
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // CLEANUP LEAK LAYER: Prevent background execution errors on unmounted components
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChangePassword = async () => {
    // Basic structural guards
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
      setVerifying(true); // Establish request synchronization thread lock

      const response = await changePassword(email, password, confirmPassword);

      if (response && response.success) {
        setAlertType('success');
        setAlertMessage(
          'Password updated successfully. Redirecting to login context...',
        );
        setAlertVisible(true);

        // Assign timeout path to explicit reference pointer for clean tracking
        timeoutRef.current = setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }], // Hard clear history stack to prevent back-navigation exploits
          });
        }, 2500);
      } else {
        throw new Error(
          response?.message || 'Upstream identity validation rejected update.',
        );
      }
    } catch (err: any) {
      console.error('[PASSWORD_RESET_CRITICAL_FAILURE]', err);
      setAlertType('error');
      setAlertMessage(
        err.message || 'Password reset attempt unsuccessful. Try again.',
      );
      setAlertVisible(true);
    } finally {
      setVerifying(false); // Drop thread execution block
    }
  };

  // Pre-calculate verification status strings to keep layout clean
  const isFormValid =
    isValidPassword(password) && confirmPassword === password && !isVerifying;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <IconBackground />

      <View style={styles.cardContainer}>
        <Text style={[styles.mainHeader, { color: colors.text }]}>
          Forgot Password
        </Text>

        {/* Field One: Primary Password Input */}
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          Enter your New Password:
        </Text>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: colors.backgroundSecondary || '#F5F5F5' },
          ]}
        >
          <TextInput
            placeholder="Enter your password..."
            placeholderTextColor={colors.inputTextHolder || '#A0A0A0'}
            style={[styles.textInput, { color: colors.text }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none" // SECURITY CRITICAL FIX
            autoCorrect={false}
            textContentType="newPassword" // SECURITY CRITICAL FIX
            editable={!isVerifying}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(prev => !prev)}
            accessibilityLabel="Toggle password visibility"
            activeOpacity={0.6}
          >
            <MaterialIcons
              name={showPassword ? 'visibility' : 'visibility-off'}
              size={22}
              color={colors.primary}
              style={styles.iconPadding}
            />
          </TouchableOpacity>
        </View>

        {password.length > 0 && !isValidPassword(password) && (
          <Text style={styles.validationText}>
            Password must be at least 13 characters and include uppercase,
            lowercase, a number, and a symbol.
          </Text>
        )}

        {/* Field Two: Password Confirmation Match Input */}
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          Confirm your New Password:
        </Text>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: colors.backgroundSecondary || '#F5F5F5' },
          ]}
        >
          <TextInput
            placeholder="Confirm your new password..."
            placeholderTextColor={colors.inputTextHolder || '#A0A0A0'}
            style={[styles.textInput, { color: colors.text }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none" // SECURITY CRITICAL FIX
            autoCorrect={false}
            textContentType="newPassword" // SECURITY CRITICAL FIX
            editable={!isVerifying}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(prev => !prev)}
            accessibilityLabel="Toggle confirmation visibility"
            activeOpacity={0.6}
          >
            <MaterialIcons
              name={showConfirmPassword ? 'visibility' : 'visibility-off'}
              size={22}
              color={colors.primary}
              style={styles.iconPadding}
            />
          </TouchableOpacity>
        </View>

        {confirmPassword.length > 0 && confirmPassword !== password && (
          <Text style={styles.validationText}>Passwords do not match.</Text>
        )}

        {/* Action Dispatcher Trigger */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.btnColor },
            !isFormValid && { opacity: 0.5 },
          ]}
          onPress={handleChangePassword}
          disabled={!isFormValid}
          activeOpacity={0.8}
        >
          {isVerifying ? (
            <ActivityIndicator size="small" color={colors.btnTextColor} />
          ) : (
            <Text
              style={[styles.submitBtnText, { color: colors.btnTextColor }]}
            >
              Change Password
            </Text>
          )}
        </TouchableOpacity>
      </View>

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
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  cardContainer: {
    paddingHorizontal: 24,
    width: '100%',
  },
  mainHeader: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 54,
    width: '100%',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    paddingVertical: 0,
  },
  iconPadding: {
    padding: 4,
  },
  validationText: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 6,
    paddingHorizontal: 4,
    lineHeight: 16,
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    width: '100%',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
