import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import OTPInputs from 'react-native-otp-inputs';
import type { RootStackParamList } from '../../App';
import Toast from 'react-native-toast-message';
import { PRIMARY_COLOR_TINT } from '@components/Classroomcomponent';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { verifyPaymentOtpAPI } from '../api/localPostApis';
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOTP'>;

export const VerifyOTP = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { flw_ref, type } = route.params;
  const [_otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleVerify = async (otpCode: string) => {
    setIsLoading(true);
    try {
      const result = await verifyPaymentOtpAPI({
        otpCode,
        flw_ref,
        type,
      });
      setIsLoading(false);
      if (result.success) {
        navigation.navigate('ICashBuyPage', { refresh: true });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Verification Error',
          text2: result.message,
        });
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
    } finally {
      setIsLoading(false);
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
          name="security-outlined"
          size={60}
          color={colors.primary}
        />
        <Text style={[styles.title, { color: colors.textDarker }]}>
          Verify Transaction
        </Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          Enter the OTP sent to your phone or email
        </Text>
        <OTPInputs
          autofillFromClipboard={true}
          handleChange={code => {
            setOtp(code);
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