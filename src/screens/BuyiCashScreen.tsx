import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useAppSelector } from '../hooks/hooks.ts';
import { initializeBuyTransaction } from '../api/localPostApis';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import Toast from 'react-native-toast-message';
import { PageHeader } from '../components/PageHeader';
import { useRoute } from '@react-navigation/native';
import { UserBankOrCardDetails } from '../types/firebase';
const { width } = Dimensions.get('window');
import { AddPaymentModal } from '../components/AddPaymentMethodModal.tsx';
import { getUserPaymentMethods } from '../api/localGetApis.ts';
import { useTheme } from '../context/ThemeContext';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useExchangeRate } from '../hooks/useExchangeRate.ts';
import { USD_EQUIVALENCE_OF_1_ICASH } from '../constants/inAppConstants.ts';
export const CARD_WIDTH = width * 0.6;

interface PaymentMethodCardProps {
  item: UserBankOrCardDetails;
  isSelected: boolean;
  onSelect: () => void;
  colors: any;
}

export const PaymentMethodCard = React.memo(
  ({ item, isSelected, onSelect, colors }: PaymentMethodCardProps) => {
    const isCard = item.method === 'card';

    return (
      <TouchableOpacity
        onPress={onSelect}
        activeOpacity={0.8}
        style={[
          iCashActionsStyles.card,
          {
            borderColor: isSelected ? colors.primary : colors.border,
            backgroundColor: isSelected
              ? colors.primary
              : colors.backgroundSecondary,
          },
        ]}
      >
        <MaterialIcons
          name={isCard ? 'credit-card' : 'account-balance'}
          size={26}
          color={isSelected ? colors.btnTextColor : colors.text}
        />
        <View style={iCashActionsStyles.cardDetails}>
          <Text
            style={[
              iCashActionsStyles.cardTitle,
              { color: isSelected ? colors.btnTextColor : colors.text },
            ]}
            numberOfLines={1}
          >
            {isCard
              ? `${item.cardBrand} •••• ${item.lastFourDigits}`
              : item.bankName}
          </Text>
          <Text
            style={[
              iCashActionsStyles.cardSubtitle,
              {
                color: isSelected
                  ? colors.btnTextColor
                  : colors.textSecondary || colors.text,
              },
            ]}
          >
            {isCard
              ? `Exp: ${item.expiryMonth}/${item.expiryYear}`
              : item.bankAccNumber}
          </Text>
        </View>
      </TouchableOpacity>
    );
  },
);

