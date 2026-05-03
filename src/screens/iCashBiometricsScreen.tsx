import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, AppState, AppStateStatus, TextInput, Pressable } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { StackScreenProps } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; 
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '@components/Classroomcomponent';
import { RootStackParamList } from '../../App';
import Toast from 'react-native-toast-message';
import toastConfig from '@components/ToastConfig';
import {
  requestPinReset,
  setupICashPin,
  verifyICashPin,
} from '../api/localPostApis';

type Props = StackScreenProps<RootStackParamList, 'iCashSecurity'>;
const rnBiometrics = new ReactNativeBiometrics();

export const ICashSecurityGateway = ({ route, navigation }: Props) => {
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [attempts, setAttempts] = useState(0);
  const [showResetPin, setShowResetPin] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const isRegistration = route.params?.isRegistration;
  const appState = useRef(AppState.currentState);
  const MAX_ATTEMPTS = 5;

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPin(cleaned);
    if (cleaned.length === 6) {
      if (isRegistration) {
        handleRegistrationFlow(cleaned);
      } else {
        verifyPin(cleaned);
      }
    }
  };
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
  const handleRegistrationFlow = (finalPin: string) => {
    if (!isConfirming) {
      // Move to confirmation step
      setConfirmPin(finalPin);
      setPin('');
      setIsConfirming(true);
    } else {
      // Check if both match
      if (finalPin === confirmPin) {
        registerNewPin(finalPin);
      } else {
        triggerShake();
        setPin('');
        Toast.show({
          type: 'error',
          text1: 'Mismatch',
          text2: 'PINs do not match. Try again.',
        });
        setIsConfirming(false);
        setConfirmPin('');
      }
    }
  };
  const registerNewPin = async (finalPin: string) => {
    try {
      const response = await setupICashPin(finalPin);
      if (response.success) {
        navigation.replace('ICashDashboard', { refresh: true });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to set PIN' });
    }
  };
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

  const triggerShake = () => {
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
  };
  const handleSuspension = () => {
    navigation.navigate('SuspendedScreen', { reason: 'Too many PIN attempts' });
  };
  const verifyPin = async (finalPin: string) => {
    try {
      const response = await verifyICashPin(finalPin);
      if (response.success) {
        navigation.replace('ICashDashboard', { refresh: true });
      } else {
        triggerShake();
        setShowResetPin(true);
        setPin('');
        if (response.attemptsRemaining !== undefined) {
          setAttempts(MAX_ATTEMPTS - response.attemptsRemaining);
        }
        Toast.show({
          type: 'error',
          text1: 'Security',
          text2: response.message,
        });
        if (response.isSuspended) {
          handleSuspension();
        }
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Connection failed' });
    }
  };
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
    setTimeout(() => inputRef.current?.focus(), 500);
  }, []);
  return (
    <View style={styles.container}>
      <Icon
        name={isRegistration ? 'shield-plus' : 'shield-lock'}
        size={60}
        color={PRIMARY_COLOR}
        style={{ marginBottom: 20 }}
      />
      <Text style={styles.title}>{getHeaderTitle()}</Text>
      <Text
        style={[
          styles.subtitle,
          attempts > 3 && { color: PRIMARY_COLOR, fontWeight: 'bold' },
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
        style={styles.hiddenInput}
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
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                pin.length > i && styles.dotFilled,
                pin.length === i && styles.dotActive, // Optional: highlight current dot
              ]}
            />
          ))}
        </Animated.View>
      </Pressable>
      {showResetPin && (
        <TouchableOpacity
          onPress={handleRequestReset}
          style={{ marginTop: 20, width: '100%', alignSelf: 'flex-end' }}
        >
          <Text style={{ color: PRIMARY_COLOR, fontWeight: '600' }}>
            Forgot PIN?
          </Text>
        </TouchableOpacity>
      )}
      {!isRegistration && (
        <TouchableOpacity
          style={styles.bioButton}
          onPress={handleBiometricAuth}
        >
          <Icon name="fingerprint" size={32} color={PRIMARY_COLOR} />
          <Text style={styles.bioText}>Use Biometrics</Text>
        </TouchableOpacity>
      )}
      <Toast config={toastConfig} />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: PRIMARY_COLOR_TINT,
    marginBottom: 40,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 60,
  },
  cell: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  cellActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  key: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
  },
  keyText: {
    fontSize: 28,
    color: '#1e293b',
    fontWeight: '600',
  },
  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 60 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR_TINT,
    backgroundColor: '#eee7e4',
  },
  dotFilled: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', width: '80%', justifyContent: 'center' },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  pressableArea: {
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  bioButton: {
    marginTop: 40,
    alignItems: 'center',
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#eee7e4',
  },
  bioText: {
    marginLeft: 10,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    fontSize: 16,
  },
  dotActive: {
    borderColor: PRIMARY_COLOR,
    borderWidth: 2,
  },
});