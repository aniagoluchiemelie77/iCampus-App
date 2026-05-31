import React, { useState, useEffect, FC } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { PRIMARY_COLOR } from '@components/Classroomcomponent';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { PageHeader } from '../components/PageHeader';
import { PRIMARY_COLOR_TINT } from './Classroomcomponent.tsx';
import { SvgProps } from 'react-native-svg';
import { initiatePaymentCharge } from '../api/localPostApis.ts';
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
  validateExpiryMonth,
  validateCVV,
  getBin,
  fetchCardInfo,
  formatCardNumber,
} from '../utils/UserTransactionsHelpers.tsx';
import { User } from 'types/firebase';
import { fetchSupportedBanks } from 'api/localGetApis.ts';
const { width } = Dimensions.get('window');
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Modal from 'react-native-modal';
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
  colors: any;
}
interface BankFormProps {
  bankData: {
    bankCode: string;
    accountNumber: string;
    accountName: string;
  };
  setBankData: React.Dispatch<React.SetStateAction<any>>;
  bankItems: { label: string; value: string }[];
  colors: any;
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
const BankForm = ({
  bankData,
  setBankData,
  bankItems,
  colors,
}: BankFormProps) => {
  const [openBank, setOpenBank] = useState(false);
  return (
    <>
      <View style={AddPaymentMethodStyles.inputGroup}>
        <Text
          style={[AddPaymentMethodStyles.label, { color: colors.textDarker }]}
        >
          Select Bank
        </Text>
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
          style={[
            AddPaymentMethodStyles.dropdown,
            { borderBottomColor: colors.border },
          ]}
          dropDownContainerStyle={[
            AddPaymentMethodStyles.dropdownContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
          searchable={true}
          zIndex={3000}
        />
      </View>
      <View style={AddPaymentMethodStyles.inputGroup}>
        <Text
          style={[AddPaymentMethodStyles.label, { color: colors.textDarker }]}
        >
          Account Number
        </Text>
        <TextInput
          style={[
            AddPaymentMethodStyles.input,
            { borderColor: colors.border, color: colors.text },
          ]}
          placeholder="0123456789"
          placeholderTextColor={colors.inputTextHolder}
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
          <MaterialIcons
            name="check-circle-outlined"
            size={16}
            color={colors.primary}
          />
          <Text
            style={[
              AddPaymentMethodStyles.accountNameText,
              { color: colors.text },
            ]}
          >
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
  colors,
  isInternational,
}: CardFormProps) => (
  <>
    <View style={AddPaymentMethodStyles.inputGroup}>
      <Text
        style={[AddPaymentMethodStyles.label, { color: colors.textDarker }]}
      >
        Card Number
      </Text>
      <View
        style={[
          AddPaymentMethodStyles.cardInputWrapper,
          { borderColor: colors.btnColor },
        ]}
      >
        <TextInput
          style={[AddPaymentMethodStyles.flexInput, { color: colors.text }]}
          placeholderTextColor={colors.inputTextHolder}
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
        style={[
          AddPaymentMethodStyles.inputGroup,
          { flex: 2, marginRight: 10 },
        ]}
      >
        <Text
          style={[AddPaymentMethodStyles.label, { color: colors.textDarker }]}
        >
          Expiry Date
        </Text>
        <View
          style={[
            AddPaymentMethodStyles.expiryWrapper,
            { borderColor: colors.border },
          ]}
        >
          <TextInput
            style={[AddPaymentMethodStyles.smallInput, { color: colors.text }]}
            placeholder="MM"
            keyboardType="numeric"
            onChangeText={v => setCardData({ ...cardData, month: v })}
            placeholderTextColor={colors.inputTextHolder}
          />
          <Text style={AddPaymentMethodStyles.divider}>/</Text>
          <TextInput
            style={[AddPaymentMethodStyles.smallInput, { color: colors.text }]}
            placeholder="YY"
            keyboardType="numeric"
            onChangeText={v => setCardData({ ...cardData, year: v })}
            placeholderTextColor={colors.inputTextHolder}
          />
        </View>
      </View>
      <View style={[AddPaymentMethodStyles.inputGroup, { flex: 1 }]}>
        <Text
          style={[AddPaymentMethodStyles.label, { color: colors.textDarker }]}
        >
          CVV
        </Text>
        <TextInput
          style={[
            AddPaymentMethodStyles.input,
            { borderColor: colors.border, color: colors.text },
          ]}
          placeholder="123"
          placeholderTextColor={colors.inputTextHolder}
          secureTextEntry
          keyboardType="numeric"
          onChangeText={v => setCardData({ ...cardData, cvv: v })}
        />
      </View>
      {requiresPin && (
        <View style={AddPaymentMethodStyles.inputGroup}>
          <Text style={AddPaymentMethodStyles.label}>Card PIN</Text>
          <TextInput
            style={[
              AddPaymentMethodStyles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
            placeholderTextColor={colors.inputTextHolder}
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
            { marginBottom: 10, color: colors.textDarker },
          ]}
        >
          Billing Address (Required for International Cards)
        </Text>
        <View style={AddPaymentMethodStyles.inputGroup}>
          <TextInput
            style={[
              AddPaymentMethodStyles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
            placeholder="Street Address"
            placeholderTextColor={colors.inputTextHolder}
            value={cardData.address}
            onChangeText={v => setCardData({ ...cardData, address: v })}
          />
        </View>
        <View style={AddPaymentMethodStyles.row}>
          <View
            style={[
              AddPaymentMethodStyles.inputGroup,
              { flex: 1, marginRight: 8 },
            ]}
          >
            <TextInput
              style={[
                AddPaymentMethodStyles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="City"
              placeholderTextColor={colors.inputTextHolder}
              value={cardData.city}
              onChangeText={v => setCardData({ ...cardData, city: v })}
            />
          </View>
          <View
            style={[
              AddPaymentMethodStyles.inputGroup,
              { flex: 1, marginRight: 8 },
            ]}
          >
            <TextInput
              style={[
                AddPaymentMethodStyles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="State/Province"
              placeholderTextColor={colors.inputTextHolder}
              value={cardData.state}
              onChangeText={v => setCardData({ ...cardData, state: v })}
            />
          </View>
          <View style={[AddPaymentMethodStyles.inputGroup, { flex: 1 }]}>
            <TextInput
              style={[
                AddPaymentMethodStyles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Zip Code"
              placeholderTextColor={colors.inputTextHolder}
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
    mode === 'withdraw' ? 'bank' : 'card',
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
  const { colors } = useTheme();
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

    try {
      const response = await initiatePaymentCharge('card', {
        cardData: {
          number,
          cvv,
          month,
          year,
          pin,
          name,
          address: cardData.address,
          city: cardData.city,
          state: cardData.state,
          zipcode: cardData.zipcode,
          country: cardData.country,
        },
        isInternational,
        currencyCode: currencyData.code || 'NGN',
      });
      const result = response.data;

      if (result && result.status === 'success') {
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
          text2: result?.message || 'Transaction could not be verified.',
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
      const response = await initiatePaymentCharge('account', payload);
      const result = response.data;
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
        const banks = await fetchSupportedBanks(countryCode);
        if (banks.length > 0) {
          setBankItems(banks);
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
    <Modal
      isVisible={visible}
      onBackdropPress={() => onClose()}
      swipeDirection="down"
      onSwipeComplete={() => onClose()}
      style={AddPaymentMethodStyles.modalOverride}
    >
      <View
        style={[
          AddPaymentMethodStyles.container,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <PageHeader
          title="Add Payment Method"
          showBackButton={false}
          rightElement={
            <MaterialIcons
              name="cancel-outlined"
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
                  activeTab === 'card' && {
                    borderBottomColor: colors.primary,
                  },
                ]}
                onPress={() => setActiveTab('card')}
              >
                <Text
                  style={[
                    AddPaymentMethodStyles.tabText,
                    activeTab === 'card'
                      ? {
                          color: colors.primary,
                        }
                      : {
                          color: colors.textDarker,
                        },
                  ]}
                >
                  CARD
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  AddPaymentMethodStyles.tab,
                  activeTab === 'bank' && {
                    borderBottomColor: colors.primary,
                  },
                ]}
                onPress={() => setActiveTab('bank')}
              >
                <Text
                  style={[
                    AddPaymentMethodStyles.tabText,
                    activeTab === 'bank'
                      ? {
                          color: colors.primary,
                        }
                      : {
                          color: colors.textDarker,
                        },
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
              colors={colors}
            />
          ) : (
            <BankForm
              bankData={bankData}
              setBankData={setBankData}
              bankItems={bankItems}
              colors={colors}
            />
          )}

          <TouchableOpacity
            style={[
              AddPaymentMethodStyles.submitBtn,
              { backgroundColor: colors.btnColor },
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
            <Text
              style={[
                AddPaymentMethodStyles.submitBtnText,
                { color: colors.btnTextColor },
              ]}
            >
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
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
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
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: { fontWeight: '700', fontSize: 14 },
  formContent: { paddingHorizontal: 15 },
  inputGroup: { marginBottom: 20 },
  cardInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.8,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
  },
  flexInput: { flex: 1, fontSize: 16, fontWeight: '600' },
  input: {
    borderWidth: 0.8,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
    fontSize: 14,
    fontWeight: '600',
  },
  row: { flexDirection: 'row' },
  expiryWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.8,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 55,
  },
  smallInput: {
    textAlign: 'center',
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  submitBtnText: { fontSize: 14, fontWeight: '700' },
  dropdown: {
    padding: 9,
    borderRadius: 12,
    borderBottomWidth: 0.8,
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
  modalOverride: {
    margin: 0,
  },
});