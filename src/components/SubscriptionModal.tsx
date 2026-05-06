import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { PayWithFlutterwave } from 'flutterwave-react-native';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT_MAIN } from 'assets/styles/colors';
import { FLUTTERWAVE_PUBLIC_KEY } from '@env';
import {PRICES} from '../screens/SubscriptionsScreen';

interface SubscriptionModalProps {
  isVisible: boolean;
  onClose: () => void;
  targetTier: 'pro' | 'premium'; 
  userContext: {
    email: string;
    name: string;
    country: string;
  };
  exchangeData: { rate: number; symbol: string; code: string };
  onSuccess: (data: any) => void;
  title?: string
}


export const SubscriptionSelectionModal = ({
  isVisible,
  onClose,
  targetTier,
  userContext,
  exchangeData,
  onSuccess,
  title
}: SubscriptionModalProps) => {
  
  const localPriceValue = (PRICES[targetTier] || 0) * exchangeData.rate;
  const formattedPrice = `${exchangeData.symbol}${localPriceValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const renderCustomButton = React.useCallback((props: any) => (
  <TouchableOpacity 
    style={styles.upgradeBtn} 
    onPress={props.onPress}
    activeOpacity={0.8}
  >
    <Text style={styles.upgradeBtnText}>
      Upgrade to {targetTier.toUpperCase()}
    </Text>
  </TouchableOpacity>
), [targetTier]);

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modalMargin}
    >
      <View style={styles.container}>
        <View style={styles.handle} />
        
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>
          Upgrade to <Text style={styles.bold}>{targetTier.toUpperCase()}</Text>.
        </Text>

        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Monthly payment</Text>
          <Text style={styles.priceValue}>{formattedPrice}</Text>
        </View>

        <PayWithFlutterwave
          onRedirect={(data) => {
            onClose();
            onSuccess(data); 
        }}
          options={{
            tx_ref: `sub_rnk_${Date.now()}`,
            authorization: FLUTTERWAVE_PUBLIC_KEY,
            customer: { email: userContext.email, name: userContext.name },
            amount: localPriceValue,
            currency: exchangeData.code as any,
            payment_options: 'card,ussd,banktransfer',
          }}
          customButton={renderCustomButton}
        />
        <TouchableOpacity onPress={onClose} style={styles.maybeLater}>
          <Text style={styles.maybeLaterText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalMargin: { margin: 0, justifyContent: 'flex-end' },
  container: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: PRIMARY_COLOR_TINT_MAIN,
    borderRadius: 10,
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 10 },
  description: { fontSize: 13, textAlign: 'center', color: '#666', lineHeight: 20, marginBottom: 25 },
  bold: { color: PRIMARY_COLOR, fontWeight: 'bold' },
  priceContainer: {
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 25,
  },
  priceLabel: { color: '#888', fontSize: 12, textTransform: 'capitalize', marginBottom: 5 },
  priceValue: { fontSize: 18, fontWeight: 'bold', color: PRIMARY_COLOR },
  upgradeBtn: {
    backgroundColor: PRIMARY_COLOR,
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  maybeLater: { marginTop: 15, padding: 10 },
  maybeLaterText: { color: '#999', fontWeight: '600' },
});