import PhoneInput from "react-native-phone-number-input";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import React, { useState, useEffect} from 'react';
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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { useAppSelector } from '../components/hooks';
import {
  handleSendWhatsAppCode,
  verifyPhoneOTPAPI,
} from '../api/localPostApis.ts';
import { formatSignupTime } from '../utils/ChatTimestampFormatter.ts';
import { handleDeletePhone } from '../api/localDeleteApis.ts';
import { updatePhoneNumbersData } from '../context/UserSlice.ts';
import { useDispatch } from 'react-redux';
import { useTheme } from '../context/ThemeContext';

export const PhoneScreen = () => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedValue, setFormattedValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState('idle');
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
      return;
    } else {
      Toast.show({
        type: 'error',
        text2: 'Failed to send code, please retry.',
      });
      return;
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
      Toast.show({ type: 'success', text2: `Phone Number verified.` });
      dispatch(updatePhoneNumbersData({ phoneNumbers: res.phoneNumbers }));
      setCodeInput('');
      setPhoneNumber('');
    } else {
      Toast.show({
        type: 'error',
        text1: `Verification Error`,
        text2: `Phone number not verified, please retry.`,
      });
      setStep('idle');
    }
    setIsSubmitting(false);
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader title="Phone Numbers" />
      <View
        style={[
          styles.section,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <Text style={[styles.header, { color: colors.textDarker }]}>
          Saved Numbers
        </Text>
        {user.phoneNumbers ? (
          user.phoneNumbers?.map(item => (
            <View key={item.number} style={styles.phoneRow}>
              <MaterialIcons
                name="smartphone-outlined"
                size={20}
                color={colors.text}
              />
              <Text style={[styles.phoneNumberText, { color: colors.text }]}>
                {item.number}
              </Text>
              {item.isVerified && (
                <MaterialIcons
                  name="verified-user-outlined"
                  size={20}
                  color={colors.primary}
                />
              )}
              <TouchableOpacity
                onPress={() => handleDeleteRecovery(item.number)}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyEmailText, { color: colors.text }]}>
            No phone numbers added.
          </Text>
        )}
        <TouchableOpacity
          style={[styles.inlineButton, { backgroundColor: colors.btnColor }]}
          onPress={() => {
            setStep('phoneInput');
          }}
        >
          <Text style={[styles.buttonText, { color: colors.btnTextColor }]}>
            Add Phone Number
          </Text>
        </TouchableOpacity>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Add WhatsApp Number
        </Text>
        {step === 'phoneInput' && (
          <View>
            <PhoneInput
              defaultValue={phoneNumber}
              defaultCode={countryCode}
              layout="first"
              onChangeText={handlePhoneChange}
              onChangeFormattedText={text => setFormattedValue(text)}
              onChangeCountry={country => setCountryCode(country.cca2)}
              containerStyle={styles.phoneInputContainer}
              textContainerStyle={styles.phoneTextContainer}
              withShadow
              autoFocus
              textInputStyle={{ color: colors.text, fontSize: 14 }}
            />
            {!isValid && phoneNumber.length > 0 && (
              <Text style={styles.errorText}>
                Invalid number for {countryCode}
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                !isValid && styles.disabledButton,
                { backgroundColor: colors.btnColor },
              ]}
              disabled={!isValid}
              onPress={sendWhatsappCode}
            >
              <MaterialCommunityIcons
                name="whatsapp"
                size={20}
                color={colors.btnTextColor}
              />
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: colors.btnTextColor },
                ]}
              >
                {' '}
                Verify via WhatsApp
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {step === 'verifyCode' && (
          <View>
            <Text style={[styles.instructionText, { color: colors.text }]}>
              Enter the 6-digit code sent to{formattedValue}
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
                timer < 60 ? { color: PRIMARY_COLOR } : { color: colors.text },
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
              <Text style={[styles.buttonText, { color: colors.btnTextColor }]}>
                {isSubmitting ? 'Verifying...' : 'Verify & Update'}
              </Text>
            </TouchableOpacity>
          </View>
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
    borderRadius: 15,
    alignContent: 'center',
  },
  header: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  phoneNumberText: {
    flex: 1,
    marginHorizontal: 5,
    fontSize: 14,
  },
  phoneInputContainer: {
    width: '100%',
    height: 60,
    borderRadius: 15,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    marginBottom: 15,
  },
  phoneTextContainer: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    alignContent: 'center',
    marginTop: 15,
  },
  disabledButton: {
    backgroundColor: PRIMARY_COLOR_TINT,
  },
  errorText: {
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    fontSize: 11,
  },
  inlineButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    alignContent: 'center',
    marginVertical: 20,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  emptyEmailText: {
    fontSize: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 15,
  },
  primaryButtonText: {
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  instructionText: {
    fontSize: 14,
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
  timerText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  cancelButton: {
    marginTop: 15,
    alignContent: 'center',
    width: '80%',
    alignSelf: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
  },
  cancelButtonText: {

    fontSize: 14,
    fontWeight: '600',
  },
});