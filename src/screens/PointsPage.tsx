import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
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
import QRCodeScanner from 'react-native-qrcode-scanner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { BlurView } from '@react-native-community/blur';

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
}) => (
  <Modal visible={visible} transparent={true} animationType="slide">
    <View style={HomeScreenComponentStyles.overlayCenter}>
      <TouchableWithoutFeedback onPress={() => setScannerVisible(false)}>
        <View style={HomeScreenComponentStyles.backdrop} />
      </TouchableWithoutFeedback>
      <View style={HomeScreenComponentStyles.popupCenter}>
        <QRCodeScanner
          onRead={e => {
            onScan(e.data);
            onClose();
          }}
          customMarker={<View style={ProfileComponentStyles.modalImage2} />}
          reactivate={true}
          showMarker={true}
          topContent={
            <View style={HomeScreenComponentStyles.topHeader2}>
              <Text style={HomeScreenComponentStyles.welcomeText2}>
                Scan a transaction's QR Code for payment completion
              </Text>
            </View>
          }
          bottomContent={
            <View style={ProfileComponentStyles.modalButtons}>
              <TouchableOpacity
                onPress={onClose}
                style={ProfileComponentStyles.confirmButton}
              >
                <Text style={ProfileComponentStyles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    </View>
  </Modal>
);
export const detectCardBrand = (cardNumber: string): string => {
  if (/^4/.test(cardNumber)) return 'Visa';
  if (/^5[1-5]/.test(cardNumber)) return 'Mastercard';
  if (/^6/.test(cardNumber)) return 'Verve'; // Simplified; Verve often starts with 506 or 650
  return 'Unknown';
};

export const validateLastFourDigits = (digits: string): string | null => {
  return /^\d{4}$/.test(digits) ? null : 'Enter exactly 4 digits';
};

export const validateExpiryMonth = (month: string): string | null => {
  const num = Number(month);
  return /^\d{1,2}$/.test(month) && num >= 1 && num <= 12
    ? null
    : 'Enter a valid month (1–12)';
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

export const validateExpiryYear = (year: string): string | null => {
  const currentYear = new Date().getFullYear();
  return /^\d{4}$/.test(year) && Number(year) >= currentYear
    ? null
    : `Enter a valid year (≥ ${currentYear})`;
};

const PointsPage = () => {
  const navigation2 = useNavigation<NavigationProp>();
  const user = useAppSelector(state => state.user);
  const [showPoints, setShowPoints] = useState(true);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);
  const [accountDetails] = useState<string[]>(user?.userAccountDetails || []);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const [fetchedDetails, setFetchedDetails] = useState<UserBankOrCardDetails[]>(
    [],
  );
  const [cardNumber, setCardNumber] = useState('');
  const [cardBrand, setCardBrand] = useState('');
  const [activeTab, setActiveTab] = useState<'card' | 'bank'>('card');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [showAccountName, setShowAccountName] = useState(false);
  const encryptPayload = (data: any): string => {
    const stringified = JSON.stringify(data);
    const masked = stringified.replace(/./g, '*');
    return masked;
  };
  const formatCardNumber = (input: string): string => {
    // Remove all non-digit characters
    const cleaned = input.replace(/\D/g, '');
    // Insert space every 4 digits
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };
  const completeTransaction = async (transactionId: string): Promise<void> => {
    const userUid = user?.uid;
    const token = await AsyncStorage.getItem('authToken');
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
      const data = await res.json();
      if (res.ok) {
        setPointsAwarded(data.transactionsTotalPriceInPoints);
        setShowSuccessPopup(true);
      } else {
        setShowErrorPopup(true);
        setTimeout(() => setShowErrorPopup(false), 3000);
      }
    } catch (err) {
      console.error('API error:', err);
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 3000);
    }
  };
  useEffect(() => {
    const country = user.country;
    const isValid = validateAccountNumber(accountNumber, country);

    if (isValid && bankName.trim().length > 0) {
      console.log('Auto-triggering account name lookup...');
      lookupAccountName(accountNumber, bankName, country).then(name => {
        setAccountHolderName(name);
        setShowAccountName(true);
      });
    } else {
      setShowAccountName(false);
      setAccountHolderName('');
    }
  }, [accountNumber, bankName, user.country]);

  useEffect(() => {
    if (accountDetails.length > 0) {
      const fetchDetails = async () => {
        const token = await AsyncStorage.getItem('authToken');
        try {
          const userId = user.uid;
          const encryptedPayload = encryptPayload({ ids: accountDetails });
          const normalPayload = { ids: accountDetails };
          console.log(encryptedPayload);
          const res = await fetch(`${baseUrl}user/account-details`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ payload: normalPayload, user: userId }),
          });
          const data = await res.json();
          console.log('Received account details:', data);
          setFetchedDetails(data.details);
        } catch (err) {
          console.error('Error fetching account details:', err);
          Toast.show({
            type: 'error',
            text1: err.message,
            position: 'bottom',
            bottomOffset: 10,
          });
        }
      };

      fetchDetails();
    }
  }, [accountDetails, user.uid]);
  useEffect(() => {
    const brand = detectCardBrand(cardNumber);
    setCardBrand(brand);
  }, [cardNumber]);
  const handleSubmitDetails = async () => {
    const newDetails = {
      provider: 'Visa',
      method: 'card',
      lastFourDigits: '1234',
      country: 'Nigeria',
      isDefault: true,
      // other fields...
    };

    const encryptedPayload = encryptPayload(newDetails); // placeholder
    console.log('Submitting encrypted card/bank details:', encryptedPayload);

    try {
      const res = await fetch(`${baseUrl}user/add-account-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: encryptedPayload }),
      });

      const data = await res.json();
      console.log('Add details response:', data);
      setShowAddPopup(false);
    } catch (err) {
      console.error('Error submitting account details:', err);
    }
  };
  const digitsError = validateLastFourDigits(lastFourDigits);
  const monthError = validateExpiryMonth(expiryMonth);
  const yearError = validateExpiryYear(expiryYear);
  if (providerError || digitsError || monthError || yearError) {
    console.warn('Validation errors:', {
      providerError,
      digitsError,
      monthError,
      yearError,
    });
    return;
  }
  const validateAccountNumber = (
    accountNumber: string,
    country: string,
  ): boolean => {
    if (country === 'Nigeria') {
      return /^\d{10}$/.test(accountNumber);
    }
    return true; // Add more country rules as needed
  };

  const lookupAccountName = async (
    accountNumber: string,
    bankName: string,
    country: string,
  ) => {
    // Simulate API delay
    return new Promise<string>(resolve => {
      setTimeout(() => {
        console.log('Simulated lookup complete');
        resolve('Chiemelie Okafor'); // Replace with real API later
      }, 1000);
    });
  };
  const submitBankDetails = async () => {
    const payload = {
      bankName,
      provider,
      country,
      accountNumber,
      accountHolderName,
      method: 'bank',
      userId: user.uid,
    };

    console.log('Submitting bank details:', payload);

    await fetch(`${baseUrl}/user/add-bank-details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  };
  const handleConfirmAccount = async () => {
    const country = user.country;
    const isValid = validateAccountNumber(accountNumber, country);

    if (!isValid) {
      console.warn('Invalid account number for', country);
      return;
    }

    console.log('Looking up account name...');
    const name = await lookupAccountName(accountNumber, bankName, country);
    setAccountHolderName(name);
    setShowAccountName(true);
  };

  return (
    <ScrollView contentContainerStyle={PointsPageStyles.container}>
      <View
        style={[
          PointsPageStyles.balanceContainer,
          {
            height: accountDetails.length > 0 ? 350 : 200, // or any fallback height
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
                          <MaterialIcons
                            name="credit-card-outline"
                            size={16}
                            color="#eee"
                            style={{ alignSelf: 'flex-end' }}
                          />
                          <Text style={PointsPageStyles.label}>
                            {item.cardBrand}
                          </Text>
                          <Text style={PointsPageStyles.label}>
                            **** **** **** {item.lastFourDigits}
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
          <TouchableWithoutFeedback onPress={() => setShowErrorPopup(false)}>
            <View style={HomeScreenComponentStyles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={HomeScreenComponentStyles.popupCenter}>
            <View style={PointsPageStyles.errorDiv}>
              <MaterialIcons
                name="error"
                size={20}
                color="#f54b02"
                style={{ marginRight: 5 }}
              />
              <Text style={HomeScreenComponentStyles.welcomeText2c}>
                Error encountered during payment. Please retry.
              </Text>
            </View>
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
            >
              <Text style={PointsPageStyles.modalTitle}>
                {activeTab === 'card' ? 'Card' : 'Bank'} Details
              </Text>

              {activeTab === 'card' ? (
                <>
                  <TextInput
                    placeholder="Card Brand"
                    value={cardBrand}
                    editable={false}
                    style={PointsPageStyles.input}
                  />
                  <TextInput
                    placeholder="Card Number"
                    keyboardType="numeric"
                    value={cardNumber}
                    onChangeText={text => setCardNumber(formatCardNumber(text))}
                    style={PointsPageStyles.input}
                  />
                  {digitsError && (
                    <Text style={PointsPageStyles.errorText}>
                      {digitsError}
                    </Text>
                  )}
                  <TextInput
                    placeholder="Expiry Month"
                    keyboardType="numeric"
                    style={PointsPageStyles.input}
                  />
                  {monthError && (
                    <Text style={PointsPageStyles.errorText}>{monthError}</Text>
                  )}
                  <TextInput
                    placeholder="Expiry Year"
                    keyboardType="numeric"
                    style={PointsPageStyles.input}
                  />
                  {yearError && (
                    <Text style={PointsPageStyles.errorText}>{yearError}</Text>
                  )}
                  <TextInput
                    placeholder="Country"
                    style={PointsPageStyles.input}
                  />
                </>
              ) : (
                <>
                  <TextInput
                    placeholder="Bank Name"
                    style={PointsPageStyles.input}
                    value={bankName}
                    onChangeText={setBankName}
                  />
                  <TextInput
                    placeholder="Account Number"
                    keyboardType="numeric"
                    style={PointsPageStyles.input}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                  />
                  {showAccountName && (
                    <TextInput
                      value={accountHolderName}
                      style={PointsPageStyles.input}
                      editable={false}
                    />
                  )}
                </>
              )}
              <View style={PointsPageStyles.buttonRow}>
                <Button title="Submit" onPress={handleSubmitDetails} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Toast config={toastConfig} />
    </ScrollView>
  );
};

export default PointsPage;
const PointsPageStyles = StyleSheet.create({
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
  pointsBox: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    width: '100%',
    justifyContent: 'flex-start',
  },
  pointsBox2: {
    paddingHorizontal: 10,
    paddingVertical: 3,
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
  },
  pointsBox2b: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  balanceContainerFooter: {
    alignSelf: 'center',
    position: 'absolute',
    bottom: -25,
    width: '80%',
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
    justifyContent: 'space-between',
  },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
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
    padding: 10,
    marginBottom: 5,
    color: '#222',
    fontSize: 13,
    alignSelf: 'center',
    borderWidth: 0.5,
    borderColor: '#f54b02',
  },
  errorText: {
    color: 'red',
    fontSize: 11,
    fontWeight: '700',
    paddingBottom: 5,
  },
});
