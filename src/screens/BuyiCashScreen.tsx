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
import { useAppSelector } from '../components/hooks';
import { initializeBuyTransaction } from '../api/localPostApis';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '@components/Classroomcomponent';
import Toast from 'react-native-toast-message';
import { PageHeader } from '../components/PageHeader';
import { useRoute } from '@react-navigation/native';
import { fetchLiveRate } from '../utils/UserTransactionsHelpers.tsx';
import { UserBankOrCardDetails } from 'types/firebase';
const { width } = Dimensions.get('window');
import { AddPaymentModal } from '../components/AddPaymentMethodModal.tsx';
import { getUserPaymentMethods } from 'api/localGetApis.ts';
import { useTheme } from '../context/ThemeContext';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
export const CARD_WIDTH = width * 0.6;

interface PaymentMethodCardProps {
  item: UserBankOrCardDetails;
  isSelected: boolean;
  onSelect: () => void;
  colors: any;
}

export const PaymentMethodCard = ({
  item,
  isSelected,
  onSelect,
  colors,
}: PaymentMethodCardProps) => {
  const isCard = item.method === 'card';
  return (
    <TouchableOpacity
      onPress={onSelect}
      style={[
        iCashActionsStyles.card,
        isSelected
          ? {
              backgroundColor: colors.primary,
              borderColor: colors.primary,
              shadowColor: colors.border,
            }
          : {
              borderColor: colors.text,
              shadowColor: colors.text,
            },
      ]}
    >
      <MaterialIcons
        name={isCard ? 'credit-card-outlined' : 'account-balance-outlined'}
        size={28}
        color={isSelected ? colors.btnTextColor : colors.text}
      />
      <View style={iCashActionsStyles.details}>
        <Text
          style={[
            iCashActionsStyles.title,
            isSelected
              ? { color: colors.btnTextColor }
              : { color: colors.text },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {isCard
            ? `${item.cardBrand} **** ${item.lastFourDigits}`
            : item.bankName}
        </Text>
        <Text
          style={[
            iCashActionsStyles.subtitle,
            isSelected
              ? { color: colors.btnTextColor }
              : { color: colors.text },
          ]}
        >
          {isCard
            ? `Expires ${item.expiryMonth} / ${item.expiryYear}`
            : item.bankAccNumber}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
export const ICashBuyPage = ({ navigation }: any) => {
  const { colors } = useTheme();
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
  const [savedMethods, setSavedMethods] = useState<UserBankOrCardDetails[]>([]);
  const [selectedMethod, setSelectedMethod] =
    useState<UserBankOrCardDetails | null>(null);
  const hasPaymentMethod = savedMethods.length > 0;
  const EXCHANGE_RATE_USD = 0.74;
  const fetchPaymentMethods = useCallback(async () => {
    if (!user?.uid) return;
    const methods = await getUserPaymentMethods(user.uid);
    setSavedMethods(methods);
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
      const payload = {
        amount: numericAmount,
        currency: currencyData.code,
        userId: user.uid,
        paymentToken: selectedMethod.paymentToken,
        methodType: selectedMethod.method,
        iCashAmount: iCashEquivalent,
        country: user.country,
      };
      const response = await initializeBuyTransaction(payload);
      const data = response.data;
      if (data.status === 'success') {
        if (data.authorization_url) {
          navigation.navigate('FlutterwaveWebview', {
            url: data.authorization_url,
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'iCashSuccessScreen',
                params: {
                  amountPurchased: iCashEquivalent,
                  amountPaid: numericAmount,
                  currency: currencyData.code,
                  type: 'buy',
                  amount: 0,
                  payout: 0,
                  recipientUsername: '',
                },
              },
            ],
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
    <ScrollView
      style={[
        iCashActionsStyles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <PageHeader title="Buy iCash" />
      <View
        style={[
          iCashActionsStyles.bodyContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <Text style={[iCashActionsStyles.label, { color: colors.text }]}>
          Enter Amount to Buy
        </Text>
        <View style={iCashActionsStyles.inputContainer}>
          <Text
            style={[iCashActionsStyles.currencyPrefix, { color: colors.text }]}
          >
            {localCurrency}
          </Text>
          <TextInput
            style={[iCashActionsStyles.inputBorderless, { color: colors.text }]}
            placeholder="0.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholderTextColor={colors.inputTextHolder}
          />
        </View>
        <View style={iCashActionsStyles.exchangeRow}>
          <Text
            style={[iCashActionsStyles.exchangeText, { color: colors.text }]}
          >
            Exchange Rate
          </Text>
          <Text
            style={[
              iCashActionsStyles.exchangeValue,
              { color: colors.primary },
            ]}
          >
            1 iCash ≈ {localCurrency}
            {(EXCHANGE_RATE_USD * currencyData.rate).toFixed(2)}
          </Text>
        </View>
        <Text style={[iCashActionsStyles.resultLabel, { color: colors.text }]}>
          You will receive:
        </Text>
        <CurrencyDisplay
          value={+iCashEquivalent}
          size="medium"
          isSuccess={true}
        />
        {!hasPaymentMethod && (
          <View style={iCashActionsStyles.warningBox}>
            <MaterialIcons
              name="error-outline-outlined"
              size={20}
              color={colors.primary}
            />
            <Text
              style={[
                iCashActionsStyles.warningText,
                { color: colors.primary },
              ]}
            >
              You haven't added a payment method. Please add a bank account or
              card to continue.
            </Text>
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={iCashActionsStyles.horizontalScrollPadding}
          snapToInterval={CARD_WIDTH + 15}
          decelerationRate="fast"
        >
          {savedMethods.map(method => (
            <PaymentMethodCard
              key={method.id}
              item={method}
              isSelected={selectedMethod?.id === method.id}
              onSelect={() => setSelectedMethod(method)}
              colors={colors}
            />
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[
            iCashActionsStyles.buyBtn,
            { backgroundColor: colors.btnColor },
            (!amount || parseFloat(amount) <= 0) && { opacity: 0.5 },
          ]}
          onPress={handleProceed}
          disabled={!amount || parseFloat(amount) <= 0}
        >
          <Text
            style={[
              iCashActionsStyles.buyBtnText,
              { color: colors.btnTextColor },
            ]}
          >
            {!hasPaymentMethod
              ? 'Add Payment Method'
              : !selectedMethod
              ? 'Select a Method'
              : 'Complete Purchase'}
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 5,
    height: 60,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  currencyPrefix: {
    fontSize: 23,
    fontWeight: 'bold',
    marginRight: 10,
  },
  exchangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  exchangeText: {
    fontSize: 14,
  },
  exchangeValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultLabel: {
    fontSize: 14,
    marginBottom: 15,
  },
  warningBox: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    marginTop: 25,
    borderLeftWidth: 1,
    borderLeftColor: PRIMARY_COLOR,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    marginLeft: 10,
  },
  buyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  buyBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  flexInput: { flex: 1, fontSize: 16, fontWeight: '600', color: '#2222' },
  inputBorderless: {
    flex: 1,
    fontSize: 14,
  },
  row: { flexDirection: 'row' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  bodyContainer: {
    padding: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: 15,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 0.8,
    marginBottom: 12,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedCard: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  details: { marginTop: 8 },
  title: { fontSize: 14, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 4 },
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
