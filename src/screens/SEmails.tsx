import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import Toast from 'react-native-toast-message';
import { PageHeader } from '../components/PageHeader.tsx';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { useAppSelector } from '../components/hooks';
import {
  verifySignupEmail,
  verifySignupEmailCode,
} from '../api/localPostApis.ts';
import { updateEmailRecord } from '../api/localPatchApis.ts';
import { deleteRecoveryEmailAPI } from '../api/localDeleteApis.ts';
import { updateEmailData } from '../components/UserSlice.ts';
import { useDispatch } from 'react-redux';
import { isValidEmail } from '../utils/SignupHelpers.ts';
import { formatSignupTime } from '../utils/ChatTimestampFormatter.ts';

export const EmailsScreen = () => {
  const user = useAppSelector(state => state.user);
  const dispatch = useDispatch();
  const [step, setStep] = useState('idle');
  const [mode, setMode] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [timer, setTimer] = useState(900);

  const handleSendCode = async () => {
    if (emailError !== '') {
      return;
    }
    const res = await verifySignupEmail(emailInput);
    if (res.success) {
      Toast.show({
        type: 'success',
        text2: `Email verification code sent to ${emailInput}`,
      });
      setStep('verifyCode');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Verification Error',
        text2: `Verification error, please retry.`,
      });
    }
  };
  const handleVerify = async () => {
    setEmailError('');
    const res = await verifySignupEmailCode(emailInput, codeInput);
    if (res.verified) {
      Toast.show({ type: 'success', text2: `Email verified.` });
      const result = await updateEmailRecord(emailInput, mode);
      if (result.success) {
        Toast.show({ type: 'success', text2: ` ${mode} email updated` });
        if (mode === 'primary') {
          dispatch(updateEmailData({ email: emailInput }));
        } else {
          const newEntry = {
            email: emailInput,
            isVerified: true,
            addedAt: new Date().toISOString(),
          };
          const updatedRecoveryList = [
            ...(user.recoveryEmails || []),
            newEntry,
          ];
          dispatch(updateEmailData({ recoveryEmails: updatedRecoveryList }));
        }
        setStep('idle');
      } else {
        Toast.show({
          type: 'error',
          text1: `Update Error`,
          text2: `${mode} email not updated, please retry.`,
        });
        setStep('idle');
      }
      setCodeInput('');
      setEmailInput('');
    } else {
      Toast.show({
        type: 'error',
        text1: `Verification Error`,
        text2: `Email not verified, please retry.`,
      });
      setStep('idle');
    }
  };
  const handleDeleteRecovery = async (emailToDelete: string) => {
    Alert.alert(
      'Remove Email',
      `Are you sure you want to remove ${emailToDelete}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteRecoveryEmailAPI(emailToDelete);
            if (res && res.success) {
              dispatch(updateEmailData({ recoveryEmails: res.recoveryEmails }));
              Toast.show({
                type: 'success',
                text1: 'Recovery email removed',
              });
            } else {
              Toast.show({
                type: 'error',
                text1: 'Delete Error',
                text2: "Couldn't delete email, please retry.",
              });
            }
          },
        },
      ],
    );
  };
  useEffect(() => {
    let interval: any = null;
    if (step === 'verifyCode' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);
  if (isValidEmail(emailInput)) {
    setEmailError('Invalid Email.');
  }
  return (
    <ScrollView style={styles.container}>
      <PageHeader title="Emails" />
      <View style={styles.section}>
        <Text style={styles.header}>Primary Email</Text>
        <TextInput
          value={user.email}
          editable={false}
          style={styles.disabledInput}
        />
        <TouchableOpacity
          style={styles.inlineButton}
          onPress={() => {
            setStep('primaryInput');
            setMode('primary');
          }}
        >
          <Text style={styles.buttonText}>Change</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={styles.header}>Recovery Emails</Text>
        {user.recoveryEmails ? (
          (user.recoveryEmails || []).map(item => (
            <>
              <View style={styles.emailContainer}>
                <TextInput
                  key={item.email}
                  value={item.email}
                  editable={false}
                  style={[styles.disabledInput, { marginBottom: 8 }]}
                />
                <TouchableOpacity
                  onPress={() => handleDeleteRecovery(item.email)}
                >
                  <MaterialIcons
                    name="delete-outline-outlined"
                    size={16}
                    color={PRIMARY_COLOR}
                  />
                </TouchableOpacity>
              </View>
            </>
          ))
        ) : (
          <Text style={styles.emptyEmailText}>No Recovery emails added</Text>
        )}
        <TouchableOpacity
          style={styles.inlineButton}
          onPress={() => {
            setStep('recoveryInput');
            setMode('recovery');
          }}
        >
          <Text style={styles.buttonText}>Add Recovery Email</Text>
        </TouchableOpacity>
      </View>
      {step !== 'idle' && (
        <View style={styles.actionCard}>
          <Text style={styles.cardTitle}>
            {step === 'verifyCode' ? 'Verify Code' : `Update ${mode} Email`}
          </Text>
          {(step === 'primaryInput' || step === 'recoveryInput') && (
            <>
              <TextInput
                style={styles.disabledInput}
                placeholder="Enter your email address"
                placeholderTextColor={PRIMARY_COLOR_TINT}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {emailError && (
                <Text style={styles.emailErrorText}>{emailError}</Text>
              )}
              <TouchableOpacity
                style={[styles.inlineButton, { marginTop: 10 }]}
                onPress={handleSendCode}
              >
                <Text style={styles.buttonText}>Send Verification Code</Text>
              </TouchableOpacity>
            </>
          )}
          {step === 'verifyCode' && (
            <View>
              <Text style={styles.instructionText}>
                Enter the 6-digit code sent to {emailInput}
              </Text>
              <TextInput
                style={styles.disabledInput}
                placeholder="000000"
                placeholderTextColor={PRIMARY_COLOR_TINT}
                onChangeText={setCodeInput}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Text
                style={[
                  styles.timerText,
                  timer < 60 && { color: PRIMARY_COLOR },
                ]}
              >
                Code expires in: {formatSignupTime(timer)}
              </Text>
              <TouchableOpacity
                style={styles.inlineButton}
                onPress={handleVerify}
              >
                <Text style={styles.buttonText}>Verify & Update</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            onPress={() => setStep('idle')}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    marginVertical: 20,
    padding: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 15,
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },
  inlineButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    alignContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  actionCard: {
    backgroundColor: '#fadccc',
    padding: 20,
    borderRadius: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 16,
  },
  disabledInput: {
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#222',
    fontSize: 14,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    backgroundColor: '#fadccc',
    width: '100%',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#2222',
    marginBottom: 12,
  },
  cancelButton: {
    marginTop: 15,
    alignContent: 'center',
    width: '80%',
    alignSelf: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 13,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    justifyContent: 'space-between',
  },
  emptyEmailText: {
    padding: 15,
    fontSize: 14,
    color: PRIMARY_COLOR_TINT,
  },
  emailErrorText: {
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    fontSize: 11,
  },
  timerText: {
    color: '#2222',
    fontWeight: 'bold',
    fontSize: 12,
  },
});