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
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { useAppSelector } from '../components/hooks';
import {
  handleSendWhatsAppCode,
  verifyPhoneOTPAPI,
} from '../api/localPostApis.ts';
import { formatSignupTime } from '../utils/ChatTimestampFormatter.ts';
import { handleDeletePhone } from '../api/localDeleteApis.ts';
import { updatePhoneNumbersData } from '../components/UserSlice.ts';
import { useDispatch } from 'react-redux';

export const PhoneScreen = () => {
  const user = useAppSelector(state => state.user);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedValue, setFormattedValue] = useState('');
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
    <ScrollView style={styles.container}>
      <PageHeader title="Phone Numbers" />
      <View style={styles.section}>
        <Text style={styles.header}>Saved Numbers</Text>
        {user.phoneNumbers ? (
          user.phoneNumbers?.map(item => (
            <View key={item.number} style={styles.phoneRow}>
              <MaterialIcons
                name="smartphone-outlined"
                size={20}
                color="#222"
              />
              <Text style={styles.phoneNumberText}>{item.number}</Text>
              {item.isVerified && (
                <MaterialIcons
                  name="verified-user-outlined"
                  size={20}
                  color={PRIMARY_COLOR}
                  style={styles.verifiedIcon}
                />
              )}
              <TouchableOpacity
                onPress={() => handleDeleteRecovery(item.number)}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={20}
                  color={PRIMARY_COLOR}
                />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.emptyEmailText}>No phone numbers added.</Text>
        )}
        <TouchableOpacity
          style={styles.inlineButton}
          onPress={() => {
            setStep('phoneInput');
          }}
        >
          <Text style={styles.buttonText}>Add Phone Number</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionCard}>
        <Text style={styles.cardTitle}>Add WhatsApp Number</Text>
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
            />
            {!isValid && phoneNumber.length > 0 && (
              <Text style={styles.errorText}>
                Invalid number for {countryCode}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.primaryButton, !isValid && styles.disabledButton]}
              disabled={!isValid}
              onPress={sendWhatsappCode}
            >
              <MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}> Verify via WhatsApp</Text>
            </TouchableOpacity>
          </View>
        )}
        {step === 'verifyCode' && (
          <View>
            <Text style={styles.instructionText}>
              Enter the 6-digit code sent to{formattedValue}
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
              style={[styles.timerText, timer < 60 && { color: PRIMARY_COLOR }]}
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  phoneNumberText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#222',
  },
  verifiedIcon: {
    marginRight: 10,
  },
  phoneInputContainer: {
    width: '100%',
    height: 60,
    borderRadius: 10,
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT,
    marginBottom: 10,
    backgroundColor: '#fadccc'
  },
  phoneTextContainer: {
    backgroundColor: '#FFF',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  primaryButton: {
    backgroundColor: PRIMARY_COLOR, 
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
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
  emptyEmailText: {
    padding: 15,
    fontSize: 14,
    color: PRIMARY_COLOR_TINT,
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
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4
  },
  instructionText: {
    fontSize: 14,
    color: '#2222',
    marginBottom: 12,
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
   timerText: {
    color: '#2222',
    fontWeight: 'bold',
    fontSize: 12,
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
});