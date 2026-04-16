import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '@components/Classroomcomponent';

export const iCashBuySuccessScreen = ({ route, navigation }: any) => {
  const { amountPurchased, amountPaid, currency } = route.params;
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon name="checkmark" size={85} color="#FFF" />
      </View>

      <Text style={styles.title}>Purchase Successful!</Text>
      <View style={styles.amountContainer}>
        <View style={styles.diamondRow}>
          <Icon
            name="diamond"
            size={32}
            color={PRIMARY_COLOR}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.amountValue}>
            {amountPurchased.toLocaleString()}
          </Text>
        </View>
      </View>
      <View style={styles.receiptContainer}>
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Amount Paid</Text>
          <Text style={styles.receiptValue}>
            {currency} {amountPaid}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('iCashDashboard', { refresh: true })}
      >
        <Text style={styles.buttonText}>Go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 10,
  },
  amountContainer: {
    backgroundColor: '#fadccc',
    padding: 24,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    marginBottom: 20,
  },
  diamondRow: { flexDirection: 'row', alignItems: 'center' },
  amountValue: { fontSize: 36, fontWeight: '800', color: PRIMARY_COLOR },

  receiptContainer: {
    width: '100%',
    backgroundColor: '#fadccc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  receiptLabel: { color: PRIMARY_COLOR_TINT, fontSize: 14 },
  receiptValue: { fontWeight: '600', color: PRIMARY_COLOR_TINT, fontSize: 14 },
  button: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 10,
  },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
});

export default iCashBuySuccessScreen;