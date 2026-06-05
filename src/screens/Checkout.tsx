import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Geolocation from 'react-native-geolocation-service';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../components/hooks';
import { PageHeader } from '../components/PageHeader';
import { getDistanceInMiles } from '../utils/distanceCalculator';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { useAppDataContext } from '../components/EventContext';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { CartItem } from '../components/CartItem';
import { IcashPinOrFingerprintVerifyModal } from '../components/iCashPinOrFingerprintVerifyComponent';
import Toast from 'react-native-toast-message';
import { DeliveryGateway } from '../types/firebase';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import PhoneInput from 'react-native-phone-number-input';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { initializeCheckoutTransaction } from '../api/localPostApis';
import { DropOffStation } from '../types/firebase';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { fetchLiveRate } from '../utils/UserTransactionsHelpers';
import { useDispatch } from 'react-redux';
import { verifySubscriptionOnBackend } from '../api/localPostApis';
import { setUser } from '../components/UserSlice.ts';
import {
  TRANSACTION_TAX_RATE,
  HOME_DELIVERY_RATE,
  DROP_OFF_FEE,
} from '../constants/inAppConstants';
import { SubscriptionSelectionModal } from '../components/SubscriptionModal.tsx';

const toPercentLabel = (rate: number) => `${(rate * 100).toFixed(0)}%`;

