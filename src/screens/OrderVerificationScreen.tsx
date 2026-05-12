import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {PRIMARY_COLOR, PRIMARY_COLOR_TINT} from '../assets/styles/colors';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App.tsx';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderVerificationSuccess'>;

export const OrderVerificationSuccess = ({ route, navigation }: Props) => {
  const { amount, role, productName, orderId } = route.params;
  return (
    <View style={styles.container}>
      <MaterialIcons
        name="check-circle-outlined"
        size={50}
        color={PRIMARY_COLOR}
      />
      <Text style={styles.congrats}>Transaction Finalized!</Text>
      <View style={styles.card}>
        <Text style={styles.label}>
          {role === 'agent' ? 'Commission Earned' : 'Sale Proceeds'}
        </Text>
        <CurrencyDisplay value={amount} size="large" />

        <View style={styles.divider} />

        <Text style={styles.details}>Item: {productName}</Text>
        <Text style={styles.details}>Order ID: #{orderId}</Text>
      </View>

      <Text style={styles.infoText}>
        The funds have been added to your wallet balance and are ready for use.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          navigation.navigate('ICashDashboard', {
            refresh: true,
          })
        }
      >
        <Text style={styles.buttonText}>View Wallet</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Home', { activeTab: 'store' })}
      >
        <Text style={styles.backHome}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignContent: 'center', backgroundColor: '#fff', padding: 20 },
  animation: { width: 150, height: 150 },
  congrats: { fontSize: 20, fontWeight: 'bold', color: PRIMARY_COLOR, marginVertical: 20 },
  card: { width: '100%', backgroundColor: '#fadccc', borderRadius: 15, padding: 25, alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 14, color: PRIMARY_COLOR_TINT, textTransform: 'capitalize', letterSpacing: 1, marginBottom: 10 },
  divider: { height: 1, width: '80%', backgroundColor: PRIMARY_COLOR_TINT, marginVertical: 15 },
  details: { fontSize: 14, color: '#2222', marginBottom: 5 },
  infoText: { textAlign: 'center', color: PRIMARY_COLOR_TINT, paddingHorizontal: 20, marginBottom: 20 },
  button: { backgroundColor: PRIMARY_COLOR, width: '100%', paddingHorizontal: 15, borderRadius: 10, alignContent: 'center', paddingVertical: 10, marginBottom: 15 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  backHome: { color: PRIMARY_COLOR, fontSize: 14, fontWeight: '600' }
});