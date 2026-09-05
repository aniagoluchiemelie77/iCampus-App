import PhoneInput from "react-native-phone-number-input";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { PageHeader } from '../components/PageHeader.tsx';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../hooks/hooks.ts';
import {
  handleSendWhatsAppCode,
  verifyPhoneOTPAPI,
} from '../api/localPostApis.ts';
import { formatSignupTime } from '../utils/ChatTimestampFormatter.ts';
import { handleDeletePhone } from '../api/localDeleteApis.ts';
import { updatePhoneNumbersData } from '../context/UserSlice.ts';
import { useDispatch } from 'react-redux';
import { useTheme } from '../context/ThemeContext';
import { CustomButton } from '../assets/components/AppUIComponents';

export const PhoneScreen = () => {
  const { colors } = useTheme();
  const phoneInput = useRef<any>(null);
  const user = useAppSelector(state => state.user) || {};
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedValue, setFormattedValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'idle' | 'phoneInput' | 'verifyCode'>(
    'idle',
  );
  const [isValid, setIsValid] = useState(false);
  const [countryCode, setCountryCode] = useState<any>(user.country || 'NG');
  const [timer, setTimer] = useState(900);
  const dispatch = useDispatch();
  const [codeInput, setCodeInput] = useState('');

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(text);
    const phoneNumberObj = parsePhoneNumberFromString(text, countryCode);
    if (phoneNumberObj) {
      setIsValid(phoneNumberObj.isValid());
    } else {
      setIsValid(false);
    }
  };

  const sendWhatsappCode = async () => {
    const result = await handleSendWhatsAppCode(formattedValue);
    if (result && result.success) {
      Toast.show({ type: 'success', text2: 'OTP sent to your WhatsApp!' });
      setStep('verifyCode');
      setTimer(900);
    } else {
      Toast.show({
        type: 'error',
        text2: 'Failed to send code, please retry.',
      });
    }
  };

  const handleDeleteRecovery = async (phoneNum: string) => {
    Alert.alert(
      'Remove Phone Number',
      `Are you sure you want to remove ${phoneNum}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const res = await handleDeletePhone(phoneNum);
            if (res && res.success) {
              dispatch(
                updatePhoneNumbersData({ phoneNumbers: res.phoneNumbers }),
              );
              Toast.show({
                type: 'success',
                text1: 'Phone number removed',
              });
            } else {
              Toast.show({
                type: 'error',
                text1: 'Delete Error',
                text2: "Couldn't delete phone number, please retry.",
              });
            }
          },
        },
      ],
    );
  };

  const handleVerify = async () => {
    setIsSubmitting(true);
    const res = await verifyPhoneOTPAPI(formattedValue, codeInput);
    if (res && res.success) {
      Toast.show({ type: 'success', text2: 'Phone Number verified.' });
      dispatch(updatePhoneNumbersData({ phoneNumbers: res.phoneNumbers }));
      setCodeInput('');
      setPhoneNumber('');
      setStep('idle');
    } else {
      Toast.show({
        type: 'error',
        text1: 'Verification Error',
        text2: 'Phone number not verified, please retry.',
      });
    }
    setIsSubmitting(false);
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader title="Phone Numbers" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.header, { color: colors.text }]}>
          Saved Numbers
        </Text>

        {user.phoneNumbers && user.phoneNumbers.length > 0 ? (
          user.phoneNumbers.map((item: any) => (
            <View
              key={item.number}
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
                  name="smartphone"
                  size={22}
                  color={colors.primary}
                  style={styles.cardIcon}
                />
                <View style={styles.cardTextContainer}>
                  <Text
                    style={[styles.phoneNumberText, { color: colors.text }]}
                  >
                    {item.number}
                  </Text>
                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: colors.textMuted || '#888' },
                    ]}
                  >
                    {item.isVerified ? 'Verified Phone' : 'Unverified'}
                  </Text>
                </View>
                {item.isVerified && (
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={colors.primary}
                    style={{ marginRight: 8 }}
                  />
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteRecovery(item.number)}
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
            No phone numbers added yet.
          </Text>
        )}

        {step === 'idle' && (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.primary }]}
            onPress={() => setStep('phoneInput')}
          >
            <MaterialIcons
              name="add"
              size={18}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.secondaryButtonText, { color: colors.primary }]}
            >
              Add Phone Number
            </Text>
          </TouchableOpacity>
        )}

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
                {step === 'phoneInput'
                  ? 'Add Phone Number'
                  : 'Verify via WhatsApp'}
              </Text>
              <TouchableOpacity onPress={() => setStep('idle')}>
                <MaterialIcons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {step === 'phoneInput' && (
              <>
                <Text
                  style={[
                    styles.instructionText,
                    { color: colors.textMuted || '#666' },
                  ]}
                >
                  Enter your mobile number to receive a WhatsApp verification
                  code.
                </Text>
                <PhoneInput
                  ref={phoneInput}
                  defaultValue={phoneNumber}
                  defaultCode={countryCode}
                  layout="first"
                  onChangeText={handlePhoneChange}
                  onChangeFormattedText={text => setFormattedValue(text)}
                  onChangeCountry={country => setCountryCode(country.cca2)}
                  containerStyle={[
                    styles.phoneInputContainer,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border || '#ccc',
                    },
                  ]}
                  textContainerStyle={[
                    styles.phoneTextContainer,
                    { backgroundColor: colors.background },
                  ]}
                  flagButtonStyle={[
                    styles.flagButtonStyle,
                    { backgroundColor: colors.background },
                  ]}
                  withShadow={false}
                  autoFocus
                  textInputStyle={{
                    color: colors.text,
                    fontSize: 14,
                    backgroundColor: 'transparent',
                  }}
                  codeTextStyle={{ color: colors.text }}
                  textInputProps={{
                    placeholderTextColor: colors.inputTextHolder || '#999',
                  }}
                  renderDropdownImage={
                    <MaterialIcons
                      name="keyboard-arrow-down"
                      size={20}
                      color={colors.text}
                    />
                  }
                />
                {!isValid && phoneNumber.length > 0 && (
                  <Text style={styles.errorText}>
                    Invalid number for {countryCode}
                  </Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: colors.primary,
                      opacity: !isValid ? 0.6 : 1,
                    },
                  ]}
                  disabled={!isValid}
                  onPress={sendWhatsappCode}
                >
                  <Text style={styles.primaryButtonText}>
                    Verify via WhatsApp
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'verifyCode' && (
              <>
                <Text style={[styles.instructionText, { color: colors.text }]}>
                  Enter the 6-digit code sent to{' '}
                  <Text style={{ fontWeight: '700' }}>{formattedValue}</Text>
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
                    placeholder="000000"
                    placeholderTextColor={colors.inputTextHolder || '#999'}
                    onChangeText={setCodeInput}
                    value={codeInput}
                    keyboardType="number-pad"
                    maxLength={6}
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
                      ? `Code expires in: ${formatSignupTime(timer)}`
                      : 'Code has expired'}
                  </Text>
                  {timer === 0 && (
                    <TouchableOpacity onPress={sendWhatsappCode}>
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
                      opacity: codeInput.length < 6 || isSubmitting ? 0.6 : 1,
                    },
                  ]}
                  disabled={codeInput.length < 6 || isSubmitting}
                  onPress={handleVerify}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSubmitting ? 'Verifying...' : 'Verify & Update'}
                  </Text>
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
  header: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 5,
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
    shadowOpacity: 0.04,
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
  phoneNumberText: {
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
    marginBottom: 15,
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
  instructionText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  phoneInputContainer: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  phoneTextContainer: {
    backgroundColor: 'transparent',
  },
  flagButtonStyle: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: 'transparent',
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
  errorText: {
    color: '#ff5252',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
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