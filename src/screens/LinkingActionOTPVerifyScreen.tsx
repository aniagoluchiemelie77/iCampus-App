import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import OTPInputs from 'react-native-otp-inputs';
import type { RootStackParamList } from '../../App';
import Toast from 'react-native-toast-message';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { verifyPaymentOtpAPI } from '../api/localPostApis';
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOTP'>;

export const VerifyOTP = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { flw_ref, type } = route.params;
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = useCallback(
    async (otpCode: string) => {
      setIsLoading(true);
      try {
        const result = await verifyPaymentOtpAPI({
          otpCode,
          flw_ref,
          type,
        });

        if (result.success) {
          // Use replace to prevent user from going back to the OTP screen
          navigation.replace('ICashBuyPage', { refresh: true });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Verification Failed',
            text2: result.message || 'Invalid OTP',
          });
        }
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: 'Connection Error',
          text2: 'Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [flw_ref, type, navigation],
  );

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
        />
        <Text style={[styles.title, { color: colors.textDarker }]}>
          Verify Transaction
        </Text>

        <OTPInputs
          autofillFromClipboard={true}
          editable={!isLoading}
          handleChange={code => {
            if (code.length === 6) handleVerify(code);
          }}
          numberOfInputs={6}
          style={styles.otpContainer}
          inputStyles={[styles.otpInput, { color: colors.primary }]}
        />

        {isLoading && (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 20 }}
          />
        )}
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, alignContent: 'center' },
  subContainer: {
    padding: 20,
    alignContent: 'center',
    borderRadius: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginHorizontal: 10,
  },
  otpInput: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
});
