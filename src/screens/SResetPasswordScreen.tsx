import React, { useState, useMemo} from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import Toast from 'react-native-toast-message';
import { PageHeader } from '../components/PageHeader.tsx';
import {
  getPasswordRequirements,
  isValidPassword,
} from '../utils/SignupHelpers.ts';
import { verifyCurrentPassword } from '../api/localPostApis.ts';
import { updatePassword } from '../api/localPutApis.ts';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { CustomButton } from '../assets/components/AppUIComponents';

export const ResetPasswordScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [errorText, setErrorText] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const requirements = useMemo(
    () => getPasswordRequirements(newPassword),
    [newPassword],
  );

  const handleVerifyOld = async () => {
    setLoading(true);
    const response = await verifyCurrentPassword(oldPassword);
    setLoading(false);
    if (response.success) {
      setStep(2);
    } else {
      setErrorText(response.message);
    }
  };
  const handleUpdatePassword = async () => {
    setErrorText('');
    setLoading(true);
    const result = await updatePassword(newPassword);
    setLoading(false);
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Password changed!',
      });
      navigation.navigate('Home', { activeTab: 'home' });
    } else {
      setErrorText(result.message);
    }
  };
  const passwordMatchError =
    newPassword && confirmPassword && newPassword !== confirmPassword
      ? 'Passwords do not match...'
      : '';
  const canSubmitStep1 = oldPassword.length > 0;
  const canSubmitStep2 =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword &&
    isValidPassword(newPassword);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader title="Reset Password" />
      {step === 1 ? (
        <Animated.View
          entering={FadeInRight.duration(400).springify()}
          exiting={FadeOutLeft}
        >
          <View style={styles.stepContainer}>
            <MaterialIcons
              name="lock-outline"
              size={60}
              color={colors.primary}
            />
            <Text style={[styles.title, { color: colors.textDarker }]}>
              Security Check
            </Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              Please enter your current password to continue.
            </Text>
            <View style={styles.inputContainer}>
              <TouchableOpacity onPress={() => setShowOld(!showOld)}>
                <MaterialIcons
                  name={showOld ? 'visibility-off' : 'visibility'}
                  size={20}
                  color={colors.inputTextHolder}
                  style={{ marginRight: 7 }}
                />
              </TouchableOpacity>

              <TextInput
                placeholder="Enter your current password..."
                placeholderTextColor={colors.inputTextHolder}
                style={[styles.input, { color: colors.text }]}
                secureTextEntry={!showOld}
                value={oldPassword}
                onChangeText={setOldPassword}
              />
            </View>
            {errorText && <Text style={styles.errorText}>{errorText}</Text>}
            <CustomButton
              title={isLoading ? 'Verifying...' : 'Verify Password'}
              style={[
                styles.primaryButton,
                { opacity: canSubmitStep1 ? 1 : 0.7 },
              ]}
              onPress={handleVerifyOld}
              disabled={!canSubmitStep1}
            />
          </View>
        </Animated.View>
      ) : (
        <View style={styles.stepContainer}>
          <MaterialIcons name="lock-outline" size={60} color={colors.primary} />
          <Text style={[styles.title, { color: colors.textDarker }]}>
            New Password
          </Text>
          <View style={styles.inputContainer}>
            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
              <MaterialIcons
                name={showNew ? 'visibility-off' : 'visibility'}
                size={20}
                color={colors.inputTextHolder}
                style={{ marginRight: 7 }}
              />
            </TouchableOpacity>

            <TextInput
              placeholderTextColor={colors.inputTextHolder}
              style={[styles.input, { color: colors.text }]}
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter your new password..."
            />
          </View>
          <View style={styles.strengthBarContainer}>
            {[
              requirements.hasUppercase,
              requirements.hasLowercase,
              requirements.hasNumber,
              requirements.hasSymbol,
              requirements.hasMinLength,
            ].map((met, index) => (
              <View
                key={index}
                style={[
                  styles.strengthSegment,
                  {
                    backgroundColor: met ? colors.primary : colors.primaryTint,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.inputContainer}>
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
              <MaterialIcons
                name={showConfirm ? 'visibility-off' : 'visibility'}
                size={20}
                color={colors.inputTextHolder}
                style={{ marginRight: 7 }}
              />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { color: colors.text }]}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your new password..."
              placeholderTextColor={colors.inputTextHolder}
            />
          </View>
          {passwordMatchError && (
            <Text style={styles.errorText}>{passwordMatchError}</Text>
          )}
          <CustomButton
            title={isLoading ? 'Changing...' : 'Change Password'}
            style={[
              styles.primaryButton,
              { opacity: canSubmitStep2 ? 1 : 0.7 },
            ]}
            onPress={handleUpdatePassword}
            disabled={!canSubmitStep2}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputContainer: {
    width: '100%',
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  stepContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 25,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    fontSize: 11,
    fontWeight: 'bold',
    width: '100%',
    color: PRIMARY_COLOR,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 5,
    marginTop: 15,
    width: '100%',
  },
  strengthSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
    marginHorizontal: 2,
  },
  primaryButton: {
    marginTop: 15,
    paddingHorizontal: 15,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});