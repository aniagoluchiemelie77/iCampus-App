import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../assets/components/AppUIComponents';

export const EmailsScreen = () => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user) || {};
  const dispatch = useDispatch();
  const [step, setStep] = useState<
    'idle' | 'primaryInput' | 'recoveryInput' | 'verifyCode'
  >('idle');
  const [mode, setMode] = useState<'primary' | 'recovery' | ''>('');
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
        text2: `Verification code sent to ${emailInput}`,
      });
      setStep('verifyCode');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Verification Error',
        text2: 'Could not send verification code, please retry.',
      });
    }
  };

  const handleVerify = async () => {
    setEmailError('');
    const res = await verifySignupEmailCode(emailInput, codeInput);
    if (res.verified) {
      Toast.show({ type: 'success', text2: 'Email verified.' });
      const result = await updateEmailRecord(emailInput, mode);
      if (result.success) {
        Toast.show({ type: 'success', text2: `${mode} email updated` });
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
          text1: 'Update Error',
          text2: `${mode} email not updated, please retry.`,
        });
        setStep('idle');
      }
      setCodeInput('');
      setEmailInput('');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Verification Error',
        text2: 'Invalid code, please retry.',
      });
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
    } else if (timer === 0 && interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timer]);

  const handleResendCode = async () => {
    setTimer(120);
    const res = await verifySignupEmail(emailInput);
    if (res.success) {
      Toast.show({
        type: 'success',
        text2: `New code sent to ${emailInput}`,
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Resend Error',
        text2: 'Could not resend code, please retry.',
      });
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader title="Email Settings" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Primary Email Card */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Primary Email
        </Text>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border || '#e0e0e0',
            },
          ]}
        >
          <View style={styles.cardRow}>
            <MaterialIcons
              name="email"
              size={22}
              color={colors.primary}
              style={styles.cardIcon}
            />
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardValue, { color: colors.text }]}>
                {user.email || 'No primary email'}
              </Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  { color: colors.textMuted || '#888' },
                ]}
              >
                Used for critical notifications & login
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.primary + '15' },
            ]}
            onPress={() => {
              setStep('primaryInput');
              setMode('primary');
              setEmailInput('');
            }}
          >
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              Change
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recovery Emails Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Recovery Emails
        </Text>
        {user.recoveryEmails && user.recoveryEmails.length > 0 ? (
          user.recoveryEmails.map((item: any) => (
            <View
              key={item.email}
              style={[
                styles.card,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border || '#e0e0e0',
                },
              ]}
            >
              <View style={styles.cardRow}>
                <MaterialIcons
                  name="verified-user"
                  size={22}
                  color={colors.primary}
                  style={styles.cardIcon}
                />
                <View style={styles.cardTextContainer}>
                  <Text style={[styles.cardValue, { color: colors.text }]}>
                    {item.email}
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: colors.textMuted || '#888' },
                    ]}
                  >
                    Added {new Date(item.addedAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteRecovery(item.email)}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={22}
                  color={colors.primary || '#ff5252'}
                />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text
            style={[styles.emptyText, { color: colors.textMuted || '#888' }]}
          >
            No recovery emails added yet.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.primary }]}
          onPress={() => {
            setStep('recoveryInput');
            setMode('recovery');
            setEmailInput('');
          }}
        >
          <MaterialIcons
            name="add"
            size={18}
            color={colors.primary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
            Add Recovery Email
          </Text>
        </TouchableOpacity>

        {/* Dynamic Action Card for Input / Verification Steps */}
        {step !== 'idle' && (
          <View
            style={[
              styles.interactiveCard,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.primary,
              },
            ]}
          >
            <View style={styles.interactiveHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {step === 'verifyCode' ? 'Verify Code' : `Update ${mode} Email`}
              </Text>
              <TouchableOpacity onPress={() => setStep('idle')}>
                <MaterialIcons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {(step === 'primaryInput' || step === 'recoveryInput') && (
              <>
                <Text
                  style={[
                    styles.instruction,
                    { color: colors.textMuted || '#666' },
                  ]}
                >
                  Enter the new email address you want to link to your account.
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border || '#ccc',
                    },
                  ]}
                >
                  <MaterialIcons
                    name="mail-outline"
                    size={20}
                    color={colors.primary}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder={`Enter ${mode} email`}
                    placeholderTextColor={colors.inputTextHolder || '#999'}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={emailInput}
                    onChangeText={setEmailInput}
                  />
                </View>
                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleSendCode}
                >
                  <Text style={styles.primaryButtonText}>
                    Send Verification Code
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'verifyCode' && (
              <>
                <Text style={[styles.instruction, { color: colors.text }]}>
                  Enter the 6-digit code sent to{' '}
                  <Text style={{ fontWeight: '700' }}>{emailInput}</Text>
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border || '#ccc',
                    },
                  ]}
                >
                  <MaterialIcons
                    name="lock-outline"
                    size={20}
                    color={colors.primary}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: colors.text,
                        letterSpacing: 4,
                        fontWeight: '600',
                      },
                    ]}
                    placeholder="123456"
                    placeholderTextColor={colors.inputTextHolder || '#999'}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={codeInput}
                    onChangeText={setCodeInput}
                  />
                </View>
                <View style={styles.timerRow}>
                  <Text
                    style={[
                      styles.timerText,
                      timer < 60
                        ? { color: colors.primary || '#ff5252' }
                        : { color: colors.textMuted },
                    ]}
                  >
                    {timer > 0
                      ? `Expires in ${formatSignupTime(timer)}`
                      : 'Code expired'}
                  </Text>
                  {timer === 0 && (
                    <TouchableOpacity onPress={handleResendCode}>
                      <Text
                        style={[styles.resendText, { color: colors.primary }]}
                      >
                        Resend Code
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: colors.primary,
                      opacity: codeInput.length < 6 ? 0.6 : 1,
                    },
                  ]}
                  disabled={codeInput.length < 6}
                  onPress={handleVerify}
                >
                  <Text style={styles.primaryButtonText}>Verify & Save</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 15,
    letterSpacing: 0.2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: { light: 0.04, dark: 0.2 }[
      Platform.OS === 'ios' ? 'light' : 'dark'
    ],
    shadowRadius: 8,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  cardIcon: {
    marginRight: 14,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 5,
    marginBottom: 20,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  interactiveCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    marginTop: 10,
    marginBottom: 20,
  },
  interactiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  instruction: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
  },
  errorText: {
    color: '#ff5252',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resendText: {
    fontSize: 12,
    fontWeight: '700',
  },
});