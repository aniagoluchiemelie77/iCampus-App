import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, Animated, ActivityIndicator, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {PRIMARY_COLOR, PRIMARY_COLOR_TINT} from './Classroomcomponent';
import { baseUrl } from '../components/HomeScreenComponents';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const rnBiometrics = new ReactNativeBiometrics();

interface PinVerificationProps {
  isVisible: boolean;
  onSuccess: (data?: any) => void;
  onClose: () => void;
  title?: string | 'Enter iCash PIN';
  navigation: any
}
export const IcashPinOrFingerprintVerifyModal = ({navigation, isVisible, onSuccess, title, onClose} : PinVerificationProps) => {
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // --- 1. Animation Logic ---
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // --- 2. Biometric Logic ---
  const handleBiometricAuth = useCallback(async () => {
    const { available } = await rnBiometrics.isSensorAvailable();
    if (!available) return;

    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Confirm identity',
      });
      if (success) onSuccess();
    } catch (error) {
      console.log('Biometrics cancelled');
    }
  }, [onSuccess]);

  // --- 3. API Logic ---
  const verifyPin = async (code: string) => {
    setIsProcessing(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}user/verify-icash-pin`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ pin: code }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        setPin('');
        triggerShake();
        Toast.show({ type: 'error', text1: 'Invalid PIN' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Connection Error' });
    } finally {
      setIsProcessing(false);
    }
  };
  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPin(cleaned);
    if (cleaned.length === 6) {
      verifyPin(cleaned);
    }
  };
  const handleRequestReset = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}user/request-pin-reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'OTP Sent',
          text2: 'Check your email for the reset code.',
        });
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
  useEffect(() => {
    if (isVisible) {
      setPin('');
      handleBiometricAuth();
    }
  }, [isVisible, handleBiometricAuth]);
  return (
    <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
    >
        <View style={styles.modalOverlay}>
            <View style={styles.bottomSheet}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Icon name="close" size={24} color={PRIMARY_COLOR_TINT} />
                    </TouchableOpacity>
                </View>
                <View style={styles.pinContainer}>
                    <Text style={styles.pinSubtitle}>
                        Enter your 6-digit iCash PIN
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
                                        pin.length === i && styles.dotActive,
                                    ]}
                                />
                            ))}
                        </Animated.View>
                    </Pressable>
                    <View style={styles.pinActionRow}>
                        <TouchableOpacity
                            onPress={handleBiometricAuth}
                            style={styles.iconBtn}
                        >
                            <Icon
                                name="fingerprint"
                                size={28}
                                color={PRIMARY_COLOR}
                            />
                            <Text style={styles.iconBtnText}>Use Fingerprint</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleRequestReset}>
                            <Text style={styles.forgotText}>Forgot PIN?</Text>
                        </TouchableOpacity>
                    </View>
                    {isProcessing && (
                        <ActivityIndicator
                            style={{ marginTop: 20 }}
                            color={PRIMARY_COLOR}
                        />
                    )}
                </View>
            </View>
        </View>
    </Modal>
  );
};
export const styles = StyleSheet.create({
    pinInput: {
    letterSpacing: 20,
    fontSize: 24,
    textAlign: 'center',
    padding: 20,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  pressableArea: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 15,
  },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR_TINT,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  dotActive: {
    borderColor: PRIMARY_COLOR,
  },
  pinActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtnText: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  forgotText: {
    color: PRIMARY_COLOR,
    fontSize: 14,
  },
  pinContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  pinSubtitle: {
    fontSize: 14,
    color: PRIMARY_COLOR_TINT,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    color: PRIMARY_COLOR_TINT,
    fontWeight: 'bold',
  },
})