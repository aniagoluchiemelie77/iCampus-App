import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  InteractionManager,
  View,
  Text,
  TextInput,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';
import Toast from 'react-native-toast-message';
import { verifyICashPin, requestPinReset } from '../api/localPostApis';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
const rnBiometrics = new ReactNativeBiometrics();

interface PinVerificationProps {
  isVisible: boolean;
  onSuccess: (data?: any) => void;
  onClose: () => void;
  title?: string | 'Enter iCash PIN';
  navigation: any;
}
export const IcashPinOrFingerprintVerifyModal = ({
  navigation,
  isVisible,
  onSuccess,
  title,
  onClose,
}: PinVerificationProps) => {
  const { colors } = useTheme();
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

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
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnimation]);

  const handleBiometricAuth = useCallback(async () => {
    try {
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) return;

      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Confirm identity',
      });
      if (success) onSuccess();
    } catch (error) {
      // Biometric prompt cancelled or failed
    }
  }, [onSuccess]);

  const verifyPin = useCallback(
    async (code: string) => {
      if (isProcessing) return;
      setIsProcessing(true);

      try {
        const response = await verifyICashPin(code);
        if (response.success) {
          onSuccess();
        } else if (response.isSuspended) {
          onClose();
          navigation.navigate('SuspendedScreen', { reason: response.message });
        } else {
          setPin('');
          triggerShake();
          Toast.show({
            type: 'error',
            text2: `Invalid PIN, ${response.attemptsRemaining} attempts remaining.`,
          });
        }
      } catch (err) {
        Toast.show({ type: 'error', text1: 'Connection Error' });
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, navigation, onSuccess, onClose, triggerShake],
  );

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPin(cleaned);
    if (cleaned.length === 6) verifyPin(cleaned);
  };

  useEffect(() => {
    if (isVisible) {
      setPin('');
      InteractionManager.runAfterInteractions(() => {
        handleBiometricAuth();
      });
    }
  }, [isVisible, handleBiometricAuth]);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.bottomSheet,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textDarker }]}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.pinContainer}>
            <TextInput
              ref={inputRef}
              value={pin}
              onChangeText={handleTextChange}
              maxLength={6}
              keyboardType="number-pad"
              secureTextEntry
              style={styles.hiddenInput}
              autoFocus
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
                      { borderColor: colors.border },
                      pin.length > i && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                  />
                ))}
              </Animated.View>
            </Pressable>

            <View style={styles.pinActionRow}>
              <TouchableOpacity
                onPress={handleBiometricAuth}
                style={styles.iconBtn}
                accessibilityRole="button"
              >
                <MaterialIcons
                  name="fingerprint"
                  size={28}
                  color={colors.primary}
                />
                <Text style={{ color: colors.primary }}>Use Fingerprint</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={requestPinReset}
                accessibilityRole="button"
              >
                <Text style={{ color: colors.primary }}>Forgot PIN?</Text>
              </TouchableOpacity>
            </View>

            {isProcessing && (
              <ActivityIndicator
                style={{ marginTop: 20 }}
                color={colors.primary}
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
    backgroundColor: 'transparent',
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
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '600',
  },
  forgotText: {
    fontSize: 14,
  },
  pinContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  pinSubtitle: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
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
    fontWeight: 'bold',
  },
});