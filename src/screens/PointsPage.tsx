import React, { useState, useEffect, FC, useRef } from 'react';
import { SvgProps } from 'react-native-svg';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { v4 as uuidv4 } from 'uuid';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { UserBankOrCardDetails } from '../types/firebase';
import {
  HomeScreenComponentStyles,
  homeStyles,
  ProfileComponentStyles,
  NotificationDetailsStyles,
} from '../assets/styles/colors';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../components/hooks';
import { baseUrl } from '../components/HomeScreenComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { BlurView } from '@react-native-community/blur';
import { VERVE_SEARCH_API_KEY, FLUTTERWAVE_CLIENT_SECRET } from '@env';
import DropDownPicker from 'react-native-dropdown-picker';
import axios from 'axios';
import { CameraKitCameraScreen } from 'react-native-camera-kit';
import {
  MasterCardLogo,
  VisaCardLogo,
  DiscoverCardLogo,
  AmericanExpressCardLogo,
  VerveCardLogo,
} from '../assets/images/Logo';

type NavigationProp = StackNavigationProp<RootStackParamList>;
const screenWidth = Dimensions.get('window').width;

type QRScannerPopupProps = {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  setScannerVisible: (visible: boolean) => void;
};

const QRScannerPopup: React.FC<QRScannerPopupProps> = ({
  visible,
  onClose,
  onScan,
  setScannerVisible,
}) => {
  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View style={HomeScreenComponentStyles.overlayCenter}>
        <TouchableWithoutFeedback onPress={() => setScannerVisible(false)}>
          <View style={HomeScreenComponentStyles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={HomeScreenComponentStyles.popupCenter}>
          <CameraKitCameraScreen
            scanBarcode={true}
            onReadCode={(event: {
              nativeEvent: { codeStringValue: string };
            }) => {
              const value = event.nativeEvent.codeStringValue;
              if (value) {
                onScan(value);
                onClose();
              }
            }}
            showFrame={true}
            laserColor={'#FF0000'}
            frameColor={'#00FF00'}
          />

          {/* Custom marker */}
          <View style={ProfileComponentStyles.modalImage2} />

          <View style={HomeScreenComponentStyles.topHeader2}>
            <Text style={HomeScreenComponentStyles.welcomeText2}>
              Scan a transaction's QR Code for payment completion
            </Text>
          </View>

          <View style={ProfileComponentStyles.modalButtons}>
            <TouchableOpacity
              onPress={onClose}
              style={ProfileComponentStyles.confirmButton}
            >
              <Text style={ProfileComponentStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const validateExpiryMonth = (month: string): string | null => {
  const num = Number(month);
  return /^\d{2}$/.test(month) && num >= 1 && num <= 12
    ? null
    : 'Enter a valid month (01–12)';
};
export const validateExpiryYear = (year: string): string | null => {
  const currentYear = new Date().getFullYear() % 100; // last 2 digits
  const num = Number(year);
  return /^\d{2}$/.test(year) && num >= currentYear
    ? null
    : `Enter a valid year (≥ ${currentYear})`;
};

export const formatDatePretty = (dateString: string): string => {
  const date = new Date(dateString);

  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' }); // e.g., "Nov"
  const year = date.getFullYear();

  const getOrdinal = (n: number): string => {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  return `${day}${getOrdinal(day)} ${month} ${year}`;
};
export const validateCVV = (cvv: string): string | null => {
  return /^\d{3,4}$/.test(cvv) ? null : 'Enter a valid CVV (3–4 digits)';
};
export const getBin = (cardNumber: string): string => {
  return cardNumber.replace(/\D/g, '').slice(0, 6);
};

const PointsPage = () => {
  const navigation2 = useNavigation<NavigationProp>();
  const user = useAppSelector(state => state.user);
  const [showPoints, setShowPoints] = useState(true);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showCardOrAccountDetailsAddPopup, setCardOrAccountDetailsAddPopup] =
    useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);
  const [accountDetails] = useState<string[]>(user?.userAccountDetails || []);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [fetchedDetails, setFetchedDetails] = useState<UserBankOrCardDetails[]>(
    [],
  );
  const [cardError, setCardError] = useState<string | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cardorBankDetailsError, setCardorBankDetailsError] = useState<
    string | null
  >(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardBrand, setCardBrand] = useState('');
  const [cardLogo, setCardLogo] = useState('');
  const [activeTab, setActiveTab] = useState<'card' | 'bank'>('card');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [showAccountName, setShowAccountName] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cvv, setCvv] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [cvvError, setCvvError] = useState<string | null>(null);
  const [cardOrBankDetailsRes, setCardOrBankDetailsRes] = useState<
    string | null
  >(null);
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [yearError, setYearError] = useState<string | null>(null);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [currencyCode, setCurrencyCode] = useState<string | null>(null);
  const [currencyError, setCurrencyError] = useState<string | null>(null);
  const [country, setCountry] = useState(null);
  const [openCountry, setOpenCountry] = useState(false);
  const [openState, setOpenState] = useState(false);
  const [openCity, setOpenCity] = useState(false);
  const [state, setState] = useState(null);
  const [city, setCity] = useState(null);
  const [bankCode, setBankCode] = useState<string | null>(null);

  const [countryItems, setCountryItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [stateItems, setStateItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [cityItems, setCityItems] = useState<
    { label: string; value: string }[]
  >([]);
  const [openBank, setOpenBank] = useState(false);
  const [bankName, setBankName] = useState<string | null>(null);
  const [bankItems, setBankItems] = useState<
    { label: string; value: string }[]
  >([]);
  const yearRef = useRef<TextInput>(null);

  const cardBrandLogos: Record<string, FC<SvgProps>> = {
    VISA: VisaCardLogo,
    MASTERCARD: MasterCardLogo,
    MAESTRO: VerveCardLogo,
    'AMERICAN EXPRESS': AmericanExpressCardLogo,
    DISCOVER: DiscoverCardLogo,
  };
  const formatCardNumber = (input: string): string => {
    const cleaned = input.replace(/\D/g, '');
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };
  const completeTransaction = async (transactionId: string): Promise<void> => {
    const userUid = user?.uid;
    const token = await AsyncStorage.getItem('authToken');
    let data;
    try {
      const res = await fetch(
        `${baseUrl}users/transactions/complete/${transactionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ uid: userUid }),
        },
      );
      data = await res.json();
      if (res.ok) {
        setPointsAwarded(data.transactionsTotalPriceInPoints);
        setShowSuccessPopup(true);
      } else {
        setShowErrorPopup(true);
        setTimeout(() => setShowErrorPopup(false), 3000);
      }
    } catch (err) {
      console.error('API error:', err);
      setError(data.message);
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 3000);
    }
  };
  const fetchCardInfo = async (bin: string) => {
    try {
      let cardData = null;
      // Try BinList first
      const binlistResponse = await fetch(`https://lookup.binlist.net/${bin}`);
      if (binlistResponse.ok) {
        cardData = await binlistResponse.json();
        console.log('BinList:', cardData);
        return cardData;
      }

      // Fallback to APIVerve
      const apiverveResponse = await fetch(
        `https://api.apiverve.com/v1/binlookup?bin=${bin}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': VERVE_SEARCH_API_KEY, // Replace with your actual key
          },
        },
      );

      if (apiverveResponse.ok) {
        cardData = await apiverveResponse.json();
        console.log('APIVerve:', cardData);
        return cardData;
      }
      return null;
    } catch (err) {
      console.error('BIN lookup error:', err);
      return null;
    }
  };
  const handleMonthChange = (text: string) => {
    const cleaned = text.replace(/\D/g, ''); // only digits
    setExpiryMonth(cleaned);

    if (cleaned.length === 2) {
      yearRef.current?.focus(); // jump to year field
    }
  };
  const handleYearChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setExpiryYear(cleaned);
  };

  //Fetch User added cards or bank accounts
  useEffect(() => {
    if (!user?.userAccountDetails || user.userAccountDetails.length === 0)
      return;
    const fetchAccountDetails = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const res = await fetch(`${baseUrl}user/account-details`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            payload: { ids: user.userAccountDetails },
            user: user.uid,
          }),
        });
        const data = await res.json();
        if (res.ok && data.details) {
          setFetchedDetails(data.details); // ✅ Update state with filtered account details
        } else {
          console.error('Error fetching account details:', data.message);
          Toast.show({
            type: 'error',
            text2: data.message,
            position: 'bottom',
            bottomOffset: 10,
          });
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Something went wrong while adding card';
        console.error('Error fetching account details:', err);
        Toast.show({
          type: 'error',
          text2: errorMessage,
          position: 'bottom',
          bottomOffset: 10,
        });
      }
    };
    fetchAccountDetails();
  }, [user.uid, user.userAccountDetails]);

  //Fetch Bank using user.country
  useEffect(() => {
    if (user.country) {
      const countryCodeMap: Record<string, string> = {
        Nigeria: 'NG',
        Egypt: 'EG',
        Ghana: 'GH',
        Kenya: 'KE',
        Rwanda: 'RW',
        Cameroon: 'CM',
        Ethiopia: 'ET',
        Uganda: 'UG',
        Zambia: 'ZM',
        'South Africa': 'ZA',
        Malawi: 'MW',
        Senegal: 'SN',
        Tanzania: 'TZ',
        'Sierra Leone': 'SL',
        Zimbabwe: 'ZW',
        'United States of America': 'US',
        // Add more mappings as needed
      };
      const countryCode = countryCodeMap[user.country] || user.country;
      const options = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${FLUTTERWAVE_CLIENT_SECRET}`, // ✅ Required
        },
      };
      fetch(
        `https://developersandbox-api.flutterwave.com/banks?country=${countryCode}`,
        options,
      )
        .then(res => res.json())
        .then(data => {
          const banks = data?.data?.map(
            (bank: { name: string; code: string }) => ({
              label: bank.name,
              value: bank.code,
            }),
          );
          setBankItems(banks || []);
          console.log('Banks loaded:', banks);
        })
        .catch(err => console.error('Error fetching banks:', err));
    }
  }, [user.country]);

  //Save Bank Name
  useEffect(() => {
    const selectedBank = bankItems.find(item => item.value === bankCode);
    if (selectedBank) {
      setBankName(selectedBank.label);
    }
  }, [bankCode, bankItems]);

  //Fetch account name using bank and verified account number
  useEffect(() => {
    const resolveAccountName = async () => {
      if (accountNumber && bankCode && accountNumber.length >= 8) {
        try {
          const response = await fetch(
            'https://developersandbox-api.flutterwave.com/v3/accounts/resolve',
            {
              method: 'POST',
              headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                Authorization: `Bearer ${FLUTTERWAVE_CLIENT_SECRET}`, // ✅ Required
              },
              body: JSON.stringify({
                account_number: accountNumber,
                account_bank: bankCode, // bank code, not name
              }),
            },
          );
          const data = await response.json();
          if (data.status === 'success' && data.data?.account_name) {
            setAccountHolderName(data.data.account_name);
            setShowAccountName(true);
          } else {
            setAccountHolderName('Account not found');
            setShowAccountName(false);
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : 'Something went wrong while adding card';
          console.error('Lookup failed:', err);
          setAccountHolderName(errorMessage);
          setShowAccountName(false);
        }
      } else {
        setAccountHolderName('Account not found 3');
        setShowAccountName(false);
      }
    };

    resolveAccountName();
  }, [accountNumber, bankCode]);

  //Fetch card details (logo, brand, and check if it exists using card number)
  useEffect(() => {
    const bin = getBin(cardNumber);
    setCardBrand('');
    setCardLogo('');
    setCardError(null); // Add this state: const [cardError, setCardError] = useState<string | null>(null);
    if (bin.length === 6) {
      setIsLoading(true);
      fetchCardInfo(bin)
        .then(response => {
          if (response) {
            setIsLoading(false);
            setCardBrand(response.data.brand || '');
            setCardLogo(response.data.brand || '');
          } else {
            setIsLoading(false);
            setCardError('Card not recognized. Please check the number.');
          }
        })
        .catch(() => {
          setIsLoading(false);
          setCardError('Unable to verify card. Try again later.');
        });
    }
  }, [cardNumber]);

  //Validate CVV
  useEffect(() => {
    if (cvv !== '') {
      setCvvError(validateCVV(cvv));
    } else {
      setCvvError(null); // no error until user types
    }
  }, [cvv]);

  useEffect(() => {
    if (expiryMonth !== '') {
      setMonthError(validateExpiryMonth(expiryMonth));
    } else {
      setMonthError(null);
    }
  }, [expiryMonth]);

  useEffect(() => {
    if (expiryYear !== '') {
      setYearError(validateExpiryYear(expiryYear));
    } else {
      setYearError(null);
    }
  }, [expiryYear]);

  //Fetch currency eg 'NGN' using user.country
  useEffect(() => {
    if (!country) return;
    const fetchCurrency = async () => {
      try {
        const res = await fetch(
          `https://restcountries.com/v3.1/name/${encodeURIComponent(
            country,
          )}?fullText=true`,
        );
        const data = await res.json();
        const code = Object.keys(data[0].currencies)[0];
        setCurrencyCode(code);
      } catch (err) {
        console.error('Country not found or invalid:', err);
        setCurrencyError(
          'Unable to fetch currency, country either not found or invalid',
        );
      }
    };
    fetchCurrency();
  }, [country]);

  //Send card details to flutterwave (gateway)
  useEffect(() => {
    const isCardReady = () =>
      cardNumber.length >= 12 &&
      cvv.length >= 3 &&
      expiryMonth.length >= 1 &&
      expiryYear.length >= 2 &&
      nameOnCard.length > 2;

    if (!isCardReady()) return;
    const payload = {
      card_number: cardNumber,
      cvv: cvv,
      expiry_month: expiryMonth, // from user input
      expiry_year: expiryYear, // from user input
      currency: currencyCode, // or 'USD', 'GHS', etc.
      amount: '100', // test amount (can be small)
      fullname: nameOnCard, // required
      email: user.email, // required
      tx_ref: 'MC-' + Date.now(), // unique transaction reference
      authorization: {
        mode: 'pin', // ✅ correct key
        pin: '3310', // ✅ required for test cards
      },
      recurring: false,
    };
    const options = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FLUTTERWAVE_CLIENT_SECRET}`, //
      },
      body: JSON.stringify(payload),
    };
    fetch(
      'https://developersandbox-api.flutterwave.com/charges?type=card',
      options,
    )
      .then(res => res.json())
      .then(res => {
        console.log('Charge response:', res);
        // Optionally show toast or update UI
      })
      .catch(err => {
        console.error('Charge error:', err);
        Toast.show({
          type: 'error',
          text2: err,
          position: 'bottom',
          bottomOffset: 10,
        });
      });
  }, [
    cardNumber,
    currencyCode,
    cvv,
    user?.email,
    expiryMonth,
    expiryYear,
    nameOnCard,
  ]);

  //Country fetch
  useEffect(() => {
    axios
      .get('https://countriesnow.space/api/v0.1/countries/positions')
      .then(response => {
        const countries = response.data.data.map((item: any) => ({
          label: item.name,
          value: item.name,
        }));
        setCountryItems(countries);
      });
  }, []);

  //States fetch
  useEffect(() => {
    if (country) {
      axios
        .post('https://countriesnow.space/api/v0.1/countries/states', {
          country,
        })
        .then(response => {
          const states = response.data.data.states.map((item: any) => ({
            label: item.name,
            value: item.name,
          }));
          setStateItems(states);
          setState(null); // reset state
          setCityItems([]); // reset cities
        });
    }
  }, [country]);

  //City fetch
  useEffect(() => {
    if (country && state) {
      axios
        .post('https://countriesnow.space/api/v0.1/countries/state/cities', {
          country,
          state,
        })
        .then(response => {
          const cities = response.data.data.map((name: string) => ({
            label: name,
            value: name,
          }));
          setCityItems(cities);
          setCity(null); // reset city
        });
    }
  }, [state, country]);

  const saveDetailsToDatabase = async (
    cardDetails: UserBankOrCardDetails,
    type: string,
  ) => {
    setShowAddPopup(false); //Close the add bank or card popup
    const token = await AsyncStorage.getItem('authToken');
    let data;
    try {
      const payload = {
        ...cardDetails,
        type: type,
      };
      const res = await fetch(`${baseUrl}user/addCardOrBankDetails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      data = await res.json();
      if (res.ok) {
        setCardOrAccountDetailsAddPopup(true);
        setCardOrBankDetailsRes(data.message);
        setTimeout(() => setCardOrAccountDetailsAddPopup(false), 3000);
      } else {
        console.error('Server error:', data.message);
        setShowErrorPopup(true);
        setCardorBankDetailsError(data.message);
        setTimeout(() => setShowErrorPopup(false), 3000);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Something went wrong while adding card';
      console.error('API error:', err);
      setShowErrorPopup(true);
      setCardorBankDetailsError(errorMessage);
      setTimeout(() => setShowErrorPopup(false), 3000);
    }
  };
  const handleSubmitDetails = async () => {
    let type;
    if (activeTab === 'card') {
      if (!cardNumber || !cvv || !expiryMonth || !expiryYear || !nameOnCard) {
        setCardError('Please fill in all required card fields');
        return;
      }
      // 2. Send card data to Flutterwave for tokenization
      try {
        const response = await fetch(
          'https://api.flutterwave.com/v3/tokenize-card',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${FLUTTERWAVE_CLIENT_SECRET}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              card_number: cardNumber.replace(/\s/g, ''),
              cvv,
              expiry_month: expiryMonth,
              expiry_year: expiryYear,
              currency: currencyCode,
              amount: 100,
              fullname: nameOnCard,
              email: user.email,
              tx_ref: `card-${Date.now()}`,
            }),
          },
        );
        const data = await response.json();
        if (data.status === 'success') {
          const cardDetails: UserBankOrCardDetails = {
            cardOrBankDetailsId: data.data.card_token,
            userId: user.uid,
            paymentToken: data.data.card_token,
            method: 'card',
            provider: 'flutterwave',
            lastFourDigits: data.data.card.last_4digits,
            cardBrand: data.data.card.brand,
            expiryMonth: data.data.card.expiry_month,
            expiryYear: data.data.card.expiry_year,
            country: country ?? undefined,
            isDefault: true,
            createdAt: new Date().toISOString(),
            billingAddressDetails: {
              state: state ?? undefined,
              city: city ?? undefined,
              street: address1 ?? undefined, // ✅ Rename 'address' to 'street' to match your interface
              zip: postalCode ?? undefined,
            },
          };
          type = 'card';
          await saveDetailsToDatabase(cardDetails, type);
        } else {
          setCardError(data.message || 'Card tokenization failed');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Something went wrong while adding card';
        console.error('Card error:', err);
        setCardError(errorMessage);
      }
    } else {
      if (
        !accountNumber ||
        !bankCode ||
        !accountHolderName ||
        accountHolderName === 'Account not found'
      ) {
        setBankError('Error, Please enter valid bank details');
        return;
      }
      try {
        const cardDetails: UserBankOrCardDetails = {
          cardOrBankDetailsId: uuidv4(),
          bankCode: bankCode,
          userId: user.uid,
          accountHolderName: accountHolderName,
          method: 'bank',
          bankAccNumber: accountNumber ?? undefined,
          bankName: bankName ?? undefined,
          country: country ?? undefined,
          isDefault: true,
          createdAt: new Date().toISOString(),
        };
        type = 'bank';
        await saveDetailsToDatabase(cardDetails, type);
      } catch (err) {
        setShowAddPopup(false); //Close the add bank or card popup
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Something went wrong while adding card';
        console.error('Card error:', err);
        setCardorBankDetailsError(errorMessage);
        setTimeout(() => setShowErrorPopup(false), 3000);
      }
    }
  };
  console.log(cardLogo);
  const LogoComponent = cardBrandLogos[cardBrand.toUpperCase()];
  // Show error
  if (currencyError) {
    Toast.show({
      type: 'error',
      text2: currencyError,
      position: 'bottom',
      bottomOffset: 10,
    });
  }
  return (
    <ScrollView
      contentContainerStyle={PointsPageStyles.container}
      nestedScrollEnabled={true}
    >
      <View
        style={[
          PointsPageStyles.balanceContainer,
          {
            minHeight: accountDetails.length > 0 ? 350 : 290, // or any fallback height
            marginBottom: 25,
          },
        ]}
      >
        <View style={HomeScreenComponentStyles.searchContainer}>
          <TouchableOpacity onPress={() => navigation2.navigate('Profile')}>
            <Image
              source={{
                uri:
                  user.profilePic?.[user.profilePic.length - 1] ??
                  'https://example.com/default-profile.png',
              }}
              style={PointsPageStyles.profileImage}
            />
          </TouchableOpacity>
          <View style={HomeScreenComponentStyles.iconSubdiv2}>
            <TouchableOpacity
              //onPress={openFavoritesPopup}
              style={[
                homeStyles.iconItem,
                HomeScreenComponentStyles.activityIcons,
                HomeScreenComponentStyles.activityIcons2b,
              ]}
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={26}
                color="#fff"
              />
              {/*favoriteProducts.length > 0 && (
                <View style={HomeScreenComponentStyles.badge}>
                  <Text style={HomeScreenComponentStyles.badgeText}>
                    {favoriteProducts.length}
                  </Text>
                </View>
              )*/}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setScannerVisible(true)}
              style={[
                homeStyles.iconItem,
                HomeScreenComponentStyles.activityIcons,
                HomeScreenComponentStyles.activityIcons2b,
              ]}
            >
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={26}
                color="#fff"
              />
              {/*cartProducts.length > 0 && (
                <View style={HomeScreenComponentStyles.badge}>
                  <Text style={HomeScreenComponentStyles.badgeText}>
                    {cartProducts.length}
                  </Text>
                </View>
              )*/}
            </TouchableOpacity>
          </View>
        </View>
        <View style={PointsPageStyles.pointsBox}>
          <View style={ProfileComponentStyles.rowBox3}>
            <View style={ProfileComponentStyles.row}>
              <Icon
                name="diamond"
                size={18}
                color="#fff"
                style={ProfileComponentStyles.icon}
              />
              {showPoints ? (
                <Text style={ProfileComponentStyles.baseText}>
                  <Text style={ProfileComponentStyles.smallTextWhite}> </Text>
                  <Text style={ProfileComponentStyles.largeTextWhite}>
                    {Math.floor(user.pointsBalance).toLocaleString()}
                  </Text>
                  <Text style={ProfileComponentStyles.smallTextWhite}>
                    .{(user.pointsBalance % 1).toFixed(2).split('.')[1]}
                  </Text>
                </Text>
              ) : (
                <Text style={ProfileComponentStyles.baseText}>
                  <Text style={ProfileComponentStyles.smallTextWhite}>
                    ****
                  </Text>
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowPoints(prev => !prev)}
              style={ProfileComponentStyles.iconMargin}
            >
              <MaterialIcons
                name={showPoints ? 'visibility' : 'visibility-off'}
                size={22}
                color="#fff"
                style={ProfileComponentStyles.iconMargin}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={PointsPageStyles.pointsBox2}>
          {accountDetails.length === 0 ? (
            <View style={PointsPageStyles.pointsBox2b}>
              <Text style={PointsPageStyles.pointsBox2btext}>
                No Card nor Bank details added yet.
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddPopup(true)}
                style={PointsPageStyles.pointsBox2btn}
              >
                <Text style={PointsPageStyles.pointsBox2btntext}>
                  Add Card or Bank Details
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {fetchedDetails && (
                <FlatList
                  data={fetchedDetails}
                  horizontal
                  keyExtractor={item => item.cardOrBankDetailsId}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <BlurView
                      blurType="light"
                      blurAmount={10}
                      style={PointsPageStyles.cardContainer}
                    >
                      {item.method === 'card' ? (
                        <>
                          <View style={PointsPageStyles.rowDivCenter}>
                            {item.cardBrand &&
                              cardBrandLogos[item.cardBrand] && (
                                <View style={{ marginVertical: 4 }}>
                                  {React.createElement(
                                    cardBrandLogos[item.cardBrand],
                                    {
                                      width: 40,
                                      height: 24,
                                    },
                                  )}
                                </View>
                              )}
                            <MaterialCommunityIcons
                              name="credit-card-outline"
                              size={16}
                              color="#eee"
                            />
                          </View>
                          <Text style={PointsPageStyles.label}>
                            {item.lastFourDigits}
                          </Text>
                          <View style={PointsPageStyles.rowDiv}>
                            <Text style={PointsPageStyles.label2}>
                              Added on {formatDatePretty(item.createdAt)}
                            </Text>
                            <Text style={PointsPageStyles.label2}>
                              {item.expiryMonth}/{item.expiryYear}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <MaterialIcons
                            name="bank-outline"
                            size={16}
                            color="#eee"
                            style={{ alignSelf: 'flex-end' }}
                          />
                          <Text style={PointsPageStyles.label}>
                            {item.bankName}
                          </Text>
                          <Text style={PointsPageStyles.labelHigher}>
                            {item.bankAccNumber}
                          </Text>
                        </>
                      )}
                    </BlurView>
                  )}
                />
              )}
            </>
          )}
        </View>
        <View style={PointsPageStyles.balanceContainerFooter}>
          <View style={PointsPageStyles.columnDiv}>
            <TouchableOpacity
              //style={PointsPageStyles.equalDiv}
              onPress={() => navigation2.navigate('BuyPointsScreen')}
            >
              <MaterialCommunityIcons
                name="cash-plus"
                size={34}
                color="#f54b02"
              />
            </TouchableOpacity>
          </View>
          <View style={PointsPageStyles.columnDiv}>
            <TouchableOpacity
              //style={PointsPageStyles.equalDiv}
              onPress={() => navigation2.navigate('WithdrawPointsScreen')}
            >
              <MaterialIcons name="account-balance" size={25} color="#f54b02" />
            </TouchableOpacity>
          </View>
          <View style={PointsPageStyles.columnDiv}>
            <TouchableOpacity
              //style={PointsPageStyles.equalDiv}
              onPress={() => navigation2.navigate('TransferPointsScreen')}
            >
              <Icon name="send" size={25} color="#f54b02" />
            </TouchableOpacity>
          </View>
          <View style={PointsPageStyles.columnDiv}>
            <TouchableOpacity
              //style={PointsPageStyles.equalDiv}
              onPress={() => navigation2.navigate('ReceivePointsScreen')}
            >
              <MaterialIcons
                name="send-and-archive"
                size={25}
                color="#f54b02"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <QRScannerPopup
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={transactionId => completeTransaction(transactionId)}
        setScannerVisible={setScannerVisible}
      />
      <Modal visible={showSuccessPopup} transparent animationType="fade">
        <View style={HomeScreenComponentStyles.overlayCenter}>
          <TouchableWithoutFeedback onPress={() => setShowSuccessPopup(false)}>
            <View style={HomeScreenComponentStyles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={HomeScreenComponentStyles.popupCenter}>
            {pointsAwarded !== null && (
              <View style={NotificationDetailsStyles.totalDiv}>
                <Icon name="diamond-outline" size={23} color="#f54b02" />
                <Text style={NotificationDetailsStyles.totalPriceText}>
                  <Text style={NotificationDetailsStyles.largeText}>
                    {Math.floor(pointsAwarded).toLocaleString()}
                  </Text>
                  <Text style={NotificationDetailsStyles.smallText}>
                    .{(pointsAwarded % 1).toFixed(2).split('.')[1]}
                  </Text>
                </Text>
              </View>
            )}
            <View style={PointsPageStyles.successDiv}>
              <View style={NotificationDetailsStyles.statusDiv2}>
                <MaterialIcons
                  name="check-circle"
                  size={18}
                  color="#f54b02"
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    { color: '#f54b02' },
                    NotificationDetailsStyles.statusDivText,
                  ]}
                >
                  Payment Successful
                </Text>
              </View>
            </View>
            <View style={PointsPageStyles.rateDiv}>
              <Text style={HomeScreenComponentStyles.welcomeText2b}>
                Help us with a review of your payment experience to help us
                serve you better.
              </Text>
              <View style={ProfileComponentStyles.modalButtons2}>
                <TouchableOpacity
                  style={ProfileComponentStyles.confirmButton}
                  onPress={() => {
                    setShowSuccessPopup(false);
                    // Navigate to rating screen or open rating modal
                  }}
                >
                  <Text style={ProfileComponentStyles.buttonText}>
                    Rate Now
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={ProfileComponentStyles.cancelButton}
                  onPress={() => setShowSuccessPopup(false)}
                >
                  <Text style={ProfileComponentStyles.buttonText}>Later</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showErrorPopup} transparent animationType="fade">
        <View style={HomeScreenComponentStyles.overlayCenter}>
          <TouchableWithoutFeedback
            onPress={() => {
              setShowErrorPopup(false);
              setCardorBankDetailsError(null);
            }}
          >
            <View style={HomeScreenComponentStyles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={HomeScreenComponentStyles.popupCenterSmall}>
            {error && (
              <View style={NotificationDetailsStyles.totalDiv}>
                <MaterialCommunityIcons
                  name="error"
                  size={28}
                  color="#f54b02"
                  style={{ marginRight: 5 }}
                />
                <Text style={NotificationDetailsStyles.largeText2}>
                  {error}
                </Text>
              </View>
            )}
            {cardorBankDetailsError && (
              <View style={NotificationDetailsStyles.totalDiv}>
                <MaterialCommunityIcons
                  name="error"
                  size={28}
                  color="#f54b02"
                  style={{ marginRight: 5 }}
                />
                <Text style={NotificationDetailsStyles.largeText2}>
                  {cardorBankDetailsError}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <Modal visible={showAddPopup} transparent animationType="slide">
        <View style={HomeScreenComponentStyles.overlayCenter}>
          <TouchableWithoutFeedback onPress={() => setShowAddPopup(false)}>
            <View style={HomeScreenComponentStyles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={HomeScreenComponentStyles.popupCenter2}>
            <View style={PointsPageStyles.tabHeader}>
              <TouchableOpacity
                onPress={() => setActiveTab('card')}
                style={[
                  PointsPageStyles.tabButton,
                  activeTab === 'card' && PointsPageStyles.activeTab,
                ]}
              >
                <Text
                  style={[
                    PointsPageStyles.tabText,
                    activeTab === 'card' && PointsPageStyles.activeTabText,
                  ]}
                >
                  Card
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('bank')}
                style={[
                  PointsPageStyles.tabButton,
                  activeTab === 'bank' && PointsPageStyles.activeTab,
                ]}
              >
                <Text
                  style={[
                    PointsPageStyles.tabText,
                    activeTab === 'bank' && PointsPageStyles.activeTabText,
                  ]}
                >
                  Bank
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ width: '100%' }}
              contentContainerStyle={{ paddingVertical: 7 }}
              nestedScrollEnabled={true}
            >
              <Text style={PointsPageStyles.modalTitle}>
                {activeTab === 'card' ? 'Card' : 'Bank'} Details
              </Text>

              {activeTab === 'card' ? (
                <>
                  <View style={PointsPageStyles.cardInputDiv}>
                    <TextInput
                      placeholder="Card Number"
                      placeholderTextColor="#6b6a6aff"
                      keyboardType="numeric"
                      value={cardNumber}
                      maxLength={23}
                      onChangeText={text =>
                        setCardNumber(formatCardNumber(text))
                      }
                      style={PointsPageStyles.inputCardNumber}
                      accessibilityLabel="Card Number Input"
                      testID="cardNumberInput"
                    />
                    {LogoComponent && (
                      <LogoComponent style={PointsPageStyles.cardLogo} />
                    )}
                    {isLoading && (
                      <ActivityIndicator size="small" color="#f54b02" />
                    )}
                  </View>
                  {cardError && (
                    <View style={PointsPageStyles.errorDiv2}>
                      <MaterialIcons
                        name="error"
                        size={15}
                        color="#f54b02"
                        style={{ marginRight: 5 }}
                      />
                      <Text style={PointsPageStyles.errorText}>
                        {cardError}
                      </Text>
                    </View>
                  )}
                  <View style={PointsPageStyles.sideBySideDiv}>
                    <View style={PointsPageStyles.sideBySideDivSubdiv}>
                      <TextInput
                        placeholder="CVV"
                        placeholderTextColor="#6b6a6aff"
                        keyboardType="numeric"
                        secureTextEntry={true}
                        style={PointsPageStyles.input2}
                        value={cvv}
                        onChangeText={setCvv}
                      />
                    </View>
                    <View
                      style={[
                        PointsPageStyles.sideBySideDivSubdiv,
                        { marginLeft: 15 },
                      ]}
                    >
                      <View style={PointsPageStyles.rowDiv2}>
                        <TextInput
                          placeholder="MM"
                          keyboardType="numeric"
                          placeholderTextColor="#6b6a6aff"
                          style={PointsPageStyles.input2}
                          maxLength={2}
                          value={expiryMonth}
                          onChangeText={handleMonthChange}
                        />
                        <Text style={PointsPageStyles.rowDiv2Text}>/</Text>
                        <TextInput
                          placeholderTextColor="#6b6a6aff"
                          placeholder="YY"
                          maxLength={2}
                          keyboardType="numeric"
                          style={PointsPageStyles.input2}
                          value={expiryYear}
                          onChangeText={handleYearChange}
                        />
                      </View>
                    </View>
                  </View>
                  {cvvError && (
                    <View style={PointsPageStyles.errorDiv2}>
                      <MaterialIcons
                        name="error"
                        size={15}
                        color="#f54b02"
                        style={{ marginRight: 5 }}
                      />
                      <Text style={PointsPageStyles.errorText}>{cvvError}</Text>
                    </View>
                  )}
                  {monthError && (
                    <View style={PointsPageStyles.errorDiv2}>
                      <MaterialIcons
                        name="error"
                        size={15}
                        color="#f54b02"
                        style={{ marginRight: 5 }}
                      />
                      <Text style={PointsPageStyles.errorText}>
                        {monthError}
                      </Text>
                    </View>
                  )}
                  {yearError && (
                    <View style={PointsPageStyles.errorDiv2}>
                      <MaterialIcons
                        name="error"
                        size={15}
                        color="#f54b02"
                        style={{ marginRight: 5 }}
                      />
                      <Text style={PointsPageStyles.errorText}>
                        {yearError}
                      </Text>
                    </View>
                  )}
                  <View style={PointsPageStyles.cardNameInputDiv}>
                    <TextInput
                      placeholder="Name on Card"
                      placeholderTextColor="#6b6a6aff"
                      value={nameOnCard}
                      onChangeText={setNameOnCard}
                      style={PointsPageStyles.input}
                    />
                    <TextInput
                      placeholder="Address 1"
                      placeholderTextColor="#6b6a6aff"
                      value={address1}
                      onChangeText={setAddress1}
                      style={PointsPageStyles.input}
                    />
                    <TextInput
                      placeholder="Address 2 (Optional)"
                      placeholderTextColor="#6b6a6aff"
                      value={address2}
                      onChangeText={setAddress2}
                      style={PointsPageStyles.input}
                    />
                    <DropDownPicker
                      searchPlaceholderTextColor="#6b6a6aff"
                      dropDownContainerStyle={{
                        borderColor: '#f54b02',
                        zIndex: 2,
                        backgroundColor: '#eee',
                      }}
                      open={openCountry}
                      value={country}
                      items={countryItems}
                      setOpen={setOpenCountry}
                      setValue={setCountry}
                      setItems={setCountryItems}
                      searchable={true}
                      placeholder="Select Country"
                      style={PointsPageStyles.input}
                    />
                    <DropDownPicker
                      style={PointsPageStyles.input}
                      open={openState}
                      value={state}
                      items={stateItems}
                      setOpen={setOpenState}
                      setValue={setState}
                      setItems={setStateItems}
                      searchable={true}
                      placeholder="Select State"
                      searchPlaceholderTextColor="#6b6a6aff"
                      dropDownContainerStyle={{
                        borderColor: '#f54b02',
                        zIndex: 2,
                        backgroundColor: '#eee',
                      }}
                    />
                    <DropDownPicker
                      open={openCity}
                      style={PointsPageStyles.input}
                      value={city}
                      items={cityItems}
                      setOpen={setOpenCity}
                      setValue={setCity}
                      setItems={setCityItems}
                      searchable={true}
                      placeholder="Select City"
                      searchPlaceholderTextColor="#6b6a6aff"
                      dropDownContainerStyle={{
                        borderColor: '#f54b02',
                        zIndex: 2,
                        backgroundColor: '#eee',
                      }}
                    />
                    <TextInput
                      placeholder="Postal code"
                      placeholderTextColor="#6b6a6aff"
                      value={postalCode}
                      keyboardType="numeric"
                      onChangeText={setPostalCode}
                      style={PointsPageStyles.input}
                    />
                  </View>
                  {cardError && (
                    <View style={PointsPageStyles.errorDiv2}>
                      <MaterialIcons
                        name="error"
                        size={15}
                        color="#f54b02"
                        style={{ marginRight: 5 }}
                      />
                      <Text style={PointsPageStyles.errorText}>
                        {cardError}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <View style={PointsPageStyles.cardNameInputDiv}>
                    <DropDownPicker
                      open={openBank}
                      value={bankCode}
                      items={bankItems}
                      setOpen={setOpenBank}
                      setValue={setBankCode} // ✅ Only one setValue allowed
                      setItems={setBankItems}
                      searchable={true}
                      placeholder="Select Bank"
                      searchPlaceholderTextColor="#6b6a6aff"
                      style={PointsPageStyles.input}
                    />
                    <TextInput
                      placeholder="Account Number"
                      keyboardType="numeric"
                      placeholderTextColor="#6b6a6aff"
                      style={PointsPageStyles.input}
                      value={accountNumber}
                      onChangeText={setAccountNumber}
                    />
                  </View>
                  {showAccountName && (
                    <TextInput
                      value={accountHolderName}
                      style={[
                        PointsPageStyles.input,
                        accountHolderName === 'Account not found' && {
                          color: 'red',
                        }, // ✅ Error style
                      ]}
                      editable={false}
                    />
                  )}
                  {bankError && (
                    <View style={PointsPageStyles.errorDiv2}>
                      <MaterialIcons
                        name="error"
                        size={15}
                        color="#f54b02"
                        style={{ marginRight: 5 }}
                      />
                      <Text style={PointsPageStyles.errorText}>
                        {bankError}
                      </Text>
                    </View>
                  )}
                </>
              )}
              <View style={PointsPageStyles.buttonRow}>
                <TouchableOpacity
                  onPress={handleSubmitDetails}
                  style={PointsPageStyles.submitButton}
                >
                  <Text style={PointsPageStyles.submitButtonText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showCardOrAccountDetailsAddPopup}
        transparent
        animationType="fade"
      >
        <View style={HomeScreenComponentStyles.overlayCenter}>
          <TouchableWithoutFeedback
            onPress={() => setCardOrAccountDetailsAddPopup(false)}
          >
            <View style={HomeScreenComponentStyles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={HomeScreenComponentStyles.popupCenterSmall}>
            {cardOrBankDetailsRes !== null && (
              <View style={NotificationDetailsStyles.totalDiv}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={28}
                  color="#f54b02"
                />
                <Text style={NotificationDetailsStyles.largeText2}>
                  {cardOrBankDetailsRes}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <Toast config={toastConfig} />
    </ScrollView>
  );
};
export const PointsPageStyles = StyleSheet.create({
  container: {
    flexGrow: 1,
    maxWidth: screenWidth,
    alignItems: 'center',
  },
  balanceContainer: {
    width: '100%',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    backgroundColor: '#f54b02',
    position: 'relative',
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22, // half of width/height for perfect circle
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileImage2: {
    width: 54,
    height: 54,
    borderRadius: 27, // half of width/height for perfect circle
    borderWidth: 1,
    borderColor: '#f54b02',
  },
  pointsBox: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    width: '100%',
    justifyContent: 'flex-start',
  },
  pointsBox2: {
    paddingHorizontal: 10,
    maxWidth: screenWidth,
    justifyContent: 'flex-start',
  },
  pointsBox2btntext: {
    color: '#f54b02',
    fontSize: 14,
    paddingTop: 6,
  },
  pointsBox2btext: {
    color: '#fff',
    fontSize: 14,
    paddingTop: 6,
  },
  pointsBox2btn: {
    backgroundColor: '#fff',
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    width: 'auto',
    marginTop: 8,
    borderRadius: 10,
  },
  pointsBox2b: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  balanceContainerFooter: {
    alignSelf: 'center',
    position: 'absolute',
    bottom: -25,
    width: '89%',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
    alignItems: 'center',
  },
  columnDiv: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee',
    height: 60,
    width: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#f54b02',
  },
  successDiv: {
    width: '100%',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateDiv: {
    width: '100%',
    padding: 10,
    justifyContent: 'center',
  },
  errorDiv: {
    width: '100%',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorDiv2: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardContainer: {
    padding: 10,
    borderRadius: 10,
    marginRight: 10,
    width: 150,
    height: 150,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: 'bold',
    color: '#eee',
    width: '100%',
    paddingBottom: 8,
    fontSize: 13,
  },
  labelHigher: {
    fontWeight: 'bold',
    color: '#eee',
    width: '100%',
    paddingBottom: 8,
    fontSize: 16,
  },
  label2: {
    fontWeight: 'bold',
    color: '#eee',
    fontSize: 11,
  },
  rowDiv: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowDiv2: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowDivCenter: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    width: '80%',
    backgroundColor: '#fff',
  },
  tabButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  activeTab: {
    borderBottomWidth: 1,
    borderBottomColor: '#f54b02',
  },
  tabText: {
    fontWeight: '700',
    fontSize: 14,
  },
  activeTabText: {
    color: '#f54b02',
  },
  modalTitle: {
    width: '100%',
    textAlign: 'center',
    padding: 10,
  },
  input: {
    width: '95%',
    backgroundColor: '#eee',
    padding: 10,
    marginBottom: 15,
    color: '#222',
    fontSize: 13,
    alignSelf: 'center',
    borderWidth: 0.5,
    borderRadius: 8,
    borderColor: '#f54b02',
  },
  inputCardNumber: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    color: '#222',
    fontSize: 13,
    backgroundColor: '#eee',
  },
  input2: {
    width: 49,
    padding: 10,
    borderRadius: 5,
    color: '#222',
    fontSize: 13,
    borderWidth: 0.5,
    borderColor: '#f54b02',
    backgroundColor: '#eee',
  },
  errorText: {
    color: '#f54b02',
    fontSize: 11,
    fontWeight: '700',
  },
  cardInputDiv: {
    maxWidth: '95%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    alignSelf: 'center',
    borderWidth: 0.5,
    borderColor: '#f54b02',
  },
  cardLogo: {
    marginRight: 3,
  },
  brandFallback: {
    height: 25,
    color: '#222',
    marginRight: 3,
  },
  sideBySideDiv: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '95%',
    marginBottom: 15,
    alignSelf: 'center',
  },
  sideBySideDivSubdiv: {
    justifyContent: 'center',
  },
  sideBySideDivSubdivText: {
    paddingTop: 4,
    width: '100%',
    fontSize: 11,
    fontWeight: '700',
    color: '#222',
  },
  rowDiv2Text: {
    marginHorizontal: 5,
    color: '#f54b02',
  },
  cardNameInputDiv: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '95%',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    backgroundColor: '#f54b02',
  },
  submitButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
});
export default PointsPage;