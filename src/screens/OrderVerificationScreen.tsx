import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App.tsx';
import { useTheme } from '../context/ThemeContext';
import { Vibration } from 'react-native';
import { IcampusWatermark } from '../assets/styles/Watermark.tsx';
import { CustomButton } from '../assets/components/AppUIComponents';
import { FloatingSuccessIcon } from '../components/EmptyFlatlistComponent';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'OrderVerificationSuccess'
>;

export const OrderVerificationSuccess = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const {
    amount = 0,
    role = 'user',
    productName = 'N/A',
    orderId = '000',
  } = route.params || {};
  useEffect(() => {
    Vibration.vibrate(100);
  }, []);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IcampusWatermark />
      <View
        style={[
          styles.subContainer,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
            zIndex: 10,
          },
        ]}
      >
        <FloatingSuccessIcon size={42} />
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          TRANSACTION COMPLETE
        </Text>
        <Text style={[styles.congrats, { color: colors.textDarker }]}>
          Transaction finalized
        </Text>
        <Text style={[styles.label, { color: colors.text }]}>
          {role === 'agent' ? 'Commission Earned' : 'Sale Proceeds'}
        </Text>
        <CurrencyDisplay value={amount} size="large" />
        <Text style={[styles.details, { color: colors.text }]}>
          Item: {productName}
        </Text>
        <Text style={[styles.subDetail, { color: colors.text }]}>
          Order ID: #{orderId}
        </Text>

        <Text style={[styles.infoText, { color: colors.text }]}>
          The funds have been added to your payout balance awaiting withdrawal.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Home', { activeTab: 'home' })}
        >
          <Text style={[styles.backHome, { color: colors.primary }]}>
            Back to Home
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    position: 'relative',
  },
  subContainer: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 4,
  },
  congrats: { fontSize: 22, fontWeight: '800', marginVertical: 12, textAlign: 'center' },
  label: { fontSize: 14, letterSpacing: 1, marginBottom: 15 },
  details: { fontSize: 14, marginVertical: 15 },
  subDetail: { fontSize: 12, marginBottom: 15 },
  infoText: { textAlign: 'center', fontSize: 14, marginBottom: 20 },
  button: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  buttonText: { fontWeight: 'bold', fontSize: 14 },
  backHome: { fontSize: 14, fontWeight: '600' },
});