export const ICashBuyPage = ({ navigation }: any) => {
  const { colors } = useTheme();
  const route = useRoute();
  const user = useAppSelector(state => state.user);

  const [amount, setAmount] = useState('');
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedMethods, setSavedMethods] = useState<UserBankOrCardDetails[]>([]);
  const [selectedMethod, setSelectedMethod] =
    useState<UserBankOrCardDetails | null>(null);

  const hasPaymentMethod = savedMethods.length > 0;

  const { exchangeData } = useExchangeRate(user?.country || 'Nigeria');
  const { rate, code, symbol } = exchangeData || {};

  const iCashEquivalent = useMemo(() => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return '0.00';

    const inUsd = numericAmount / rate;
    const calculatedICash = inUsd / USD_EQUIVALENCE_OF_1_ICASH;
    return calculatedICash.toFixed(2);
  }, [amount, rate]);
  const fetchPaymentMethods = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const methods = await getUserPaymentMethods(user.uid);
      setSavedMethods(Array.isArray(methods) ? methods : []);
    } catch (error) {
      console.error('[FETCH_METHODS_ERROR]', error);
    }
  }, [user?.uid]);

  const needsRefresh = (route.params as any)?.refresh;
  useEffect(() => {
    fetchPaymentMethods();
    if (needsRefresh) {
      const timer = setTimeout(() => fetchPaymentMethods(), 1500);
      navigation.setParams({ refresh: undefined } as any);
      return () => clearTimeout(timer);
    }
  }, [needsRefresh, navigation, fetchPaymentMethods]);

  // Secure API Submission Gateway pipeline
  const handleProceed = async () => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0 || isSubmitting) return;

    if (!hasPaymentMethod) {
      setShowAddCardModal(true);
      return;
    }

    if (!selectedMethod) {
      Toast.show({
        type: 'info',
        text1: 'Selection Missing',
        text2: 'Please tap a valid payment token method.',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        amount: numericAmount,
        currency: code,
        userId: user.uid,
        paymentToken: selectedMethod.paymentToken,
        methodType: selectedMethod.method,
        iCashAmount: parseFloat(iCashEquivalent),
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
                  amountPurchased: parseFloat(iCashEquivalent),
                  amountPaid: numericAmount,
                  currency: code,
                  type: 'buy',
                },
              },
            ],
          });
        }
      } else {
        throw new Error(
          data.message || 'Transaction dropped by upstream clearing engine.',
        );
      }
    } catch (error: any) {
      console.error('[ICASH_PURCHASE_CRITICAL_FAILURE]', error);
      Toast.show({
        type: 'error',
        text1: 'Transaction Failure',
        text2: error.message || 'Gateway initialization failure.',
      });
    } finally {
      setIsSubmitting(false); // Free user interactive locks
    }
  };

  return (
    <ScrollView
      style={[
        iCashActionsStyles.container,
        { backgroundColor: colors.background },
      ]}
      keyboardShouldPersistTaps="handled"
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
            {symbol}
          </Text>
          <TextInput
            style={[iCashActionsStyles.inputBorderless, { color: colors.text }]}
            placeholder="0.00"
            keyboardType="decimal-pad" // Better keyboard profile layout context for iOS/Android
            value={amount}
            onChangeText={setAmount}
            placeholderTextColor={colors.inputTextHolder || '#A0A0A0'}
            editable={!isSubmitting}
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
            1 iCash ≈ {symbol}
            {(USD_EQUIVALENCE_OF_1_ICASH * rate).toFixed(2)}
          </Text>
        </View>

        <Text style={[iCashActionsStyles.resultLabel, { color: colors.text }]}>
          You will receive:
        </Text>
        <CurrencyDisplay
          value={parseFloat(iCashEquivalent)}
          size="medium"
          isSuccess={true}
        />

        {!hasPaymentMethod && (
          <View
            style={[
              iCashActionsStyles.warningBox,
              { borderColor: colors.primary },
            ]}
          >
            <MaterialIcons name="info" size={18} color={colors.primary} />
            <Text
              style={[
                iCashActionsStyles.warningText,
                { color: colors.primary },
              ]}
            >
              You haven't linked a payment method. Tap below to attach a card or
              wallet profile.
            </Text>
          </View>
        )}
        <FlatList
          horizontal
          data={savedMethods}
          keyExtractor={(item, index) => item.id || index.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={iCashActionsStyles.horizontalScrollPadding}
          renderItem={({ item }) => (
            <PaymentMethodCard
              item={item}
              isSelected={selectedMethod?.id === item.id}
              onSelect={() => setSelectedMethod(item)}
              colors={colors}
            />
          )}
        />

        <TouchableOpacity
          style={[
            iCashActionsStyles.buyBtn,
            { backgroundColor: colors.btnColor },
            (!amount || parseFloat(amount) <= 0 || isSubmitting) && {
              opacity: 0.5,
            },
          ]}
          onPress={handleProceed}
          disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.btnTextColor} />
          ) : (
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
          )}
        </TouchableOpacity>
      </View>

      <AddPaymentModal
        visible={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        currencyData={{ rate, code }}
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
    marginBottom: 15,
  },
  currencyPrefix: {
    fontSize: 23,
    fontWeight: 'bold',
    marginRight: 10,
  },
  resultValue: {
    fontSize: 30,
    fontWeight: 'bold',
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
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: PRIMARY_COLOR_TINT,
    width: '100%',
  },
  detailRowText: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailRowSubrow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalText: { fontWeight: 'bold', fontSize: 15 },
  payBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  payBtnText: {
    fontSize: 14,
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
  resultDiv: {
    flexDirection: 'row',
    alignItems: 'baseline',
    width: '100%',
  },
  cardDetails: { marginLeft: 12, flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
});
