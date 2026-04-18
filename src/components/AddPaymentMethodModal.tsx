import React, { useState, useEffect, FC } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  StyleSheet
} from 'react-native';
import {
  PRIMARY_COLOR,
} from '@components/Classroomcomponent';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { PageHeader } from '../components/PageHeader';
import {PRIMARY_COLOR_TINT} from './Classroomcomponent.tsx'
import { SvgProps } from 'react-native-svg';
import { FLUTTERWAVE_CLIENT_SECRET, FLUTTERWAVE_CLIENT_EKEY } from '@env';
import {
  MasterCardLogo,
  VisaCardLogo,
  DiscoverCardLogo,
  AmericanExpressCardLogo,
  VerveCardLogo,
} from '../assets/images/Logo';
import DropDownPicker from 'react-native-dropdown-picker';
import {
  validateExpiryYear,
  encryptCardDetails,
  validateExpiryMonth,
  validateCVV,
  getBin,
  fetchCardInfo,
  formatCardNumber,
} from '../utils/UserTransactionsHelpers.tsx';
import { User } from 'types/firebase';
const { width } = Dimensions.get('window');
export const CARD_WIDTH = width * 0.75;

interface AddPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  currencyData: {
    rate: number;
    code: string;
  };
  user: User;
  mode?: 'buy' | 'withdraw';
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
      <View style={AddPaymentMethodStyles.inputGroup}>
        <Text style={AddPaymentMethodStyles.label}>Select Bank</Text>
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
          style={AddPaymentMethodStyles.dropdown}
          dropDownContainerStyle={AddPaymentMethodStyles.dropdownContainer}
          searchable={true}
          zIndex={3000}
        />
      </View>
      <View style={AddPaymentMethodStyles.inputGroup}>
        <Text style={AddPaymentMethodStyles.label}>Account Number</Text>
        <TextInput
          style={AddPaymentMethodStyles.input}
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
        <View style={AddPaymentMethodStyles.accountVerifiedBox}>
          <Icon name="check-circle" size={16} color={PRIMARY_COLOR} />
          <Text style={AddPaymentMethodStyles.accountNameText}>
            {bankData.accountName}
          </Text>
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
    <View style={AddPaymentMethodStyles.inputGroup}>
      <Text style={AddPaymentMethodStyles.label}>Card Number</Text>
      <View style={AddPaymentMethodStyles.cardInputWrapper}>
        <TextInput
          style={AddPaymentMethodStyles.flexInput}
          placeholderTextColor={PRIMARY_COLOR_TINT}
          placeholder="0000 0000 0000 0000"
          keyboardType="numeric"
          value={cardData.number}
          onChangeText={handleCardChange}
        />
        {BrandIcon && <BrandIcon width={32} height={20} />}
      </View>
    </View>
    <View style={AddPaymentMethodStyles.row}>
      <View
        style={[AddPaymentMethodStyles.inputGroup, { flex: 2, marginRight: 10 }]}
      >
        <Text style={AddPaymentMethodStyles.label}>Expiry Date</Text>
        <View style={AddPaymentMethodStyles.expiryWrapper}>
          <TextInput
            style={AddPaymentMethodStyles.smallInput}
            placeholder="MM"
            keyboardType="numeric"
            onChangeText={v => setCardData({ ...cardData, month: v })}
          />
          <Text style={AddPaymentMethodStyles.divider}>/</Text>
          <TextInput
            style={AddPaymentMethodStyles.smallInput}
            placeholder="YY"
            keyboardType="numeric"
            onChangeText={v => setCardData({ ...cardData, year: v })}
          />
        </View>
      </View>
      <View style={[AddPaymentMethodStyles.inputGroup, { flex: 1 }]}>
        <Text style={AddPaymentMethodStyles.label}>CVV</Text>
        <TextInput
          style={AddPaymentMethodStyles.input}
          placeholder="123"
          placeholderTextColor={PRIMARY_COLOR_TINT}
          secureTextEntry
          keyboardType="numeric"
          onChangeText={v => setCardData({ ...cardData, cvv: v })}
        />
      </View>
      {requiresPin && (
        <View style={AddPaymentMethodStyles.inputGroup}>
          <Text style={AddPaymentMethodStyles.label}>Card PIN</Text>
          <TextInput
            style={AddPaymentMethodStyles.input}
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
            AddPaymentMethodStyles.label,
            { marginBottom: 10, color: PRIMARY_COLOR_TINT },
          ]}
        >
          Billing Address (Required for International Cards)
        </Text>
        <View style={AddPaymentMethodStyles.inputGroup}>
          <TextInput
            style={AddPaymentMethodStyles.input}
            placeholder="Street Address"
            placeholderTextColor={PRIMARY_COLOR_TINT}
            value={cardData.address}
            onChangeText={v => setCardData({ ...cardData, address: v })}
          />
        </View>
        <View style={AddPaymentMethodStyles.row}>
          <View
            style={[AddPaymentMethodStyles.inputGroup, { flex: 1, marginRight: 8 }]}
          >
            <TextInput
              style={AddPaymentMethodStyles.input}
              placeholder="City"
              placeholderTextColor={PRIMARY_COLOR_TINT}
              value={cardData.city}
              onChangeText={v => setCardData({ ...cardData, city: v })}
            />
          </View>
          <View
            style={[AddPaymentMethodStyles.inputGroup, { flex: 1, marginRight: 8 }]}
          >
            <TextInput
              style={AddPaymentMethodStyles.input}
              placeholder="State/Province"
              placeholderTextColor={PRIMARY_COLOR_TINT}
              value={cardData.state}
              onChangeText={v => setCardData({ ...cardData, state: v })}
            />
          </View>
          <View style={[AddPaymentMethodStyles.inputGroup, { flex: 1 }]}>
            <TextInput
              style={AddPaymentMethodStyles.input}
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
  mode = 'buy',
}: AddPaymentModalProps) => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'card' | 'bank'>(
    mode === 'withdraw' ? 'bank' : 'card'
  );
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
      <View style={AddPaymentMethodStyles.container}>
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
        {mode === 'buy' && (
          <>
        <View style={AddPaymentMethodStyles.tabContainer}>
          <TouchableOpacity
            style={[
              AddPaymentMethodStyles.tab,
              activeTab === 'card' && AddPaymentMethodStyles.activeTab,
            ]}
            onPress={() => setActiveTab('card')}
          >
            <Text
              style={[
                AddPaymentMethodStyles.tabText,
                activeTab === 'card' && AddPaymentMethodStyles.activeTabText,
              ]}
            >
              CARD
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              AddPaymentMethodStyles.tab,
              activeTab === 'bank' && AddPaymentMethodStyles.activeTab,
            ]}
            onPress={() => setActiveTab('bank')}
          >
            <Text
              style={[
                AddPaymentMethodStyles.tabText,
                activeTab === 'bank' && AddPaymentMethodStyles.activeTabText,
              ]}
            >
              BANK
            </Text>
          </TouchableOpacity>
        </View>
        </>
      )}
        <ScrollView contentContainerStyle={AddPaymentMethodStyles.formContent}>
          {activeTab === 'card' && mode === 'buy' ? (
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
            style={[
              AddPaymentMethodStyles.submitBtn,
              isLoading && { opacity: 0.7 },
            ]}
            onPress={() => {
              if (activeTab === 'card') {
                handleLinkCard();
              } else {
                handleLinkBank();
              }
            }}
            disabled={isLoading}
          >
            <Text style={AddPaymentMethodStyles.submitBtnText}>
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
export const AddPaymentMethodStyles = StyleSheet.create({
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
  divider: {
    height: 1,
    backgroundColor: '#fadccc',
    marginVertical: 10,
    opacity: 0.5,
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
  title: { fontSize: 16, fontWeight: '600', color: PRIMARY_COLOR },
});