export const CheckoutScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const route = useRoute();
  const dispatch = useDispatch();
  const [isSubscriptionModalVisible, setSubscriptionModalVisible] =
    useState(false);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationPermission, setLocationPermission] =
    useState<string>('undetermined');
  const currentUser = useAppSelector(state => state.user);
  const { allProducts } = useAppDataContext();
  const [isValid, setIsValid] = useState(false);
  const [selectedStations, setSelectedStations] = useState<
    Record<string, DropOffStation>
  >({});
  const [countryCode, _setCountryCode] = useState<any>(
    currentUser.country || 'NG',
  );
  const [exchangeData, setExchangeData] = useState({
    rate: 1,
    symbol: '$',
    code: 'USD',
  });
  const [formattedValue, setFormattedValue] = useState('');
  const [isVerifyModalVisible, setIsVerifyModalVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(
    currentUser.phoneNumbers?.[0]?.number || '',
  );
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const params = route.params as {
    productId?: string;
    quantity?: number;
    selectedColor?: string;
    selectedSize?: string;
  };
  const isDirectPurchase = !!params?.productId;
  const cartData = currentUser?.cart;
  const userTier = currentUser?.tier;
  const isProUser = userTier === 'pro' || userTier === 'premium';
  const rawItems = isDirectPurchase
    ? [
        {
          productId: params.productId!,
          quantity: params.quantity || 1,
          selectedColor: params.selectedColor,
          selectedSize: params.selectedSize,
        },
      ]
    : cartData ?? [];
  const userBalance = currentUser?.pointsBalance || 0;
  const checkoutItems = rawItems
    .map(item => {
      const productDetails = allProducts.find(
        p => p.productId === item.productId,
      );
      return {
        ...item,
        product: productDetails,
      };
    })
    .filter(item => item.product !== undefined);

  // --- Calculations ---
  const [itemDeliveryMethods, setItemDeliveryMethods] = useState<
    Record<string, DeliveryGateway>
  >(
    checkoutItems.reduce(
      (acc, item) => ({ ...acc, [item.productId]: 'drop_off' }),
      {},
    ),
  );
  const toggleDelivery = (productId: string, method: DeliveryGateway) => {
    setItemDeliveryMethods(prev => ({ ...prev, [productId]: method }));
  };
  const subtotal = checkoutItems.reduce((acc, item) => {
    return acc + item.product?.priceInPoints! * item.quantity;
  }, 0);

  const totalDeliveryFee = checkoutItems.reduce((acc, item) => {
    if (item.product?.type !== 'physical') return acc;

    const method = itemDeliveryMethods[item.productId] || 'drop_off';

    const itemFee =
      method === 'home_delivery'
        ? item.product.priceInPoints * item.quantity * HOME_DELIVERY_RATE
        : DROP_OFF_FEE;

    return acc + itemFee;
  }, 0);

  const transactionTax = subtotal * TRANSACTION_TAX_RATE;
  const grandTotal = subtotal + transactionTax + totalDeliveryFee;
  const canAfford = userBalance >= grandTotal;
  const homeItems = checkoutItems.filter(
    item => itemDeliveryMethods[item.productId] === 'home_delivery',
  );
  const dropOffItems = checkoutItems.filter(
    item => itemDeliveryMethods[item.productId] !== 'home_delivery',
  );
  const handleProceedToVerify = () => {
    if (!canAfford) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Balance',
        text2: `You need ${grandTotal.toFixed(
          1,
        )} iCash, but you have ${userBalance.toFixed(1)}`,
      });
      return;
    }
    setIsVerifyModalVisible(true);
  };
  const handlePhoneChange = (text: string) => {
    setPhoneNumber(text);
    const phoneNumberObj = parsePhoneNumberFromString(text, countryCode);
    if (phoneNumberObj) {
      setIsValid(phoneNumberObj.isValid());
    } else {
      setIsValid(false);
    }
  };
  const handleStationSelect = (productId: string, station: DropOffStation) => {
    setSelectedStations(prev => ({
      ...prev,
      [productId]: station,
    }));
  };
  const onVerificationSuccess = async () => {
    const missingSelection = checkoutItems.find(
      item =>
        item.product?.type === 'physical' &&
        itemDeliveryMethods[item.productId] === 'drop_off' &&
        !selectedStations[item.productId],
    );

    if (missingSelection) {
      Toast.show({
        type: 'error',
        text1: 'Selection Required',
        text2: `Please select a drop-off location for ${missingSelection.product?.title}`,
      });
      return;
    }
    setIsVerifyModalVisible(false);

    const orderPayload = {
      items: checkoutItems.map(item => {
        const isPhysical = item.product?.type === 'physical';
        const method = itemDeliveryMethods[item.productId] || 'drop_off';
        const selectedStation = selectedStations[item.productId];

        return {
          productId: item.productId,
          sellerId: item.product?.sellerId,
          quantity: item.quantity,
          deliveryMethod: method,
          price: item.product?.priceInPoints,
          color: item.selectedColor,
          size: item.selectedSize,
          ...(isPhysical &&
            method === 'drop_off' && {
              selectedStation: selectedStation,
            }),
        };
      }),
      totals: {
        subtotal,
        tax: transactionTax,
        delivery: totalDeliveryFee,
        grandTotal,
      },
      shippingContact: {
        phone: formattedValue,
        address: deliveryAddress,
      },
      buyerId: currentUser.uid,
      timestamp: new Date().toISOString(),
    };
    const result = await initializeCheckoutTransaction(orderPayload);
    if (result.success) {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'MSuccessScreen',
            params: {
              orders: result.data,
              totalSpent: orderPayload.totals.grandTotal,
            },
          },
        ],
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Checkout Error',
        text2: result.message || 'Something went wrong, please retry',
      });
    }
  };
  const getLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      error => {
        console.log('Location Error: ', error.code, error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  };
  const handleOpenSettings = async () => {
    await Linking.openSettings();
  };
  const checkLocationPermission = useCallback(async () => {
    const status = await request(
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    );
    setLocationPermission(status);
    if (status === RESULTS.GRANTED) {
      getLocation();
    } else if (status === RESULTS.DENIED) {
      console.log('Permission denied, but requestable');
    } else if (status === RESULTS.BLOCKED) {
      handleOpenSettings();
      console.log('Permission is blocked. User must enable it manually.');
    }
  }, []);
  const handleSubSuccess = async (data: any) => {
    setSubscriptionModalVisible(false);
    const res = await verifySubscriptionOnBackend(
      data.transaction_id || data.flw_ref,
      'pro',
      exchangeData.rate,
    );
    if (res.success) {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Upgrade to Pro user successful.',
      });
      dispatch(
        setUser({
          ...currentUser,
          tier: 'pro',
          hasSubscribed: true,
        }),
      );
    }
  };

  useEffect(() => {
    checkLocationPermission();
  }, [checkLocationPermission]);
  useEffect(() => {
    fetchLiveRate(currentUser?.country!).then(setExchangeData);
  }, [currentUser?.country]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader title="Checkout" showBackButton={true} />
      <FlatList
        data={checkoutItems}
        keyExtractor={(item, index) => item.productId + index}
        renderItem={({ item }) => {
          const isPhysical = item.product?.type === 'physical';
          const selectedMethod =
            itemDeliveryMethods[item.productId] || 'drop_off';
          const sellerSupportsHome =
            item.product?.physicalDetails?.sellerGateways.includes(
              'home_delivery',
            );
          const canShowHomeToggle = isProUser && sellerSupportsHome;
          const currentItemFee =
            selectedMethod === 'home_delivery'
              ? HOME_DELIVERY_RATE
              : DROP_OFF_FEE;
          return (
            <View style={styles.itemWrapper}>
              <CartItem cartEntry={item} product={item.product!} />
              {isPhysical && (
                <View style={styles.itemDeliveryContainer}>
                  {canShowHomeToggle ? (
                    <View style={styles.miniToggleRow}>
                      <View
                        style={[
                          styles.miniToggleBtnRow,
                          { borderColor: colors.border },
                        ]}
                      >
                        <TouchableOpacity
                          onPress={() =>
                            toggleDelivery(item.productId, 'drop_off')
                          }
                          style={[
                            styles.miniBtn,
                            selectedMethod === 'drop_off' && {
                              backgroundColor: colors.btnColor,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name="local-shipping-outlined"
                            size={14}
                            color={
                              selectedMethod === 'drop_off'
                                ? colors.btnTextColor
                                : colors.text
                            }
                          />
                          <Text
                            style={[
                              styles.miniBtnText,
                              selectedMethod === 'drop_off'
                                ? { color: colors.btnTextColor }
                                : { color: colors.text },
                            ]}
                          >
                            Drop-off
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            toggleDelivery(item.productId, 'home_delivery')
                          }
                          style={[
                            styles.miniBtn,
                            selectedMethod === 'home_delivery' && {
                              backgroundColor: colors.btnColor,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name="home-outlined"
                            size={14}
                            color={
                              selectedMethod === 'home_delivery'
                                ? colors.btnTextColor
                                : colors.text
                            }
                          />
                          <Text
                            style={[
                              styles.miniBtnText,
                              selectedMethod === 'home_delivery'
                                ? { color: colors.btnTextColor }
                                : { color: colors.text },
                            ]}
                          >
                            Home Delivery
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text
                        style={[
                          styles.defaultDeliveryText,
                          { margin: 0, color: colors.text },
                        ]}
                      >
                        {toPercentLabel(currentItemFee)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.defaultDeliveryInfo}>
                      <MaterialIcons
                        name="local-shipping-outlined"
                        size={16}
                        color={colors.text}
                      />
                      <Text
                        style={[
                          styles.defaultDeliveryText,
                          { color: colors.text },
                        ]}
                      >
                        Delivery: Drop-off Station Only
                      </Text>
                      <Text
                        style={[
                          styles.defaultDeliveryText,
                          { color: colors.text },
                        ]}
                      >
                        {toPercentLabel(currentItemFee)}
                      </Text>
                      {!isProUser && (
                        <TouchableOpacity
                          style={[
                            styles.proBanner,
                            { backgroundColor: colors.btnColor },
                          ]}
                          onPress={() => setSubscriptionModalVisible(true)}
                        >
                          <Text
                            style={[
                              styles.proBannerText,
                              { color: colors.btnTextColor },
                            ]}
                          >
                            Upgrade to Pro to unlock Home Delivery
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListFooterComponent={
          <View
            style={[
              styles.summaryContainer,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.summaryTitle, { color: colors.textDarker }]}>
              Order Summary
            </Text>
            {(dropOffItems.length > 0 || homeItems.length > 0) && (
              <View style={styles.deliveryInfoCard}>
                {dropOffItems.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, {color: colors.text}]}>Pick-up Information</Text>
                    {dropOffItems.map(item => (
                      <View key={item.productId} >
                          <Text style={[styles.stationText, {color: colors.text}]}>
                            Available delivery stations for{' '}
                            {item.product?.title}:
                          </Text>
                        <View style={{ marginVertical: 6 }}>
                          {item.product?.physicalDetails?.dropOffAddress?.map(
                            (station, index) => {
                              const isSelected =
                                selectedStations[item.productId]?.id ===
                                (station.id || index);
                              let distanceStr = '';
                              if (
                                userCoords &&
                                station.latitude &&
                                station.longitude
                              ) {
                                const miles = getDistanceInMiles(
                                  userCoords.lat,
                                  userCoords.lng,
                                  station.latitude,
                                  station.longitude,
                                );
                                distanceStr = `${miles.toFixed(1)} miles away`;
                              }
                              return (
                                <TouchableOpacity
                                  key={station.id || index}
                                  onPress={() =>
                                    handleStationSelect(item.productId, station)
                                  }
                                  style={styles.stationOption}
                                >
                                  <Text
                                    key={station.id || index}
                                    style={[
                                      styles.stationText2,
                                      isSelected ? {color: colors.primary} : {color: colors.text}
                                    ]}
                                  >
                                    {station.name}, {station.address}
                                  </Text>
                                  {distanceStr ? (
                                    <Text style={styles.distanceLabel}>
                                      {distanceStr}
                                    </Text>
                                  ) : locationPermission === RESULTS.BLOCKED ? (
                                    <TouchableOpacity
                                      onPress={handleOpenSettings}
                                      style={[styles.enableBtn, {backgroundColor: colors.btnColor}]}
                                    >
                                      <Text style={[styles.enableLocationText, {color: colors.btnTextColor}]}>
                                        Enable location to see distance
                                      </Text>
                                    </TouchableOpacity>
                                  ) : null}
                                </TouchableOpacity>
                              );
                            },
                          )}
                        </View>
                      </View>
                    ))}
                  </>
                )}
                {homeItems.length > 0 && (
                  <View style={styles.homeDeliveryForm}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Home Delivery Details
                    </Text>
                    <Text style={[styles.label, { color: colors.text }]}>
                      Enter your phone number
                    </Text>
                    <PhoneInput
                      defaultValue={phoneNumber}
                      defaultCode={countryCode}
                      layout="first"
                      onChangeText={handlePhoneChange}
                      onChangeFormattedText={text => setFormattedValue(text)}
                      containerStyle={styles.phoneInputContainer}
                      textContainerStyle={styles.phoneTextContainer}
                      withShadow
                      textInputStyle={{ color: colors.text, fontSize: 14 }}
                    />
                    {!isValid && phoneNumber.length > 0 && (
                      <Text style={styles.errorText}>
                        Invalid number for {countryCode}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.label,
                        { marginTop: 10, color: colors.text },
                      ]}
                    >
                      Delivery Address
                    </Text>
                    <TextInput
                      style={[styles.addressInput, { color: colors.text }]}
                      placeholder="Room No, Hostel Name, or Faculty building..."
                      value={deliveryAddress}
                      onChangeText={setDeliveryAddress}
                      placeholderTextColor={colors.inputTextHolder}
                      multiline
                    />
                  </View>
                )}
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>
                Subtotal
              </Text>
              <CurrencyDisplay value={subtotal} size="small" />
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>
                Transaction Tax (2%)
              </Text>
              <CurrencyDisplay value={transactionTax} size="small" />
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.grandTotalLabel, { color: colors.text }]}>
                Grand Total
              </Text>
              <CurrencyDisplay value={grandTotal} size="large" />
            </View>
            <View style={styles.balanceCard}>
              <Text style={[styles.balanceText, { color: colors.text }]}>
                Your Balance:
              </Text>
              <CurrencyDisplay value={userBalance} size="small" />
            </View>
            <TouchableOpacity
              style={[styles.buyBtn, { backgroundColor: colors.btnColor }]}
              onPress={handleProceedToVerify}
              disabled={!canAfford}
            >
              <Text style={[styles.buyBtnText, { color: colors.btnTextColor }]}>
                {canAfford ? 'Confirm & Pay' : 'Insufficient Balance'}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <IcashPinOrFingerprintVerifyModal
        navigation={navigation}
        isVisible={isVerifyModalVisible}
        onClose={() => setIsVerifyModalVisible(false)}
        onSuccess={onVerificationSuccess}
        title="Confirm Purchase"
      />
      <SubscriptionSelectionModal
        isVisible={isSubscriptionModalVisible}
        onClose={() => setSubscriptionModalVisible(false)}
        targetTier="pro"
        userContext={{
          email: currentUser.email,
          name: `${currentUser.firstname} ${currentUser.lastname}`,
          country: currentUser.country!,
        }}
        exchangeData={exchangeData}
        onSuccess={handleSubSuccess}
        title="Upgrade to enable home delivery"
      />
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  itemWrapper: {
    paddingHorizontal: 15,
    marginTop: 10,
  },
  summaryContainer: {
    padding: 20,
    marginTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    marginHorizontal: -15,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: { fontSize: 14 },
  grandTotalLabel: { fontSize: 14, fontWeight: 'bold' },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  balanceText: { fontSize: 14, fontWeight: '600' },
  buyBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  buyBtnText: { fontSize: 14, fontWeight: 'bold' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 15 },
  itemDeliveryContainer: {
    marginTop: -9,
  },
  miniToggleRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniToggleBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    height: 60,
    overflow: 'hidden',
  },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  miniBtnText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  defaultDeliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultDeliveryText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: 'bold',
  },
  proBanner: {
    marginLeft: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 13,
    alignContent: 'center',
  },
  proBannerText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  deliveryInfoCard: {
    marginBottom: 15,
  },
  stationText: {
    fontSize: 14,
  },
  stationText2: {
    fontSize: 14,
    marginBottom: 6,
  },
  distanceLabel: {
    fontSize: 10,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  homeDeliveryForm: {
    width: '100%',
  },
  addressInput: {
    borderRadius: 12,
    padding: 15,
    width: '100%',
    fontSize: 14,
    textAlignVertical: 'top',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  phoneInputContainer: {
    width: '100%',
    height: 60,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    overflow: 'hidden',
  },
  phoneTextContainer: {
    backgroundColor: 'transparent',
  },
  errorText: {
    color: PRIMARY_COLOR,
    fontSize: 11,
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  stationOption: {
    width: '100%',
    marginBottom: 6,
  },

  enableBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  enableLocationText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
