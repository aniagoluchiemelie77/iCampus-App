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
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '@components/Classroomcomponent';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import toastConfig from '@components/ToastConfig';
import { PageHeader } from '../components/PageHeader';
import { SvgProps } from 'react-native-svg';
export const PRIMARY_COLOR2 = '#fadccc';
import DropDownPicker from 'react-native-dropdown-picker';
import { FLUTTERWAVE_CLIENT_SECRET } from '@env';
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
interface BankFormProps {
  bankData: {
    bankCode: string;
    accountNumber: string;
    accountName: string;
  };
  setBankData: React.Dispatch<React.SetStateAction<any>>;
  bankItems: { label: string; value: string }[];
}
const COUNTRY_CODE_MAP: Record<string, string> = {
  Nigeria: 'NG',
  Egypt: 'EG',
  Ghana: 'GH',
  Kenya: 'KE',
  Rwanda: 'RW',
  Cameroon: 'CM',
  Ethiopia: 'ET',
  Uganda: 'UG',
  'South Africa': 'ZA',
  'United States of America': 'US',
};
const BankForm = ({ bankData, setBankData, bankItems }: BankFormProps) => {
  const [openBank, setOpenBank] = useState(false);
  return (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Select Bank</Text>
        <DropDownPicker
          open={openBank}
          value={bankData.bankCode}
          items={bankItems}
          setOpen={setOpenBank}
          setValue={callback => {
            const value = callback(bankData.bankCode);
            setBankData((prev: any) => ({ ...prev, bankCode: value }));
          }}
          placeholder="Select your bank"
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
          searchable={true}
          zIndex={3000}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Account Number</Text>
        <TextInput
          style={styles.input}
          placeholder="0123456789"
          keyboardType="numeric"
          maxLength={10}
          value={bankData.accountNumber}
          onChangeText={text =>
            setBankData((prev: any) => ({ ...prev, accountNumber: text }))
          }
        />
      </View>
      {bankData.accountName ? (
        <View style={styles.accountVerifiedBox}>
          <Icon name="check-circle" size={16} color={PRIMARY_COLOR} />
          <Text style={styles.accountNameText}>{bankData.accountName}</Text>
        </View>
      ) : null}
    </>
  );
};
const CardForm = ({
  cardData,
  setCardData,
  handleCardChange,
  BrandIcon,
  requiresPin,
}: CardFormProps) => (
  <>
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Card Number</Text>
      <View style={styles.cardInputWrapper}>
        <TextInput
          style={styles.flexInput}
          placeholderTextColor={PRIMARY_COLOR_TINT}
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
          placeholderTextColor={PRIMARY_COLOR_TINT}
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
            placeholderTextColor={PRIMARY_COLOR_TINT}
            placeholder="****"
            secureTextEntry
            maxLength={4}
            keyboardType="numeric"
          />
        </View>
      )}
    </View>
  </>
);
export const AddPaymentModal = ({ visible, onClose }: AddPaymentModalProps) => {
  const [activeTab, setActiveTab] = useState<'card' | 'bank'>('card');
  const [isLoading, setIsLoading] = useState(false);
  const user = useAppSelector(state => state.user);
  const [requiresPin, setRequiresPin] = useState(false);
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
  const [bankItems, setBankItems] = useState<
    { label: string; value: string }[]
  >([]);
  const handleLinkCard = async () => {
    const { number, month, year, cvv, name } = cardData;

    // 1. Validation (Keep your existing logic)
    const monthErr = validateExpiryMonth(month);
    const yearErr = validateExpiryYear(year);
    const cvvErr = validateCVV(cvv);

    if (monthErr || yearErr || cvvErr) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: monthErr || yearErr || cvvErr,
      });
      return;
    }

    setIsLoading(true);

    try {
      // 2. Prepare Flutterwave Payload
      const payload = {
        card_number: number.replace(/\s/g, ''),
        cvv: cvv,
        expiry_month: month,
        expiry_year: year,
        currency: currencyData.code || 'NGN',
        amount: '50',
        fullname: name || user?.fullName,
        email: user?.email,
        tx_ref: `link-card-${Date.now()}`,
        enckey: FLUTTERWAVE_ENCRYPTION_KEY, // You need this for card data
        // If it's Verve, include the PIN
        ...(requiresPin && {
          authorization: { mode: 'pin', pin: cardData.pin },
        }),
      };

      // 3. Initiate Charge
      const response = await fetch(
        'https://api.flutterwave.com/v3/charges?type=card',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${FLUTTERWAVE_CLIENT_SECRET}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (result.status === 'success') {
        // 4. Handle Authorization (OTP/Web/Pin)
        if (result.meta?.authorization?.mode === 'otp') {
          // Navigate to a small OTP modal or screen
          navigation.navigate('OTPVerification', {
            flw_ref: result.data.flw_ref,
            type: 'card_linking',
          });
        } else if (result.meta?.authorization?.mode === 'redirect') {
          // Open webview for 3D Secure
          navigation.navigate('FlutterwaveWebview', {
            url: result.meta.authorization.redirect,
          });
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Linking Failed',
        text2: error.message,
      });
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
  useEffect(() => {
    const fetchBanks = async () => {
      if (!user?.country) return;

      const countryCode = COUNTRY_CODE_MAP[user.country] || 'NG'; // Default to NG

      try {
        const res = await fetch(
          `https://api.flutterwave.com/v3/banks/${countryCode}`,
          {
            headers: { Authorization: `Bearer ${FLUTTERWAVE_CLIENT_SECRET}` },
          },
        );
        const json = await res.json();
        if (json.status === 'success') {
          const formattedBanks = json.data.map((bank: any) => ({
            label: bank.name,
            value: bank.code,
          }));
          setBankItems(formattedBanks);
        }
      } catch (err) {
        console.error('Bank fetch failed:', err);
      }
    };

    fetchBanks();
  }, [user?.country]);
  const BrandIcon = cardData.brand ? cardBrandLogos[cardData.brand] : null;
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <PageHeader
          title="Add Payment Method"
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
              bankItems={bankItems}
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
            currency: currencyData.code,
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
      <View style={styles.bodyContainer}>
        <Text style={styles.label}>Enter Amount to Buy</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.currencyPrefix}>{localCurrency}</Text>
          <TextInput
            style={styles.inputBorderless}
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
              {(EXCHANGE_RATE_USD * currencyData.rate).toFixed(2)}
            </Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.resultLabel}>You will receive:</Text>
          <View style={styles.resultDiv}>
            <Icon name="diamond" size={26} color={PRIMARY_COLOR} />
          </View>
          <Text style={styles.resultValue}>{iCashEquivalent}</Text>
        </View>
        {!hasPaymentMethod && (
          <View style={styles.warningBox}>
            <Icon name="alert-circle" size={20} color={PRIMARY_COLOR} />
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
            {hasPaymentMethod ? 'Complete Purchase' : 'Add Payment Method'}
          </Text>
        </TouchableOpacity>
      </View>
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
  tabContainer: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: '#fadccc',
    borderRadius: 12,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: {
    backgroundColor: PRIMARY_COLOR_TINT,
    elevation: 2,
    shadowOpacity: 0.1,
  },
  tabText: { fontWeight: '700', color: '#2222', fontSize: 12 },
  activeTabText: { color: PRIMARY_COLOR },
  formContent: { paddingHorizontal: 20 },
  inputGroup: { marginBottom: 20 },
  cardInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
  },
  flexInput: { flex: 1, fontSize: 16, fontWeight: '600', color: '#2222' },
  input: {
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    fontSize: 16,
    color: '#2222',
    fontWeight: '600',
  },
  inputBorderless: {
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
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 55,
  },
  smallInput: {
    textAlign: 'center',
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2222',
  },
  submitBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  bodyContainer: {
    paddingHorizontal: 16,
  },
  resultDiv: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  dropdown: {
    borderColor: '#fadccc',
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dropdownContainer: {
    borderColor: '#fadccc',
  },
  accountVerifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fadccc',
    borderLeftColor: PRIMARY_COLOR,
    borderTopLeftRadius: 1,
    padding: 12,
    borderRadius: 10,
    marginTop: -10,
    marginBottom: 20,
  },
  accountNameText: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 14,
  },
});
