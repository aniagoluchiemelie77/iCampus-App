import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App.tsx';
import { useTheme } from '../context/ThemeContext';
import { Vibration } from 'react-native';

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
      <View
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons
          name="check-circle-outlined"
          size={50}
          color={colors.primary}
        />
        <Text style={[styles.congrats, { color: colors.textDarker }]}>
          Transaction Finalized!
        </Text>
        <Text style={[styles.label, { color: colors.text }]}>
          {role === 'agent' ? 'Commission Earned' : 'Sale Proceeds'}
        </Text>
        <CurrencyDisplay value={amount} size="large" isSuccess={true} />
        <Text style={[styles.details, { color: colors.text }]}>
          Item: {productName}
        </Text>
        <Text style={[styles.subDetail, { color: colors.text }]}>
          Order ID: #{orderId}
        </Text>

        <Text style={[styles.infoText, { color: colors.text }]}>
          The funds have been added to your wallet balance and are ready for
          use.
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.btnColor }]}
          onPress={() =>
            navigation.navigate('ICashDashboard', {
              refresh: true,
            })
          }
        >
          <Text style={[styles.buttonText, { color: colors.btnTextColor }]}>
            View Wallet
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Home', { activeTab: 'store' })}
        >
          <Text style={[styles.backHome, { color: colors.primary }]}>
            Back to Dashboard
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignContent: 'center', padding: 15 },
  subContainer: { alignContent: 'center', padding: 20, borderRadius: 15 },
  animation: { width: 150, height: 150 },
  congrats: { fontSize: 18, fontWeight: 'bold', marginVertical: 20 },
  label: { fontSize: 14, letterSpacing: 1, marginBottom: 15 },
  details: { fontSize: 14, marginVertical: 15 },
  subDetail: { fontSize: 12, marginBottom: 15 },
  infoText: { textAlign: 'center', fontSize: 14, marginBottom: 20 },
  button: {
    width: '80%',
    paddingHorizontal: 15,
    borderRadius: 15,
    alignContent: 'center',
    paddingVertical: 10,
    marginBottom: 15,
  },
  buttonText: { fontWeight: 'bold', fontSize: 14 },
  backHome: { fontSize: 14, fontWeight: '600' },
});
