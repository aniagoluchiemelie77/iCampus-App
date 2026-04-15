import React, { useState, useEffect, FC } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { baseUrl } from '../components/HomeScreenComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../components/hooks';
import { PRIMARY_COLOR } from '@components/Classroomcomponent';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import toastConfig from '@components/ToastConfig';
import { PageHeader } from '../components/PageHeader';
import { SvgProps } from 'react-native-svg';
//import DropDownPicker from 'react-native-dropdown-picker';
import {
  MasterCardLogo,
  VisaCardLogo,
  DiscoverCardLogo,
  AmericanExpressCardLogo,
  VerveCardLogo,
} from '../assets/images/Logo';

import {
  validateExpiryYear,
  //formatDatePretty,
  validateExpiryMonth,
  validateCVV,
  getBin,
  fetchCardInfo,
  formatCardNumber,
  fetchLiveRate,
} from '../utils/UserTransactionsHelpers.tsx';

interface CardFormProps {
  cardData: {
    number: string;
    brand: string;
    month: string;
    year: string;
    cvv: string;
    name: string;
  };
  setCardData: React.Dispatch<React.SetStateAction<any>>;
  handleCardChange: (text: string) => Promise<void>;
  BrandIcon: React.FC<any> | null;
  requiresPin: boolean;
}
interface AddPaymentModalProps {
  visible: boolean;
  onClose: () => void;
}

