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
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { useAppSelector } from '../hooks/hooks.ts';
import {
  verifySignupEmail,
  verifySignupEmailCode,
} from '../api/localPostApis.ts';
import { updateEmailRecord } from '../api/localPatchApis.ts';
import { deleteRecoveryEmailAPI } from '../api/localDeleteApis.ts';
import { updateEmailData } from '../context/UserSlice.ts';
import { useDispatch } from 'react-redux';
import { isValidEmail } from '../utils/SignupHelpers.ts';
import { formatSignupTime } from '../utils/ChatTimestampFormatter.ts';
import { useTheme } from '../context/ThemeContext';

export const EmailsScreen = () => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user);
  const dispatch = useDispatch();
  const [step, setStep] = useState('idle');
  const [mode, setMode] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [timer, setTimer] = useState(900);

  const handleSendCode = async () => {
    if (!isValidEmail(emailInput.trim())) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
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
  if (!isValidEmail(emailInput)) {
    setEmailError('Invalid Email.');
  }
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader title="Emails" />
      <View
        style={[
          styles.section,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <Text style={[styles.header, { color: colors.text }]}>
          Primary Email
        </Text>
        <TextInput
          value={user.email}
          editable={false}
          style={[styles.disabledInput, { color: colors.text }]}
        />
        <TouchableOpacity
          style={[styles.inlineButton, { backgroundColor: colors.btnColor }]}
          onPress={() => {
            setStep('primaryInput');
            setMode('primary');
          }}
        >
          <Text style={[styles.buttonText, { color: colors.btnTextColor }]}>
            Change
          </Text>
        </TouchableOpacity>
        <Text style={[styles.header, { color: colors.text }]}>
          Recovery Emails
        </Text>
        {user.recoveryEmails ? (
          (user.recoveryEmails || []).map(item => (
            <>
              <View style={styles.emailContainer}>
                <TextInput
                  key={item.email}
                  value={item.email}
                  editable={false}
                  style={[styles.disabledInput, { color: colors.text }]}
                />
                <TouchableOpacity
                  onPress={() => handleDeleteRecovery(item.email)}
                >
                  <MaterialIcons
                    name="delete-outline-outlined"
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </>
          ))
        ) : (
          <Text style={[styles.emptyEmailText, { color: colors.text }]}>
            No Recovery emails added
          </Text>
        )}
        <TouchableOpacity
          style={[styles.inlineButton, { backgroundColor: colors.btnColor }]}
          onPress={() => {
            setStep('recoveryInput');
            setMode('recovery');
          }}
        >
          <Text style={[styles.buttonText, { color: colors.btnTextColor }]}>
            Add Recovery Email
          </Text>
        </TouchableOpacity>
        {step !== 'idle' && (
          <>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {step === 'verifyCode' ? 'Verify Code' : `Update ${mode} Email`}
            </Text>
            {(step === 'primaryInput' || step === 'recoveryInput') && (
              <>
                <TextInput
                  style={[styles.disabledInput, { color: colors.text }]}
                  placeholder="Enter your email address"
                  placeholderTextColor={colors.inputTextHolder}
                  onChangeText={setEmailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {emailError && (
                  <Text style={styles.emailErrorText}>{emailError}</Text>
                )}
                <TouchableOpacity
                  style={[
                    [styles.inlineButton, { backgroundColor: colors.btnColor }],
                    { marginTop: 10 },
                  ]}
                  onPress={handleSendCode}
                >
                  <Text
                    style={[styles.buttonText, { color: colors.btnTextColor }]}
                  >
                    Send Verification Code
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {step === 'verifyCode' && (
              <>
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  Enter the 6-digit code sent to {emailInput}
                </Text>
                <TextInput
                  style={[styles.disabledInput, { color: colors.text }]}
                  placeholder="000000"
                  placeholderTextColor={colors.inputTextHolder}
                  onChangeText={setCodeInput}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Text
                  style={[
                    styles.timerText,
                    timer < 60
                      ? { color: colors.primary }
                      : { color: colors.text },
                  ]}
                >
                  Code expires in: {formatSignupTime(timer)}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.inlineButton,
                    { backgroundColor: colors.btnColor },
                  ]}
                  onPress={handleVerify}
                >
                  <Text
                    style={[styles.buttonText, { color: colors.btnTextColor }]}
                  >
                    Verify & Update
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  section: {
    padding: 15,
    borderRadius: 15
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  inlineButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    alignContent: 'center',
    marginVertical: 10
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 15,
  },
  disabledInput: {
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    width: '100%',
    marginBottom: 15,
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 14,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyEmailText: {
    fontSize: 14,
  },
  emailErrorText: {
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    fontSize: 11,
  },
  timerText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
});