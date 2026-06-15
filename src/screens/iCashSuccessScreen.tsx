import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const ICashSuccessScreen = ({ route, navigation }: any) => {
  const { colors } = useTheme();
  const {
    type,
    amount,
    amountPurchased,
    amountPaid,
    currency,
    payout,
    recipientUsername,
  } = route.params;
  const isWithdraw = type === 'withdraw';
  const isP2P = type === 'p2p';
  const successTitle = isP2P
    ? 'Transfer Successful!'
    : isWithdraw
    ? 'Withdrawal Initialized!'
    : 'Purchase Successful!';
  const mainLabel = isWithdraw || isP2P ? 'iCash Debited' : 'iCash Credited';
  const subLabel = isP2P
    ? 'Sent To'
    : isWithdraw
    ? 'Amount to Receive'
    : 'Amount Paid';

  useEffect(() => {
    ReactNativeHapticFeedback.trigger("notificationSuccess", hapticOptions);
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
          size={60}
          color={colors.success}
        />
        <Text style={[styles.title, { color: colors.textDarker }]}>
          {successTitle}
        </Text>
        <View style={styles.amountContainer}>
          <Text style={[styles.miniLabel, { color: colors.text }]}>
            {mainLabel}
          </Text>
          <View style={styles.diamondRow}>
            <Text
              style={[
                styles.amountValue,
                isWithdraw || isP2P
                  ? { color: colors.primary }
                  : { color: colors.success },
              ]}
            >
              {isWithdraw || isP2P ? '-' : '+'}
            </Text>
            <CurrencyDisplay
              value={
                isWithdraw || isP2P
                  ? amount?.toLocaleString()
                  : amountPurchased?.toLocaleString()
              }
              size="large"
              isSuccess={isWithdraw || isP2P ? false : true}
            />
          </View>
        </View>
        <Text style={[styles.receiptLabel, { color: colors.text }]}>
          {subLabel}
        </Text>
        <Text style={[styles.receiptValue, { color: colors.textDarker }]}>
          {isP2P
            ? `@${recipientUsername}`
            : `${currency} ${
                isWithdraw ? payout.toLocaleString() : amountPaid
              }`}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.btnColor }]}
          onPress={() =>
            navigation.navigate('ICashDashboard', { refresh: true })
          }
        >
          <Text style={[styles.buttonText, { color: colors.btnTextColor }]}>
            Back to Dashboard
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
    padding: 20,
  },
  subContainer: {
    alignContent: 'center',
    padding: 20,
    borderRadius: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  amountContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  diamondRow: { flexDirection: 'row', alignItems: 'center' },
  amountValue: { fontSize: 36, fontWeight: '800', marginRight: 5 },
  receiptLabel: { fontSize: 14, marginBottom: 15 },
  receiptValue: { fontWeight: 'bold', fontSize: 14, marginBottom: 15 },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 15,
    alignContent: 'center',
  },
  buttonText: { fontSize: 14, fontWeight: '600' },
  miniLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: PRIMARY_COLOR,
    marginBottom: 5,
  },
});
