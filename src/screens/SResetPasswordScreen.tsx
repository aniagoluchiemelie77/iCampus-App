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
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { PageHeader } from '../components/PageHeader.tsx';
import {getPasswordRequirements, isValidPassword} from '../utils/SignupHelpers.ts';
import {verifyCurrentPassword} from '../api/localPostApis.ts';
import {updatePassword} from '../api/localPutApis.ts';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

export const ResetPasswordScreen = ({ navigation }: any) => {
  const [step, setStep] = useState(1);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [errorText, setErrorText] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const requirements = useMemo(() => getPasswordRequirements(newPassword), [newPassword]);
  const canSubmit = 
  newPassword.length > 0 && 
  confirmPassword.length > 0 && 
  newPassword === confirmPassword && 
  isValidPassword(newPassword);

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
        Toast.show({ type: 'success', text1: 'Success', text2: 'Password changed!' });
        navigation.navigate('Home');
    } else {
        setErrorText(result.message);
    }
  };
  if (newPassword !== confirmPassword){
    setErrorText('Passwords do not match...');
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
        <PageHeader
            title="Reset Password"
        />
        {step === 1 ? (
            <Animated.View
                entering={FadeInRight.duration(400).springify()}
                exiting={FadeOutLeft}
            >
            <View style={styles.stepContainer}>
                <MaterialIcons name='verified-user-outlined' size={40} color="#222" />
                <Text style={styles.title}>Security Check</Text>
                <Text style={styles.subtitle}>Please enter your current password to continue.</Text>          
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        secureTextEntry={!showOld}
                        value={oldPassword}
                        onChangeText={setOldPassword}
                        placeholder="Enter your current password..."
                        placeholderTextColor={PRIMARY_COLOR_TINT}
                    />
                    <TouchableOpacity onPress={() => setShowOld(!showOld)}>
                        <MaterialIcons name={showOld ? "visibility-off-outlined" : "visibility-outlined"} size={20} color={PRIMARY_COLOR_TINT} />
                    </TouchableOpacity>
                </View>
                {errorText && (
                    <Text style={styles.errorText}>{errorText}</Text>
                )}
                <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOld}>
                    <Text style={styles.buttonText}>{isLoading ? 'Verifying...' : 'Verify Password'}</Text>
                </TouchableOpacity>
            </View>
            </Animated.View>
        ) : (
            <View style={styles.stepContainer}>
                <MaterialIcons name='verified-user-outlined' size={40} color="#222" />
                <Text style={styles.title}>New Password</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        secureTextEntry={!showNew}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Enter your new password..."
                        placeholderTextColor={PRIMARY_COLOR_TINT}
                    />
                    <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                        <MaterialIcons name={showNew ? "visibility-off-outlined" : "visibility-outlined"} size={20} color={PRIMARY_COLOR_TINT} />
                    </TouchableOpacity>
                </View>
                <View style={styles.strengthBarContainer}>
                    {[
                        requirements.hasUppercase,
                        requirements.hasLowercase,
                        requirements.hasNumber,
                        requirements.hasSymbol,
                        requirements.hasMinLength
                    ].map((met, index) => (
                        <View 
                            key={index} 
                            style={[
                                styles.strengthSegment, 
                                { backgroundColor: met ? PRIMARY_COLOR : PRIMARY_COLOR_TINT }
                            ]} 
                        />
                    ))}
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        secureTextEntry={!showConfirm}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm your new password..."
                        placeholderTextColor={PRIMARY_COLOR_TINT}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                        <MaterialIcons name={showConfirm ? "visibility-off-outlined" : "visibility-outlined"} size={20} color={PRIMARY_COLOR_TINT} />
                    </TouchableOpacity>
                </View>
                {errorText && (
                    <Text style={styles.errorText}>{errorText}</Text>
                )}
                <TouchableOpacity 
                    style={[styles.primaryButton, { opacity: canSubmit ? 1 : 0.6 }]} 
                    onPress={handleUpdatePassword}
                    disabled={!canSubmit}
                >
                    <Text style={styles.buttonText}>{isLoading ? 'Changing...' : 'Change Password'}</Text>
                </TouchableOpacity>
            </View>
        )}
      <Toast config={toastConfig} />
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fadccc',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 5,
    width: '100%',
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
  },
  stepContainer: {
    marginTop: 20,
    alignContent: 'center',
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#222',
    marginVertical: 15,
  },
  subtitle: {
    fontSize: 14,
    color: '#2222',
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    fontSize: 11,
    fontWeight: 'bold',
    width: '100%',
    marginTop: 8,
    color: PRIMARY_COLOR,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 5,
    marginTop: 10,
    width: '100%',
  },
  strengthSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
    marginHorizontal: 2,
  },
  primaryButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignContent: 'center',
    marginTop: 30,
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});