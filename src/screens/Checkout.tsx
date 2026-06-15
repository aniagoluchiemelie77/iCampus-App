import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Geolocation from 'react-native-geolocation-service';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../components/hooks';
import { PageHeader } from '../components/PageHeader';
import { getDistanceInMiles } from '../utils/distanceCalculator';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { useAppDataContext } from '../components/EventContext';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { CartItem } from '../components/CartItem';
import { IcashPinOrFingerprintVerifyModal } from '../components/iCashPinOrFingerprintVerifyComponent';
import Toast from 'react-native-toast-message';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { initializeCheckoutTransaction } from '../api/localPostApis';
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

interface CheckoutScreenParams {
  productId?: string;
  quantity?: number;
  selectedColor?: string;
  selectedSize?: string;
}
export const CheckoutScreen = () => {
  const { colors } = useTheme();
  const route = useRoute();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const currentUser = useAppSelector(state => state.user);
  const { allProducts } = useAppDataContext();

  // Route Parameters Destructuring
  const params = useMemo(() => {
    return (route.params || {}) as CheckoutScreenParams;
  }, [route.params]);
  const isDirectPurchase = !!params?.productId;

  // Form Field Interactive States
  const [isSubscriptionModalVisible, setSubscriptionModalVisible] =
    useState(false);
  const [isVerifyModalVisible, setIsVerifyModalVisible] = useState(false);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationPermission, setLocationPermission] =
    useState<string>('undetermined');
  const [phoneNumber, setPhoneNumber] = useState(
    currentUser?.phoneNumbers?.[0]?.number || '',
  );
  const [formattedValue, setFormattedValue] = useState(
    currentUser?.phoneNumbers?.[0]?.number || '',
  );
  const [isPhoneValid, setIsPhoneValid] = useState(
    !!currentUser?.phoneNumbers?.[0]?.number,
  );
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedStations, setSelectedStations] = useState<Record<string, any>>(
    {},
  );
  const [exchangeData, setExchangeData] = useState({
    rate: 1,
    symbol: '$',
    code: 'USD',
  });

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  const checkoutItems = useMemo(() => {
    const rawItems = isDirectPurchase
      ? [
          {
            productId: params.productId!,
            quantity: params.quantity || 1,
            selectedColor: params.selectedColor,
            selectedSize: params.selectedSize,
          },
        ]
      : currentUser?.cart ?? [];

    return rawItems
      .map(item => ({
        ...item,
        product: allProducts?.find(p => p.productId === item.productId),
      }))
      .filter(item => item.product !== undefined);
  }, [isDirectPurchase, params, currentUser?.cart, allProducts]);

  // Handle baseline delivery default mapping states safely
  const [itemDeliveryMethods, setItemDeliveryMethods] = useState<
    Record<string, string>
  >({});

  // Synchronize delivery method map defaults only when data dependencies adjust
  useEffect(() => {
    const initialMethods = checkoutItems.reduce<Record<string, string>>(
      (acc, item) => {
        acc[item.productId] = 'drop_off';
        return acc;
      },
      {},
    );
    setItemDeliveryMethods(initialMethods);
  }, [checkoutItems]);

  const toggleDelivery = useCallback((productId: string, method: string) => {
    setItemDeliveryMethods(prev => ({ ...prev, [productId]: method }));
  }, []);

  // MEMOIZED FINANCIAL ENGINE: Computes totals in a single unified thread pass
  const transactionalFinances = useMemo(() => {
    const subtotal = checkoutItems.reduce((acc, item) => {
      return acc + (item.product?.priceInPoints || 0) * item.quantity;
    }, 0);

    const totalDeliveryFee = checkoutItems.reduce((acc, item) => {
      if (item.product?.type !== 'physical') return acc;
      const method = itemDeliveryMethods[item.productId] || 'drop_off';
      return (
        acc +
        (method === 'home_delivery'
          ? (item.product.priceInPoints || 0) *
            item.quantity *
            HOME_DELIVERY_RATE
          : DROP_OFF_FEE)
      );
    }, 0);

    const transactionTax = subtotal * TRANSACTION_TAX_RATE;
    const grandTotal = subtotal + transactionTax + totalDeliveryFee;
    const userBalance = currentUser?.pointsBalance || 0;

    return {
      subtotal,
      totalDeliveryFee,
      transactionTax,
      grandTotal,
      canAfford: userBalance >= grandTotal,
      userBalance,
    };
  }, [checkoutItems, itemDeliveryMethods, currentUser?.pointsBalance]);

  // Segregate categorized elements efficiently to isolate processing targets
  const { homeItems, dropOffItems } = useMemo(() => {
    const home: typeof checkoutItems = [];
    const dropOff: typeof checkoutItems = [];
    checkoutItems.forEach(item => {
      if (itemDeliveryMethods[item.productId] === 'home_delivery') {
        home.push(item);
      } else {
        dropOff.push(item);
      }
    });
    return { homeItems: home, dropOffItems: dropOff };
  }, [checkoutItems, itemDeliveryMethods]);

  // FORM SECURITY PRE-FLIGHT EVALUATION
  const formValidation = useMemo(() => {
    const missingStation = dropOffItems.find(
      item =>
        item.product?.type === 'physical' && !selectedStations[item.productId],
    );

    if (missingStation)
      return {
        valid: false,
        reason: `Select a drop-off location for ${missingStation.product?.title}`,
      };

    if (homeItems.length > 0) {
      if (!isPhoneValid)
        return {
          valid: false,
          reason: 'Provide a valid phone contact configuration.',
        };
      if (!deliveryAddress.trim())
        return {
          valid: false,
          reason: 'Provide a delivery target address destination.',
        };
    }

    return { valid: true, reason: '' };
  }, [
    dropOffItems,
    homeItems,
    selectedStations,
    isPhoneValid,
    deliveryAddress,
  ]);

  const handleProceedToVerify = useCallback(() => {
    if (!transactionalFinances.canAfford) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Balance',
        text2: `Required: ${transactionalFinances.grandTotal.toFixed(
          1,
        )} iCash | Available: ${transactionalFinances.userBalance.toFixed(1)}`,
      });
      return;
    }

    if (!formValidation.valid) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: formValidation.reason,
      });
      return;
    }

    setIsVerifyModalVisible(true);
  }, [
    transactionalFinances.canAfford,
    transactionalFinances.grandTotal,
    transactionalFinances.userBalance,
    formValidation.valid,
    formValidation.reason,
  ]);

  const handlePhoneChange = useCallback(
    (text: string) => {
      setPhoneNumber(text);
      const country = currentUser?.country || 'NG';
      const phoneNumberObj = parsePhoneNumberFromString(text, country as any);
      if (phoneNumberObj) {
        const isValid = phoneNumberObj.isValid();
        setIsPhoneValid(isValid);
        if (isValid) setFormattedValue(phoneNumberObj.formatInternational());
      } else {
        setIsPhoneValid(false);
      }
    },
    [currentUser?.country],
  );

  const handleStationSelect = useCallback((productId: string, station: any) => {
    setSelectedStations(prev => ({ ...prev, [productId]: station }));
  }, []);

  const onVerificationSuccess = async () => {
    setIsVerifyModalVisible(false);

    const orderPayload = {
      items: checkoutItems.map(item => {
        const isPhysical = item.product?.type === 'physical';
        const method = itemDeliveryMethods[item.productId] || 'drop_off';
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
              selectedStation: selectedStations[item.productId],
            }),
        };
      }),
      totals: {
        subtotal: transactionalFinances.subtotal,
        tax: transactionalFinances.transactionTax,
        delivery: transactionalFinances.totalDeliveryFee,
        grandTotal: transactionalFinances.grandTotal,
      },
      shippingContact: {
        phone: formattedValue,
        address: deliveryAddress.trim(),
      },
      buyerId: currentUser?.uid,
      timestamp: new Date().toISOString(),
    };

    try {
      const result = await initializeCheckoutTransaction(orderPayload);
      if (result?.success) {
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
        throw new Error(
          result?.message || 'Transaction Initialization Failed.',
        );
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Checkout Error',
        text2: error.message,
      });
    }
  };

  const getLocation = () => {
    Geolocation.getCurrentPosition(
      position => {
        if (isMounted.current) {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        }
      },
      error => console.log('[GEOLOCATION_ERROR]', error.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };

  const checkLocationPermission = useCallback(async () => {
    const status = await request(
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    );
    if (!isMounted.current) return;
    setLocationPermission(status);
    if (status === RESULTS.GRANTED) getLocation();
  }, []);

  useEffect(() => {
    checkLocationPermission();
  }, [checkLocationPermission]);

  useEffect(() => {
    let active = true;
    if (currentUser?.country) {
      fetchLiveRate(currentUser.country).then(data => {
        if (active && isMounted.current && data) setExchangeData(data);
      });
    }
    return () => {
      active = false;
    };
  }, [currentUser?.country]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const isPhysical = item.product?.type === 'physical';
      const selectedMethod = itemDeliveryMethods[item.productId] || 'drop_off';
      const sellerSupportsHome =
        item.product?.physicalDetails?.sellerGateways?.includes(
          'home_delivery',
        );
      const isProUser =
        currentUser?.tier === 'pro' || currentUser?.tier === 'premium';
      const canShowHomeToggle = isProUser && sellerSupportsHome;
      const currentItemFee =
        selectedMethod === 'home_delivery' ? HOME_DELIVERY_RATE : DROP_OFF_FEE;

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
                      onPress={() => toggleDelivery(item.productId, 'drop_off')}
                      style={[
                        styles.miniBtn,
                        selectedMethod === 'drop_off' && {
                          backgroundColor: colors.btnColor,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="local-shipping"
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
                          {
                            color:
                              selectedMethod === 'drop_off'
                                ? colors.btnTextColor
                                : colors.text,
                          },
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
                        name="home"
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
                          {
                            color:
                              selectedMethod === 'home_delivery'
                                ? colors.btnTextColor
                                : colors.text,
                          },
                        ]}
                      >
                        Home
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: colors.text }}>
                    {toPercentLabel(currentItemFee)}
                  </Text>
                </View>
              ) : (
                <View style={styles.defaultDeliveryInfo}>
                  <MaterialIcons
                    name="local-shipping"
                    size={16}
                    color={colors.text}
                  />
                  <Text
                    style={[styles.defaultDeliveryText, { color: colors.text }]}
                  >
                    Drop-off Station Only ({toPercentLabel(currentItemFee)})
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
                        style={{
                          color: colors.btnTextColor,
                          fontSize: 11,
                          fontWeight: '600',
                        }}
                      >
                        Upgrade to Pro for Home Delivery
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      );
    },
    [itemDeliveryMethods, colors, currentUser?.tier, toggleDelivery],
  );

  const renderFooter = useMemo(() => {
    return (
      <View
        style={[
          styles.summaryContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <Text style={[styles.summaryTitle, { color: colors.text }]}>
          Order Summary
        </Text>

        {dropOffItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Pick-up Stations Selection
            </Text>
            {dropOffItems.map(item => (
              <View key={item.productId} style={styles.stationBlock}>
                <Text style={[styles.stationItemName, { color: colors.text }]}>
                  {item.product?.title}:
                </Text>
                {item.product?.physicalDetails?.dropOffAddress?.map(
                  (station: any, idx: number) => {
                    const stationId = station.id || idx;
                    const isSelected =
                      selectedStations[item.productId]?.id === stationId;

                    // RESTORE CONSUMPTION: Reads userCoords to compute station distance metrics
                    let distanceStr = '';
                    if (userCoords && station.latitude && station.longitude) {
                      // Assuming your getDistanceInMiles utility function is imported globally
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
                        key={stationId}
                        onPress={() =>
                          handleStationSelect(item.productId, station)
                        }
                        style={[
                          styles.stationOption,
                          isSelected && {
                            borderColor: colors.primary,
                            borderWidth: 1.5,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stationText,
                            {
                              color: isSelected ? colors.primary : colors.text,
                            },
                          ]}
                        >
                          {station.name} - {station.address}
                        </Text>
                        {distanceStr ? (
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.text + '99',
                              marginTop: 4,
                            }}
                          >
                            {distanceStr}
                          </Text>
                        ) : locationPermission === 'blocked' ? (
                          <Text
                            style={{
                              fontSize: 11,
                              color: '#D32F2F',
                              marginTop: 4,
                            }}
                          >
                            Location blocked. Enable in settings for distance
                            tracking.
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            ))}
          </View>
        )}

        {homeItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Home Delivery Details
            </Text>
            <Text style={[styles.label, { color: colors.text }]}>
              Contact Phone Number
            </Text>
            <TextInput
              style={[styles.addressInput, { color: colors.text, height: 45 }]}
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              placeholder="+234..."
              placeholderTextColor={colors.text + '80'}
            />
            {!isPhoneValid && phoneNumber.length > 0 && (
              <Text style={styles.errorText}>
                Invalid layout syntax pattern.
              </Text>
            )}

            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>
              Delivery Target Address
            </Text>
            <TextInput
              style={[styles.addressInput, { color: colors.text }]}
              placeholder="Room No, Hostel Name, or Faculty building..."
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholderTextColor={colors.text + '80'}
              multiline
            />
          </View>
        )}

        {/* Totals Breakdown */}
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={{ color: colors.text }}>Subtotal</Text>
          <CurrencyDisplay
            value={transactionalFinances.subtotal}
            size="small"
          />
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ color: colors.text }}>Transaction Tax (2%)</Text>
          <CurrencyDisplay
            value={transactionalFinances.transactionTax}
            size="small"
          />
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>
            Grand Total
          </Text>
          <CurrencyDisplay
            value={transactionalFinances.grandTotal}
            size="large"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.buyBtn,
            { backgroundColor: colors.btnColor },
            !transactionalFinances.canAfford && { opacity: 0.5 },
          ]}
          onPress={handleProceedToVerify}
          disabled={!transactionalFinances.canAfford}
        >
          <Text style={{ color: colors.btnTextColor, fontWeight: '700' }}>
            {transactionalFinances.canAfford
              ? 'Confirm & Pay'
              : 'Insufficient Balance'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [
    dropOffItems,
    homeItems,
    selectedStations,
    phoneNumber,
    isPhoneValid,
    deliveryAddress,
    transactionalFinances,
    colors,
    handlePhoneChange,
    handleStationSelect,
    handleProceedToVerify,
    locationPermission,
    userCoords,
  ]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader title="Checkout" showBackButton={true} />
      <FlatList
        data={checkoutItems}
        keyExtractor={(item, index) => item.productId + index}
        renderItem={renderItem}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ paddingBottom: 40 }}
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
          email: currentUser?.email || '',
          name: `${currentUser?.firstname || ''} ${
            currentUser?.lastname || ''
          }`,
          country: currentUser?.country || 'NG',
        }}
        exchangeData={exchangeData}
        onSuccess={async (data: any) => {
          setSubscriptionModalVisible(false);
          const res = await verifySubscriptionOnBackend(
            data.transaction_id || data.flw_ref,
            'pro',
            exchangeData.rate,
          );
          if (res?.success) {
            Toast.show({
              type: 'success',
              text1: 'Success',
              text2: 'Upgrade to Pro user successful.',
            });
            // Consumes dispatch here to transition user state locally
            dispatch(
              setUser({
                ...currentUser,
                tier: 'pro',
                hasSubscribed: true,
              }),
            );
          }
        }}
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
  sectionContainer: {
    marginTop: 16,
    paddingTop: 10,
  },
  stationBlock: {
    marginBottom: 14,
    paddingBottom: 8,
  },
  stationItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: PRIMARY_COLOR_TINT, 
    marginVertical: 16,
  },
});
