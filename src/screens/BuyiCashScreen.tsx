import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { PRIMARY_COLOR } from '@components/Classroomcomponent';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import toastConfig from '@components/ToastConfig';

export const ICashBuyPage = ({ navigation }: any) => {
  const [amount, setAmount] = useState('');
  const [iCashEquivalent, setICashEquivalent] = useState('0.00');
  const user = useSelector((state: any) => state.user.userData);
  const hasPaymentMethod = user?.userAccountDetails?.length > 0;

  const EXCHANGE_RATE_USD = 0.74; 
  const USD_TO_LOCAL = 1550; // Dynamic rate (fetch this from your backend later)

  useEffect(() => {
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount) && numericAmount > 0) {
      // Logic: User inputs local currency, show iCash they get
      // Local -> USD -> iCash
      const inUsd = numericAmount / USD_TO_LOCAL;
      const calculatedICash = inUsd / EXCHANGE_RATE_USD;
      setICashEquivalent(calculatedICash.toFixed(2));
    } else {
      setICashEquivalent('0.00');
    }
  }, [amount]);

  const handleProceed = () => {
  // 1. Check if the input is valid first
  const numericAmount = parseFloat(amount);
  if (!numericAmount || numericAmount <= 0) {
    Toast.show({ type: 'info', text1: 'Amount Required', text2: 'Please enter how much iCash you want to buy.' });
    return;
  }

  // 2. The Payment Method Gateway
  if (!hasPaymentMethod) {
    // Open as a modal to add a card
    navigation.navigate('AddPaymentMethod', {
      onSuccess: () => {
        // This callback is useful if you want to trigger 
        // something once they finish adding the card
      }
    });
    return;
  }

  // 3. Trigger Flutterwave Payment Modal
  navigation.navigate('FlutterwavePayment', { 
    amount: numericAmount,
    iCashToCredit: parseFloat(iCashEquivalent),
    currency: 'NGN', // Assuming local currency based on your context
    email: user.email,
    firstname: user.firstname
  });
};

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Enter Amount to Buy</Text>
      <View style={styles.inputContainer}>
        <Text style={styles.currencyPrefix}>₦</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      <View style={styles.exchangeCard}>
        <View style={styles.exchangeRow}>
          <Text style={styles.exchangeText}>Exchange Rate</Text>
          <Text style={styles.exchangeValue}>1 iCash ≈ ₦{(EXCHANGE_RATE_USD * USD_TO_LOCAL).toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>You will receive:</Text>
          <Text style={styles.resultValue}>{iCashEquivalent} iCash</Text>
        </View>
      </View>

      {!hasPaymentMethod && (
        <View style={styles.warningBox}>
          <Icon name="alert-circle" size={20} color="#b45309" />
          <Text style={styles.warningText}>
            You haven't added a payment method. Please add a bank account or card to continue.
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.buyBtn, (!amount || parseFloat(amount) <= 0) && { opacity: 0.5 }]}
        onPress={handleProceed}
        disabled={!amount || parseFloat(amount) <= 0}
      >
        <Text style={styles.buyBtnText}>
          {hasPaymentMethod ? 'Pay with Flutterwave' : 'Add Payment Method'}
        </Text>
      </TouchableOpacity>
      <Toast config={toastConfig} />
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    marginTop: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 70,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  exchangeCard: {
    backgroundColor: '#fff7f2', // Tint of your primary color
    borderRadius: 20,
    padding: 20,
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  exchangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  exchangeText: {
    fontSize: 13,
    color: '#9a3412',
    fontWeight: '500',
  },
  exchangeValue: {
    fontSize: 13,
    color: '#9a3412',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#fed7aa',
    marginVertical: 10,
    opacity: 0.5,
  },
  resultRow: {
    marginTop: 5,
  },
  resultLabel: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 32,
    fontWeight: '800',
    color: PRIMARY_COLOR,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    padding: 15,
    borderRadius: 12,
    marginTop: 25,
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    marginLeft: 10,
    lineHeight: 18,
  },
  buyBtn: {
    backgroundColor: '#0f172a', // Dark navy for contrast
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});