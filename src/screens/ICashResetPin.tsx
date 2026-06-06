import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '@components/Classroomcomponent';
import { resetICashPin } from '../api/localPostApis';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = StackScreenProps<RootStackParamList, 'ICashResetPin'>;

export const ICashResetPin = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [step, setStep] = useState<'otp' | 'pin'>('otp');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const handleTextChange = async (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');

    if (step === 'otp') {
      setOtp(cleaned);
      if (cleaned.length === 6) {
        setStep('pin');
      }
    } else {
      setNewPin(cleaned);
      if (cleaned.length === 6) {
        submitReset(cleaned);
      }
    }
  };
  const submitReset = async (finalPin: string) => {
    setLoading(true);
    try {
      const response = await resetICashPin(otp, finalPin);
      if (response.success) {
        navigation.replace('ICashDashboard', { refresh: true });
      } else {
        Toast.show({ type: 'error', text1: 'Failed', text2: response.message });
        setOtp('');
        setNewPin('');
        setStep('otp');
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Connection failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons
          name="lock-reset-outlined"
          size={60}
          color={colors.primary}
        />
        <Text style={[styles.title, { color: colors.textDarker }]}>
          {step === 'otp' ? 'Verify OTP' : 'iCash Security PIN'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          {step === 'otp'
            ? 'Enter the 6-digit code sent to your email.'
            : 'Create a new iCash security PIN'}
        </Text>
        <TextInput
          ref={inputRef}
          value={step === 'otp' ? otp : newPin}
          onChangeText={handleTextChange}
          maxLength={6}
          keyboardType="number-pad"
          style={[styles.hiddenInput, { fontSize: 14, color: colors.primary }]}
        />

        <Pressable
          style={styles.pinRow}
          onPress={() => inputRef.current?.focus()}
        >
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                (step === 'otp' ? otp.length : newPin.length) > i &&
                  styles.dotFilled,
              ]}
            />
          ))}
        </Pressable>
      </View>
      {loading && (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignContent: 'center', padding: 15 },
  subContainer: {
    alignContent: 'center',
    padding: 15,
    borderRadius: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  pinRow: { flexDirection: 'row', marginVertical: 30, gap: 10 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR_TINT,
  },
  dotFilled: { borderColor: PRIMARY_COLOR },
});