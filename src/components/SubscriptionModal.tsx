import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { PayWithFlutterwave } from 'flutterwave-react-native';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { FLUTTERWAVE_PUBLIC_KEY } from '@env';
import {
  USD_SUBSCRIPTION_PRICES,
  SubscriptionTier,
} from '../constants/inAppConstants';
import { useTheme } from '../context/ThemeContext';

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
  title?: string;
}

export const SubscriptionSelectionModal = ({
  isVisible,
  onClose,
  targetTier,
  userContext,
  exchangeData,
  onSuccess,
  title,
}: SubscriptionModalProps) => {
  const { colors } = useTheme();
  const formattedTier = (targetTier.charAt(0).toUpperCase() +
    targetTier.slice(1)) as SubscriptionTier;
  const localPriceValue =
    (USD_SUBSCRIPTION_PRICES[formattedTier] || 0) * exchangeData.rate;
  const formattedPrice = `${
    exchangeData.symbol
  }${localPriceValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const renderCustomButton = React.useCallback(
    (props: any) => (
      <TouchableOpacity
        style={styles.upgradeBtn}
        onPress={props.onPress}
      >
        <Text style={[styles.upgradeBtnText, {color: colors.btnTextColor}]}>
          Upgrade to {targetTier.toUpperCase()}
        </Text>
      </TouchableOpacity>
    ),
    [targetTier, colors],
  );

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modalMargin}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.tint }]} />

        <Text style={[styles.title, {color: colors.textDarker}]}>{title}</Text>
        <Text style={[styles.description, {color: colors.text}]}>
          Upgrade to <Text style={[styles.bold, {color: colors.primary}]}>{targetTier.toUpperCase()}</Text>
        </Text>
        <View style={styles.priceContainer}>
          <Text style={[styles.priceLabel, {color: colors.text}]}>Monthly payment</Text>
          <Text style={[styles.priceValue, {color: colors.primary}]}>{formattedPrice}</Text>
        </View>
        <PayWithFlutterwave
          onRedirect={data => {
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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalMargin: { margin: 0, justifyContent: 'flex-end' },
  container: {
    padding: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 10,
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  description: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 15,
  },
  bold: { color: PRIMARY_COLOR, fontWeight: 'bold' },
  priceContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: { fontSize: 18, fontWeight: 'bold' },
  upgradeBtn: {
    width: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignContent: 'center',
    alignSelf: 'center'
  },
  upgradeBtnText: {fontWeight: 'bold', fontSize: 14 },
});