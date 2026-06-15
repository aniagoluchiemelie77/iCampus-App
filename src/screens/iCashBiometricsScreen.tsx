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

type Props = StackScreenProps<RootStackParamList, 'iCashSecurity'>;
const rnBiometrics = new ReactNativeBiometrics();
const PinDot = React.memo(({ active }: { active: boolean }) => (
  <View style={[styles.dot, active ? styles.dotActive : null]} />
));
export const ICashSecurityGateway = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [attempts, setAttempts] = useState(0);
  const [showResetPin, setShowResetPin] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const isRegistration = route.params?.isRegistration;
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
  ); // Only include stable functions
  const registerNewPin = useCallback(
    async (finalPin: string) => {
      try {
        const response = await setupICashPin(finalPin);
        if (response.success) {
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

  // 2. Memoize handleRegistrationFlow
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
      if (isProcessing) return; // Guard clause against rapid tapping

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
    setTimeout(() => inputRef.current?.focus(), 500);
  }, []);
  useEffect(() => {
    return () => {
      setPin('');
      setConfirmPin('');
    };
  }, []);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons
          name="security-outlined"
          size={60}
          color={colors.primary}
          style={{ marginBottom: 15 }}
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
          style={[styles.hiddenInput, { color: colors.primary, fontSize: 14 }]}
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
              <PinDot key={i} active={pin.length === i} />
            ))}
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
            <MaterialIcons
              name="fingerprint-outlined"
              size={32}
              color={colors.primary}
            />
            <Text style={[styles.bioText, { color: colors.primary }]}>
              Use Biometrics
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
    padding: 15,
  },
  subContainer: {
    flex: 1,
    alignContent: 'center',
    padding: 15,
    borderRadius: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    fontWeight: 'bold',
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
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR_TINT,
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