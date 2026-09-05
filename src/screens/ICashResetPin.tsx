import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
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

  const submitReset = useCallback(
    async (finalPin: string) => {
      setLoading(true);
      try {
        const response = await resetICashPin(otp, finalPin);
        if (response.success) {
          navigation.replace('ICashDashboard', { refresh: true });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Failed',
            text2: response.message,
          });
          setOtp('');
          setNewPin('');
          setStep('otp');
        }
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Connection failed',
        });
      } finally {
        setLoading(false);
      }
    },
    [otp, navigation],
  );
  const handleTextChange = useCallback(
    (text: string) => {
      if (loading) return;

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
    },
    [step, loading, submitReset],
  );
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MaterialIcons
        name="security"
        size={60}
        color={colors.primary}
        style={{ marginBottom: 25 }}
      />
      <Text style={[styles.title, { color: colors.textDarker }]}>
        {step === 'otp' ? 'Verify OTP' : 'iCash Security PIN'}
      </Text>

      <TextInput
        ref={inputRef}
        value={step === 'otp' ? otp : newPin}
        onChangeText={handleTextChange}
        maxLength={6}
        keyboardType="number-pad"
        editable={!loading}
        secureTextEntry
        selectionColor={colors.primary}
        style={[styles.hiddenInput, { color: colors.textDarker, fontSize: 15 }]}
        autoFocus={true}
      />

      <Pressable
        style={styles.pinRow}
        onPress={() => !loading && inputRef.current?.focus()}
      >
        {[...Array(6)].map((_, i) => {
          const activeValue = step === 'otp' ? otp : newPin;
          const digit = activeValue[i] || '';
          const isActive = activeValue.length === i;

          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  borderColor: isActive ? colors.primary : colors.border,
                  backgroundColor: colors.backgroundSecondary,
                },
                activeValue.length > i && {
                  backgroundColor: colors.primary + '15',
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: 'bold',
                }}
              >
                {digit}
              </Text>
            </View>
          );
        })}
      </Pressable>

      {loading && (
        <ActivityIndicator
          color={colors.primary}
          style={{ marginTop: 20 }}
          size="small"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 30,
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR_TINT,
  },
  dotFilled: { borderColor: PRIMARY_COLOR },
});
