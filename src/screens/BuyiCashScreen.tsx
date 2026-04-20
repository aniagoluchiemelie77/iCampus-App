import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { baseUrl } from '../components/HomeScreenComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../components/hooks';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '@components/Classroomcomponent';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import toastConfig from '@components/ToastConfig';
import { PageHeader } from '../components/PageHeader';
import { useRoute } from '@react-navigation/native';
import { fetchLiveRate } from '../utils/UserTransactionsHelpers.tsx';
import { UserBankOrCardDetails } from 'types/firebase';
const { width } = Dimensions.get('window');
import { AddPaymentModal } from '../components/AddPaymentMethodModal.tsx';
export const CARD_WIDTH = width * 0.75;

interface PaymentMethodCardProps {
  item: UserBankOrCardDetails;
  isSelected: boolean;
  onSelect: () => void;
}

export const PaymentMethodCard = ({
  item,
  isSelected,
  onSelect,
}: PaymentMethodCardProps) => {
  const isCard = item.method === 'card';
  return (
    <TouchableOpacity
      onPress={onSelect}
      style={[
        iCashActionsStyles.card,
        isSelected && iCashActionsStyles.selectedCard,
      ]}
    >
      <View style={iCashActionsStyles.iconContainer}>
        <Icon
          name={isCard ? 'card-outline' : 'business-outline'}
          size={24}
          color={isSelected ? '#FFF' : PRIMARY_COLOR}
        />
      </View>
      <View style={iCashActionsStyles.details}>
        <Text
          style={[
            iCashActionsStyles.title,
            isSelected && iCashActionsStyles.whiteText,
          ]}
        >
          {isCard
            ? `${item.cardBrand} **** ${item.lastFourDigits}`
            : item.bankName}
        </Text>
        <Text
          style={[
            iCashActionsStyles.subtitle,
            isSelected && iCashActionsStyles.lightText,
          ]}
        >
          {isCard
            ? `Expires ${item.expiryMonth} / ${item.expiryYear}`
            : item.bankAccNumber}
        </Text>
      </View>
      {isSelected && <Icon name="checkmark-circle" size={20} color="#FFF" />}
    </TouchableOpacity>
  );
};
export const ICashBuyPage = ({ navigation }: any) => {
  const route = useRoute();
  const user = useAppSelector(state => state.user);
  const [amount, setAmount] = useState('');
  const [iCashEquivalent, setICashEquivalent] = useState('0.00');
  const [localCurrency, setLocalCurrency] = useState('');
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [currencyData, setCurrencyData] = useState({
    rate: 1550,
    code: 'NGN',
  });
  // Use your interface here
  const [savedMethods, setSavedMethods] = useState<UserBankOrCardDetails[]>([]);
  const [selectedMethod, setSelectedMethod] =
    useState<UserBankOrCardDetails | null>(null);
  const hasPaymentMethod = savedMethods.length > 0;
  const EXCHANGE_RATE_USD = 0.74;
  const fetchPaymentMethods = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}user/payment-methods/${user?.uid}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const result = await response.json();

      const methods = Array.isArray(result) ? result : result.data;
      if (Array.isArray(methods)) {
        setSavedMethods(methods);
      }
    } catch (error) {
      console.error('Error fetching methods:', error);
    }
  }, [user?.uid]);
  useEffect(() => {
    const getLiveRate = async () => {
      try {
        const data = await fetchLiveRate(user?.country || 'Nigeria');
        setCurrencyData({
          rate: data.rate,
          code: data.code,
        });
      } catch (error) {
        console.error('Failed to update rates:', error);
      }
    };
    getLiveRate();
  }, [user?.country]);
  useEffect(() => {
    const numericAmount = parseFloat(amount);
    if (numericAmount > 0) {
      const inUsd = numericAmount / currencyData.rate;
      const calculatedICash = inUsd / EXCHANGE_RATE_USD;
      setICashEquivalent(calculatedICash.toFixed(2));
    }
  }, [amount, currencyData]);
  useEffect(() => {
    const getCurrency = async () => {
      const data = await fetchLiveRate(user?.country || 'Nigeria');
      setLocalCurrency(data.symbol);
    };
    getCurrency();
  }, [user?.country]);
  const needsRefresh = (route.params as any)?.refresh;
  useEffect(() => {
    fetchPaymentMethods();
    if (needsRefresh) {
      const timer = setTimeout(() => {
        fetchPaymentMethods();
      }, 2000);
      navigation.setParams({ refresh: undefined } as any);
      return () => clearTimeout(timer);
    }
  }, [needsRefresh, navigation, fetchPaymentMethods]);
  const handleProceed = async () => {
    const numericAmount = parseFloat(amount);
    if (!numericAmount) return;
    if (!hasPaymentMethod) {
      setShowAddCardModal(true);
      return;
    }
    if (!selectedMethod) {
      Toast.show({ type: 'info', text1: 'Please select a payment method' });
      return;
    }
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}user/transactions/initialize-buy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: numericAmount,
            currency: currencyData.code,
            userId: user.uid,
            paymentToken: selectedMethod.paymentToken,
            methodType: selectedMethod.method,
            iCashAmount: iCashEquivalent,
            country: user.country,
          }),
        },
      );
      const data = await response.json();
      if (data.status === 'success') {
        if (data.authorization_url) {
          navigation.navigate('FlutterwaveWebview', {
            url: data.authorization_url,
          });
        } else {
          navigation.navigate('iCashSuccessScreen', {
            amountPurchased: iCashEquivalent,
            amountPaid: numericAmount,
            currency: currencyData.code,
            type: 'buy',
            amount: 0,
            payout: 0,
            recipientUsername: '',
          });
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Payment Initialization Failed',
          text2: data.message,
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Payment Initialization Failed',
        text2: error.message,
      });
    }
  };
  return (
    <ScrollView style={iCashActionsStyles.container}>
      <PageHeader title="Buy iCash" />
      <View style={iCashActionsStyles.bodyContainer}>
        <Text style={iCashActionsStyles.label}>Enter Amount to Buy</Text>
        <View style={iCashActionsStyles.inputContainer}>
          <Text style={iCashActionsStyles.currencyPrefix}>{localCurrency}</Text>
          <TextInput
            style={iCashActionsStyles.inputBorderless}
            placeholder="0.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>
        <View style={iCashActionsStyles.exchangeCard}>
          <View style={iCashActionsStyles.exchangeRow}>
            <Text style={iCashActionsStyles.exchangeText}>Exchange Rate</Text>
            <Text style={iCashActionsStyles.exchangeValue}>
              1 iCash ≈ {localCurrency}
              {(EXCHANGE_RATE_USD * currencyData.rate).toFixed(2)}
            </Text>
          </View>
          <View style={iCashActionsStyles.divider} />
          <Text style={iCashActionsStyles.resultLabel}>You will receive:</Text>
          <View style={iCashActionsStyles.resultDiv}>
            <Icon name="diamond" size={26} color={PRIMARY_COLOR} />
          </View>
          <Text style={iCashActionsStyles.resultValue}>{iCashEquivalent}</Text>
        </View>
        {!hasPaymentMethod && (
          <View style={iCashActionsStyles.warningBox}>
            <Icon name="alert-circle" size={20} color={PRIMARY_COLOR} />
            <Text style={iCashActionsStyles.warningText}>
              You haven't added a payment method. Please add a bank account or
              card to continue.
            </Text>
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={iCashActionsStyles.horizontalScrollPadding}
          snapToInterval={CARD_WIDTH + 15} // Card width + margin
          decelerationRate="fast"
        >
          {savedMethods.map(method => (
            <PaymentMethodCard
              key={method.id}
              item={method}
              isSelected={selectedMethod?.id === method.id}
              onSelect={() => setSelectedMethod(method)}
            />
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[
            iCashActionsStyles.buyBtn,
            (!amount || parseFloat(amount) <= 0) && { opacity: 0.5 },
          ]}
          onPress={handleProceed}
          disabled={!amount || parseFloat(amount) <= 0}
        >
          <Text style={iCashActionsStyles.buyBtnText}>
            {!hasPaymentMethod
              ? 'Add Payment Method'
              : !selectedMethod
              ? 'Select a Method'
              : 'Complete Purchase'}
          </Text>
        </TouchableOpacity>
      </View>
      <Toast config={toastConfig} />
      <AddPaymentModal
        visible={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        currencyData={currencyData}
        user={user}
      />
    </ScrollView>
  );
};
export const iCashActionsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2222',
    marginVertical: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fadccc',
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 70,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#332117',
    marginRight: 10,
  },
  exchangeCard: {
    backgroundColor: '#f9e7dd',
    borderRadius: 20,
    padding: 20,
    marginTop: 30,
    borderWidth: 0.8,
    borderColor: '#fdd5bf',
  },
  exchangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  exchangeText: {
    fontSize: 13,
    color: '#332117',
    fontWeight: '500',
  },
  exchangeValue: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#fadccc',
    marginVertical: 10,
    opacity: 0.5,
  },
  resultLabel: {
    fontSize: 14,
    color: '#332117',
    marginBottom: 6,
  },
  resultValue: {
    fontSize: 32,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    marginLeft: 7,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fadccc',
    padding: 15,
    borderRadius: 12,
    marginTop: 25,
    borderLeftWidth: 1,
    borderLeftColor: PRIMARY_COLOR,
    alignItems: 'center',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: PRIMARY_COLOR,
    marginLeft: 10,
    lineHeight: 18,
  },
  buyBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
    shadowColor: PRIMARY_COLOR_TINT,
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
  flexInput: { flex: 1, fontSize: 16, fontWeight: '600', color: '#2222' },
  inputBorderless: {
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    fontSize: 16,
    fontWeight: '600',
  },
  row: { flexDirection: 'row' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  bodyContainer: {
    paddingHorizontal: 16,
  },
  resultDiv: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  card: {
    width: CARD_WIDTH,
    marginRight: 15,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fadccc',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedCard: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  details: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: PRIMARY_COLOR },
  subtitle: { fontSize: 13, color: PRIMARY_COLOR_TINT, marginTop: 2 },
  whiteText: { color: '#FFF' },
  lightText: { color: 'rgba(255, 255, 255, 0.8)' },
  horizontalScrollPadding: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    color: PRIMARY_COLOR_TINT,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  detailRowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2222',
  },
  detailRowSubrow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalRow: { borderBottomWidth: 0, marginTop: 10 },
  totalText: { fontWeight: 'bold', fontSize: 15, color: PRIMARY_COLOR },
  payBtn: {
    backgroundColor: PRIMARY_COLOR,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  payBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  pinInput: {
    letterSpacing: 20,
    fontSize: 24,
    textAlign: 'center',
    padding: 20,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
});
