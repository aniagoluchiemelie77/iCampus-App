import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import OTPInputs from 'react-native-otp-inputs'; // Or your preferred OTP lib
import type { RootStackParamList } from '../../App';
import Toast from 'react-native-toast-message';
import toastConfig from '@components/ToastConfig';
import { FLUTTERWAVE_CLIENT_SECRET } from '@env';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; 
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '@components/Classroomcomponent';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOTP'>;

export const VerifyOTP = ({ route, navigation }: Props) => {

  const { flw_ref, type } = route.params;
  const [_otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleVerify = async (otpCode: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('https://api.flutterwave.com/v3/validate-charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${FLUTTERWAVE_CLIENT_SECRET}`,
        },
        body: JSON.stringify({
          otp: otpCode,
          flw_ref: flw_ref,
          type, // or 'account' based on the 'type' param
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
          navigation.navigate('ICashBuyPage', { refresh: true });
      } else {
        Toast.show({ type: 'error', text1: 'Verification Error', text2: result.message });
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
        <Icon 
            name={"shield-lock"} 
            size={60} 
            color={PRIMARY_COLOR} 
            style={{ marginBottom: 20 }} 
        />
      <Text style={styles.title}>Verify Transaction</Text>
      <Text style={styles.subtitle}>Enter the OTP sent to your phone or email</Text>
      <OTPInputs
        autofillFromClipboard={true}   
        handleChange={(code) => {
            setOtp(code);
            if (code.length === 6) handleVerify(code);
        }}
        numberOfInputs={6}
        style={styles.otpContainer}
        inputStyles={styles.otpInput}
       />

      {isLoading && <ActivityIndicator size="large" color={PRIMARY_COLOR} style={{ marginTop: 20 }} />}
      <Toast config={toastConfig} />
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#FFF', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: PRIMARY_COLOR },
  subtitle: { fontSize: 14, color: PRIMARY_COLOR_TINT, textAlign: 'center', marginBottom: 30 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 10 },
  otpInput: {
    width: 45,
    height: 50,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: PRIMARY_COLOR_TINT,
  },
});