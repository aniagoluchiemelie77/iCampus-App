import React, { useState, useEffect, FC, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
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
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import toastConfig from '@components/ToastConfig';
import { PageHeader } from '../components/PageHeader';
import { SvgProps } from 'react-native-svg';
import DropDownPicker from 'react-native-dropdown-picker';
import { FLUTTERWAVE_CLIENT_SECRET, FLUTTERWAVE_CLIENT_EKEY } from '@env';
import {
  MasterCardLogo,
  VisaCardLogo,
  DiscoverCardLogo,
  AmericanExpressCardLogo,
  VerveCardLogo,
} from '../assets/images/Logo';
import { useRoute } from '@react-navigation/native';
import {
  validateExpiryYear,
  encryptCardDetails,
  //formatDatePretty,
  validateExpiryMonth,
  validateCVV,
  getBin,
  fetchCardInfo,
  formatCardNumber,
  fetchLiveRate,
} from '../utils/UserTransactionsHelpers.tsx';
import { User, UserBankOrCardDetails } from 'types/firebase';
const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

interface PaymentMethodCardProps {
  item: UserBankOrCardDetails;
  isSelected: boolean;
  onSelect: () => void;
}
interface CardFormProps {
  cardData: {
    number: string;
    brand: string;
    month: string;
    year: string;
    cvv: string;
    name: string;
    pin?: string;
    address?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    country?: string;
  };
  setCardData: React.Dispatch<React.SetStateAction<any>>;
  handleCardChange: (text: string) => Promise<void>;
  BrandIcon: React.FC<any> | null;
  requiresPin: boolean;
  isInternational: boolean;
}
interface AddPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  currencyData: {
    rate: number;
    code: string;
  };
  user: User;
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
const PaymentMethodCard = ({
  item,
  isSelected,
  onSelect,
}: PaymentMethodCardProps) => {
  const isCard = item.method === 'card';
  return (
    <TouchableOpacity
      onPress={onSelect}
      style={[styles.card, isSelected && styles.selectedCard]}
    >
      <View style={styles.iconContainer}>
        <Icon
          name={isCard ? 'card-outline' : 'business-outline'}
          size={24}
          color={isSelected ? '#FFF' : PRIMARY_COLOR}
        />
      </View>
      <View style={styles.details}>
        <Text style={[styles.title, isSelected && styles.whiteText]}>
          {isCard
            ? `${item.cardBrand} **** ${item.lastFourDigits}`
            : item.bankName}
        </Text>
        <Text style={[styles.subtitle, isSelected && styles.lightText]}>
          {isCard
            ? `Expires ${item.expiryMonth} / ${item.expiryYear}`
            : item.bankAccNumber}
        </Text>
      </View>
      {isSelected && <Icon name="checkmark-circle" size={20} color="#FFF" />}
    </TouchableOpacity>
  );
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
  isInternational,
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
    {isInternational && (
      <View style={{ marginTop: 20 }}>
        <Text
          style={[
            styles.label,
            { marginBottom: 10, color: PRIMARY_COLOR_TINT },
          ]}
        >
          Billing Address (Required for International Cards)
        </Text>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="Street Address"
            placeholderTextColor={PRIMARY_COLOR_TINT}
            value={cardData.address}
            onChangeText={v => setCardData({ ...cardData, address: v })}
          />
        </View>
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <TextInput
              style={styles.input}
              placeholder="City"
              placeholderTextColor={PRIMARY_COLOR_TINT}
              value={cardData.city}
              onChangeText={v => setCardData({ ...cardData, city: v })}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <TextInput
              style={styles.input}
              placeholder="State/Province"
              placeholderTextColor={PRIMARY_COLOR_TINT}
              value={cardData.state}
              onChangeText={v => setCardData({ ...cardData, state: v })}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <TextInput
              style={styles.input}
              placeholder="Zip Code"
              placeholderTextColor={PRIMARY_COLOR_TINT}
              keyboardType="numeric"
              value={cardData.zipcode}
              onChangeText={v => setCardData({ ...cardData, zipcode: v })}
            />
          </View>
        </View>
      </View>
    )}
  </>
);
export const AddPaymentModal = ({
  visible,
  onClose,
  currencyData,
  user,
}: AddPaymentModalProps) => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'card' | 'bank'>('card');
  const [isLoading, setIsLoading] = useState(false);
  const [requiresPin, setRequiresPin] = useState(false);
  const [cardData, setCardData] = useState({
    number: '',
    brand: '',
    month: '',
    year: '',
    cvv: '',
    name: '',
    pin: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    country: '',
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
    const { number, month, year, cvv, name, pin } = cardData;
    const monthErr = validateExpiryMonth(month);
    const yearErr = validateExpiryYear(year);
    const cvvErr = validateCVV(cvv);
    if (monthErr || yearErr || cvvErr) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: (monthErr || yearErr || cvvErr) ?? undefined,
      });
      return;
    }
    setIsLoading(true);
    const cardObject = JSON.stringify({
      card_number: number.replace(/\s/g, ''),
      cvv: cvv,
      expiry_month: month,
      expiry_year: year,
      pin: pin,
      billing_address: cardData.address,
      billing_city: cardData.city,
      billing_state: cardData.state,
      billing_zip: cardData.zipcode,
      billing_country: cardData.country || 'US',
    });
    const encryptedData = encryptCardDetails(
      FLUTTERWAVE_CLIENT_EKEY,
      cardObject,
    );
    try {
      const payload = {
        client: encryptedData,
        currency: currencyData.code || 'NGN',
        amount: '50',
        fullname:
          name ||
          `${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim() ||
          'Guest User',
        email: user?.email,
        tx_ref: `link-card-${Date.now()}`,
        meta: {
          userId: user.uid,
          purpose: 'linking_card',
        },
        authorization: {
          mode: isInternational ? 'avs_noauth' : 'pin',
        },
      };
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
        if (result.meta?.authorization?.mode === 'otp') {
          navigation.navigate('VerifyOTP', {
            flw_ref: result.data.flw_ref,
            type: 'card_linking',
          });
        } else if (result.meta?.authorization?.mode === 'redirect') {
          navigation.navigate('FlutterwaveWebview', {
            url: result.meta.authorization.redirect,
          });
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Linking Failed',
          text2: result.message,
        });
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
  const handleLinkBank = async () => {
    const { bankCode, accountNumber } = bankData;
    const countryCode = COUNTRY_CODE_MAP[user?.country || 'Nigeria'] || 'NG';
    let isValidAccount = false;
    if (countryCode === 'NG') {
      isValidAccount = accountNumber.length === 10;
    } else if (countryCode === 'GH' || countryCode === 'KE') {
      isValidAccount = accountNumber.length >= 8 && accountNumber.length <= 15;
    } else {
      isValidAccount = accountNumber.length > 5;
    }
    if (!bankCode || !isValidAccount) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Details',
        text2: `Please enter a valid account number for ${
          user?.country || 'your country'
        }.`,
      });
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        account_bank: bankCode,
        account_number: accountNumber,
        amount: 50,
        currency: currencyData.code || 'NGN',
        email: user?.email,
        fullname: `${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim(),
        tx_ref: `iCampus-BANK-LINK-${Date.now()}`,
        type: 'account',
        meta: {
          userId: user.uid,
          purpose: 'linking_bank',
        },
      };
      const response = await fetch(
        'https://api.flutterwave.com/v3/charges?type=account',
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
        if (result.meta?.authorization?.mode === 'otp') {
          navigation.navigate('VerifyOTP', {
            flw_ref: result.data.flw_ref,
            type: 'bank_linking',
          });
        } else if (result.meta?.authorization?.mode === 'redirect') {
          navigation.navigate('FlutterwaveWebview', {
            url: result.meta.authorization.redirect,
          });
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Bank Linking Failed',
          text2: result.message,
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Bank Linking Failed',
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
      const countryCode = COUNTRY_CODE_MAP[user.country] || 'NG';
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
  const isInternational = user?.country !== 'Nigeria';
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
              isInternational={isInternational}
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
              } else {
                handleLinkBank();
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
          navigation.navigate('iCashPurchaseSuccessScreen', {
            amountPurchased: iCashEquivalent,
            amountPaid: numericAmount,
            currency: currencyData.code,
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScrollPadding}
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
            styles.buyBtn,
            (!amount || parseFloat(amount) <= 0) && { opacity: 0.5 },
          ]}
          onPress={handleProceed}
          disabled={!amount || parseFloat(amount) <= 0}
        >
          <Text style={styles.buyBtnText}>
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
});
