import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App.tsx';

type Props = NativeStackScreenProps<RootStackParamList, 'PayoutSuccess'>;

export const PayoutSuccess = ({ route, navigation }: Props) => {
  const { amount, transactionId } = route.params;

  return (
    <View style={styles.container}>
      <MaterialIcons
        name="account-balance-wallet"
        size={60}
        color={PRIMARY_COLOR}
      />
      
      <Text style={styles.congrats}>Payout Requested!</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Amount Disbursed</Text>
        <CurrencyDisplay value={amount} size="large" />

        <View style={styles.divider} />

        <Text style={styles.details}>To Your iCash Wallet</Text>
        <Text style={styles.details}>Ref: #{transactionId}</Text>
      </View>

      <Text style={styles.infoText}>
        Your payout has been successfully processed. It usually takes a few seconds to reflect in your iCash dashboard.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ICashDashboard', { refresh: true })}
      >
        <Text style={styles.buttonText}>Go to Wallet</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Home', {
            activeTab: 'home'
        })}
      >
        <Text style={styles.backHome}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,  
    alignContent: 'center', 
    backgroundColor: '#fff', 
    padding: 20 
  },
  congrats: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: PRIMARY_COLOR, 
    marginVertical: 20 
  },
  card: { 
    width: '100%', 
    backgroundColor: '#fadccc',
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 20, 
    padding: 25, 
    alignItems: 'center', 
    marginBottom: 20 
  },
  label: { 
    fontSize: 13, 
    color: PRIMARY_COLOR_TINT, 
    letterSpacing: 1.2, 
    marginBottom: 10 
  },
  divider: { 
    height: 1, 
    width: '100%', 
    backgroundColor: '#eee', 
    marginVertical: 15 
  },
  details: { 
    fontSize: 14, 
    color: '#666', 
    marginBottom: 5 
  },
  infoText: { 
    textAlign: 'center', 
    color: '#888', 
    paddingHorizontal: 20, 
    marginBottom: 30,
    lineHeight: 20
  },
  button: { 
    backgroundColor: PRIMARY_COLOR, 
    width: '100%', 
    borderRadius: 12, 
    alignItems: 'center', 
    paddingVertical: 15, 
    marginBottom: 15 
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  backHome: { 
    color: PRIMARY_COLOR, 
    fontSize: 15, 
    fontWeight: '600',
    marginTop: 10
  }
});