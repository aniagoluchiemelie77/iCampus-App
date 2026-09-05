import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, AppState, AppStateStatus, TextInput, Pressable } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { StackScreenProps } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { RootStackParamList } from '../../App';
import Toast from 'react-native-toast-message';
import {
  requestPinReset,
  setupICashPin,
  verifyICashPin,
} from '../api/localPostApis';
import { ICASH_PIN_MAX_ATTEMPTS } from '../constants/inAppConstants';
import { useTheme } from '../context/ThemeContext';
import { useAppSelector } from '../hooks/hooks';
import { useDispatch } from 'react-redux';
import { setUser } from '../context/UserSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = StackScreenProps<RootStackParamList, 'iCashSecurity'>;
const rnBiometrics = new ReactNativeBiometrics();

export const ICashSecurityGateway = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const user = useAppSelector(state => state.user) || {};
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [attempts, setAttempts] = useState(0);
  const [showResetPin, setShowResetPin] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const isRegistration =
    user.hasIcashPin === false || route.params?.isRegistration;
  const [isProcessing, setIsProcessing] = useState(false);
  const appState = useRef(AppState.currentState);
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnimation]);
  const handleSuspension = useCallback(() => {
    navigation.navigate('SuspendedScreen', { reason: 'Too many PIN attempts' });
  }, [navigation]);
  const handleRequestReset = async () => {
    try {
      const response = await requestPinReset();
      if (response.success) {
        navigation.navigate('ICashResetPin');
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not request reset.',
      });
    }
  };
  const handleBiometricAuth = useCallback(async () => {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    const isHardwareReady =
      available &&
      (biometryType === BiometryTypes.FaceID ||
        biometryType === BiometryTypes.TouchID ||
        biometryType === BiometryTypes.Biometrics);

    if (isHardwareReady) {
      try {
        const { success } = await rnBiometrics.simplePrompt({
          promptMessage: 'Confirm identity to unlock iCash',
        });
        if (success) navigation.replace('ICashDashboard', { refresh: true });
      } catch (error) {
        console.log('Biometric cancelled');
      }
    } else {
      console.log('Biometrics not supported or not enrolled');
    }
  }, [navigation]);
  const verifyPin = useCallback(
    async (finalPin: string) => {
      try {
        const response = await verifyICashPin(finalPin);
        if (response.success) {
          navigation.replace('ICashDashboard', { refresh: true });
        } else {
          triggerShake();
          setShowResetPin(true);
          setPin('');
          if (response.attemptsRemaining !== undefined) {
            setAttempts(ICASH_PIN_MAX_ATTEMPTS - response.attemptsRemaining);
          }
          Toast.show({
            type: 'error',
            text1: 'Security',
            text2: response.message,
          });
          if (response.isSuspended) handleSuspension();
        }
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Connection failed',
        });
      }
    },
    [navigation, triggerShake, handleSuspension],
  );
  const registerNewPin = useCallback(
    async (finalPin: string) => {
      try {
        const response = await setupICashPin(finalPin);
        if (response.success) {
          const updatedUser = { ...user, hasIcashPin: true };
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          dispatch(setUser(updatedUser));

          navigation.replace('ICashDashboard', { refresh: true });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: response.message || 'Failed to set PIN',
          });
        }
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to set PIN',
        });
      }
    },
    [navigation],
  );
  const handleRegistrationFlow = useCallback(
    (finalPin: string) => {
      if (!isConfirming) {
        setConfirmPin(finalPin);
        setPin('');
        setIsConfirming(true);
      } else {
        if (finalPin === confirmPin) {
          registerNewPin(finalPin);
        } else {
          triggerShake();
          setPin('');
          Toast.show({
            type: 'error',
            text1: 'Mismatch',
            text2: 'PINs do not match.',
          });
          setIsConfirming(false);
          setConfirmPin('');
        }
      }
    },
    [isConfirming, confirmPin, triggerShake, registerNewPin],
  );
  const getHeaderTitle = () => {
    if (!isRegistration) return 'iCash Security PIN';
    return isConfirming
      ? 'Confirm your iCash Security PIN'
      : 'Create iCash Security PIN';
  };
  const getSubtitle = () => {
    if (isRegistration)
      return isConfirming
        ? 'Please re-enter your PIN to confirm'
        : 'Create 6-Digit login PIN for your iCash transactions';
    return attempts > 0
      ? `${5 - attempts} attempts remaining`
      : 'Enter 6-Digit iCash Security PIN';
  };
  const handleTextChange = useCallback(
    async (text: string) => {
      if (isProcessing) return;

      const cleaned = text.replace(/[^0-9]/g, '');
      setPin(cleaned);

      if (cleaned.length === 6) {
        setIsProcessing(true); // Lock input
        if (isRegistration) {
          handleRegistrationFlow(cleaned);
        } else {
          await verifyPin(cleaned);
        }
        setIsProcessing(false);
      }
    },
    [isProcessing, isRegistration, handleRegistrationFlow, verifyPin],
  );
  useEffect(() => {
    if (!isRegistration) {
      handleBiometricAuth();
    }
  }, [handleBiometricAuth, isRegistration]);
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          setPin('');
        }
        appState.current = nextAppState;
      },
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    const task = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(task);
  }, []);
  useEffect(() => {
    return () => {
      setPin('');
      setConfirmPin('');
    };
  }, []);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MaterialIcons
        name="security"
        size={60}
        color={colors.primary}
        style={{ marginBottom: 25 }}
      />
      <Text style={[styles.title, { color: colors.textDarker }]}>
        {getHeaderTitle()}
      </Text>
      <Text
        style={[
          styles.subtitle,
          attempts > 3 ? { color: colors.primary } : { color: colors.text },
        ]}
      >
        {getSubtitle()}
      </Text>
      <TextInput
        ref={inputRef}
        value={pin}
        onChangeText={handleTextChange}
        maxLength={6}
        keyboardType="number-pad"
        secureTextEntry
        selectionColor={colors.primary}
        style={[styles.hiddenInput, { color: colors.textDarker, fontSize: 15 }]}
        autoFocus={true}
      />
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={styles.pressableArea}
      >
        <Animated.View
          style={[
            styles.pinRow,
            { transform: [{ translateX: shakeAnimation }] },
          ]}
        >
          {[...Array(6)].map((_, i) => {
            const digit = pin[i] || '';
            const isActive = pin.length === i;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    borderColor: isActive ? colors.primary : colors.border,
                    backgroundColor: colors.backgroundSecondary,
                  },
                  pin.length > i && {
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
        </Animated.View>
      </Pressable>
      {showResetPin && (
        <TouchableOpacity
          onPress={handleRequestReset}
          style={{ alignSelf: 'flex-end' }}
        >
          <Text style={[styles.resetText, { color: colors.primary }]}>
            Forgot PIN?
          </Text>
        </TouchableOpacity>
      )}
      {!isRegistration && (
        <TouchableOpacity
          style={styles.bioButton}
          onPress={handleBiometricAuth}
        >
          <MaterialIcons name="fingerprint" size={32} color={colors.primary} />
          <Text style={[styles.bioText, { color: colors.primary }]}>
            Use Biometrics
          </Text>
        </TouchableOpacity>
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
    marginBottom: 25,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 60,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
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
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  pressableArea: {
    width: '100%',
    alignItems: 'center',
  },
  bioButton: {
    marginTop: 20,
    alignItems: 'center',
    flexDirection: 'row',
  },
  bioText: {
    marginLeft: 7,
    fontWeight: 'bold',
    fontSize: 14,
  },
  dotActive: {
    borderColor: PRIMARY_COLOR,
    borderWidth: 2,
  },
  resetText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});