const CardForm = ({
  cardData,
  setCardData,
  handleCardChange,
  BrandIcon,
  requiresPin,
}: CardFormProps) => (
  <View>
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Card Number</Text>
      <View style={styles.cardInputWrapper}>
        <TextInput
          style={styles.flexInput}
          placeholder="0000 0000 0000 0000"
          keyboardType="numeric"
          value={cardData.number}
          onChangeText={handleCardChange}
        />
        {BrandIcon && <BrandIcon width={32} height={20} />}
      </View>
    </View>

    <View style={styles.row}>
      <View style={[styles.inputGroup, { flex: 2, marginRight: 10 }]}>
        <Text style={styles.label}>Expiry Date</Text>
        <View style={styles.expiryWrapper}>
          <TextInput
            style={styles.smallInput}
            placeholder="MM"
            keyboardType="numeric"
            onChangeText={v => setCardData({ ...cardData, month: v })}
          />
          <Text style={styles.divider}>/</Text>
          <TextInput
            style={styles.smallInput}
            placeholder="YY"
            keyboardType="numeric"
            onChangeText={v => setCardData({ ...cardData, year: v })}
          />
        </View>
      </View>
      <View style={[styles.inputGroup, { flex: 1 }]}>
        <Text style={styles.label}>CVV</Text>
        <TextInput
          style={styles.input}
          placeholder="123"
          secureTextEntry
          keyboardType="numeric"
          onChangeText={v => setCardData({ ...cardData, cvv: v })}
        />
      </View>
      {requiresPin && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Card PIN</Text>
          <TextInput
            style={styles.input}
            placeholder="****"
            secureTextEntry
            maxLength={4}
            keyboardType="numeric"
          />
        </View>
      )}
    </View>
  </View>
);
export const AddPaymentModal = ({ visible, onClose }: AddPaymentModalProps) => {
  const [activeTab, setActiveTab] = useState<'card' | 'bank'>('card');
  const [isLoading, setIsLoading] = useState(false);
  const user = useAppSelector(state => state.user);
  const [requiresPin, setRequiresPin] = useState(false);

  // Grouped States
  const [cardData, setCardData] = useState({
    number: '',
    brand: '',
    month: '',
    year: '',
    cvv: '',
    name: '',
  });
  const [bankData, setBankData] = useState({
    bankCode: '',
    accountNumber: '',
    accountName: '',
  });
  const handleLinkCard = async () => {
    const { number, month, year, cvv, name } = cardData;

    // 1. Run Validations
    const monthErr = validateExpiryMonth(month);
    const yearErr = validateExpiryYear(year);
    const cvvErr = validateCVV(cvv);

    if (monthErr || yearErr || cvvErr) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Details',
        text2: monthErr || yearErr || cvvErr || 'Please check card details',
      });
      return;
    }

    // 2. Process the Payment/Linking
    setIsLoading(true);
    try {
      // Call your backend or Flutterwave logic here
      // Example: await completeTransaction(number, month, year, cvv);

      Toast.show({ type: 'success', text1: 'Card Linked Successfully' });
      onClose();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Linking Failed' });
    } finally {
      setIsLoading(false);
    }
  };
  const handleCardChange = async (text: string) => {
    const formatted = formatCardNumber(text);
    setCardData(prev => ({ ...prev, number: formatted }));

    const cleanNumber = formatted.replace(/\s/g, '');
    if (cleanNumber.length === 6) {
      const bin = getBin(cleanNumber);
      const data = await fetchCardInfo(bin);

      if (data) {
        const detectedBrand = data.scheme?.toUpperCase();
        setCardData(prev => ({ ...prev, brand: detectedBrand }));

        // logic: Verve cards usually need a PIN for the charge payload
        if (detectedBrand === 'VERVE' || detectedBrand === 'MAESTRO') {
          setRequiresPin(true);
        }
      }
    }
  };
  const cardBrandLogos: Record<string, FC<SvgProps>> = {
    VISA: VisaCardLogo,
    MASTERCARD: MasterCardLogo,
    VERVE: VerveCardLogo,
    MAESTRO: VerveCardLogo,
    'AMERICAN EXPRESS': AmericanExpressCardLogo,
    DISCOVER: DiscoverCardLogo,
  };
  const BrandIcon = cardData.brand ? cardBrandLogos[cardData.brand] : null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <PageHeader
          title="Payment Method"
          showBackButton={false}
          rightElement={
            <Icon
              name="close"
              size={28}
              onPress={onClose}
              color={PRIMARY_COLOR}
            />
          }
        />

        {/* Custom Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'card' && styles.activeTab]}
            onPress={() => setActiveTab('card')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'card' && styles.activeTabText,
              ]}
            >
              CARD
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bank' && styles.activeTab]}
            onPress={() => setActiveTab('bank')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'bank' && styles.activeTabText,
              ]}
            >
              BANK
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.formContent}>
          {activeTab === 'card' ? (
            <CardForm
              cardData={cardData}
              setCardData={setCardData}
              handleCardChange={handleCardChange}
              BrandIcon={BrandIcon}
              requiresPin={requiresPin}
            />
          ) : (
            <BankForm
              bankData={bankData}
              setBankData={setBankData}
              bankItems={bankItems} // Derived from your existing useEffect
            />
          )}

          <TouchableOpacity
            style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
            onPress={() => {
              if (activeTab === 'card') {
                handleLinkCard();
              }
            }}
            disabled={isLoading}
          >
            <Text style={styles.submitBtnText}>
              {isLoading
                ? 'Processing...'
                : `Link ${activeTab === 'card' ? 'Card' : 'Account'}`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};
export const ICashBuyPage = ({ navigation }: any) => {
  const user = useAppSelector(state => state.user);
  const [amount, setAmount] = useState('');
  const [iCashEquivalent, setICashEquivalent] = useState('0.00');
  const [localCurrency, setLocalCurrency] = useState('');
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [currencyData, setCurrencyData] = useState({
    rate: 1550,
    code: 'NGN',
  });
  const hasPaymentMethod = (user?.userAccountDetails?.length ?? 0) > 0;

  const EXCHANGE_RATE_USD = 0.74;
  const USD_TO_LOCAL = 1550;
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
  const handleProceed = async () => {
    const numericAmount = parseFloat(amount);
    if (!numericAmount) return;

    if (!hasPaymentMethod) {
      setShowAddCardModal(true);
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
            currency: code, // Dynamically set from localization
            userId: user.uid,
          }),
        },
      );
      const data = await response.json();
      navigation.navigate('FlutterwaveWebview', {
        url: data.authorization_url,
      });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Payment Initialization Failed' });
    }
  };
  return (
    <ScrollView style={styles.container}>
      <PageHeader title="Buy iCash" />
      <Text style={styles.label}>Enter Amount to Buy</Text>
      <View style={styles.inputContainer}>
        <Text style={styles.currencyPrefix}>{localCurrency}</Text>
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
          <Text style={styles.exchangeValue}>
            1 iCash ≈ {localCurrency}
            {(EXCHANGE_RATE_USD * USD_TO_LOCAL).toFixed(2)}
          </Text>
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
            You haven't added a payment method. Please add a bank account or
            card to continue.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.buyBtn,
          (!amount || parseFloat(amount) <= 0) && { opacity: 0.5 },
        ]}
        onPress={handleProceed}
        disabled={!amount || parseFloat(amount) <= 0}
      >
        <Text style={styles.buyBtnText}>
          {hasPaymentMethod ? 'Pay with Flutterwave' : 'Add Payment Method'}
        </Text>
      </TouchableOpacity>
      <Toast config={toastConfig} />
      <AddPaymentModal
        visible={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
      />
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  tabContainer: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#FFFFFF', elevation: 2, shadowOpacity: 0.1 },
  tabText: { fontWeight: '700', color: '#64748B', fontSize: 12 },
  activeTabText: { color: PRIMARY_COLOR },
  formContent: { paddingHorizontal: 20 },
  inputGroup: { marginBottom: 20 },
  cardInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
  },
  flexInput: { flex: 1, fontSize: 16, fontWeight: '600', color: '#0F172A' },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    fontSize: 16,
    fontWeight: '600',
  },
  row: { flexDirection: 'row' },
  expiryWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 55,
  },
  smallInput: { textAlign: 'center', flex: 1, fontSize: 16, fontWeight: '600' },
  submitBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
