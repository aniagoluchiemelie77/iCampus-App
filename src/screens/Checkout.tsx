import React, { useState } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import toastConfig from '@components/ToastConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../components/hooks';
import { PageHeader } from '../components/PageHeader';
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
import {
  useRoute,
  //useNavigation
} from '@react-navigation/native';

const TRANSACTION_TAX_RATE = 0.02;
const HOME_DELIVERY_RATE = 0.02;
const DROP_OFF_FEE = 0.06;

const toPercentLabel = (rate: number) => `${(rate * 100).toFixed(0)}%`;

export const CheckoutScreen = ({ navigation }: any) => {
  const route = useRoute();
  const currentUser = useAppSelector(state => state.user);
  const { allProducts } = useAppDataContext();
  const [isValid, setIsValid] = useState(false);
  const [selectedStations, setSelectedStations] = useState<
    Record<string, DropOffStation>
  >({});
  const [countryCode, _setCountryCode] = useState<any>(
    currentUser.country || 'NG',
  );
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

  // --- Purchase Logic ---
  const handleProceedToVerify = () => {
    if (!canAfford) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Balance',
        text2: `You need ${grandTotal.toFixed(
          1,
        )} diamonds, but you have ${userBalance.toFixed(1)}`,
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

  return (
    <SafeAreaView style={styles.container}>
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
                      <TouchableOpacity
                        onPress={() =>
                          toggleDelivery(item.productId, 'drop_off')
                        }
                        style={[
                          styles.miniBtn,
                          selectedMethod === 'drop_off' && styles.miniBtnActive,
                        ]}
                      >
                        <MaterialIcons
                          name="local-shipping-outlined"
                          size={14}
                          color={
                            selectedMethod === 'drop_off'
                              ? '#fff'
                              : PRIMARY_COLOR_TINT
                          }
                        />
                        <Text
                          style={[
                            styles.miniBtnText,
                            selectedMethod === 'drop_off' && styles.whiteText,
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
                          selectedMethod === 'home_delivery' &&
                            styles.miniBtnActive,
                          { marginLeft: 5 },
                        ]}
                      >
                        <MaterialIcons
                          name="home-outlined"
                          size={14}
                          color={
                            selectedMethod === 'home_delivery'
                              ? '#fff'
                              : PRIMARY_COLOR_TINT
                          }
                        />
                        <Text
                          style={[
                            styles.miniBtnText,
                            selectedMethod === 'home_delivery' &&
                              styles.whiteText,
                          ]}
                        >
                          Home Delivery
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={[styles.defaultDeliveryText, { marginLeft: 5 }]}
                      >
                        {toPercentLabel(currentItemFee)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.defaultDeliveryInfo}>
                      <MaterialIcons
                        name="local-shipping-outlined"
                        size={14}
                        color={PRIMARY_COLOR_TINT}
                      />
                      <Text style={styles.defaultDeliveryText}>
                        Delivery: Drop-off Station Only
                      </Text>
                      <Text style={styles.defaultDeliveryText}>
                        {toPercentLabel(currentItemFee)}
                      </Text>
                      {!isProUser && (
                        <TouchableOpacity style={styles.proBanner}>
                          <Text style={styles.proBannerText}>
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
          <View style={styles.summaryContainer}>
            {(dropOffItems.length > 0 || homeItems.length > 0) && (
              <View style={styles.deliveryInfoCard}>
                {dropOffItems.length > 0 && (
                  <View style={styles.stationNoticeContainer}>
                    <Text style={styles.sectionTitle}>Pick-up Information</Text>
                    {dropOffItems.map(item => (
                      <View key={item.productId} style={styles.stationRow}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            width: '100%',
                          }}
                        >
                          <MaterialIcons
                            name="inventory-outlined"
                            size={16}
                            color={PRIMARY_COLOR_TINT}
                          />
                          <Text style={styles.stationText}>
                            Available delivery stations for{' '}
                            {item.product?.title}:
                          </Text>
                        </View>
                        <View style={{ marginVertical: 6, width: '100%' }}>
                          {item.product?.physicalDetails?.dropOffAddress?.map(
                            (station, index) => {
                              const isSelected =
                                selectedStations[item.productId]?.id ===
                                (station.id || index);
                              return (
                                <TouchableOpacity
                                  key={station.id || index}
                                  onPress={() =>
                                    handleStationSelect(item.productId, station)
                                  }
                                  style={[
                                    styles.stationOption,
                                    isSelected && styles.selectedStationOption,
                                  ]}
                                >
                                  <Text
                                    key={station.id || index}
                                    style={[
                                      styles.stationText2,
                                      isSelected &&
                                        styles.selectedStationOptionText,
                                    ]}
                                  >
                                    {station.name}, {station.address}
                                  </Text>
                                </TouchableOpacity>
                              );
                            },
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {homeItems.length > 0 && (
                  <View style={styles.homeDeliveryForm}>
                    <Text style={styles.sectionTitle}>
                      Home Delivery Details
                    </Text>
                    <Text style={styles.label}>Recipient Phone Number</Text>
                    <PhoneInput
                      defaultValue={phoneNumber}
                      defaultCode={countryCode}
                      layout="first"
                      onChangeText={handlePhoneChange}
                      onChangeFormattedText={text => setFormattedValue(text)}
                      containerStyle={styles.phoneInputContainer}
                      textContainerStyle={styles.phoneTextContainer}
                      withShadow
                    />
                    {!isValid && phoneNumber.length > 0 && (
                      <Text style={styles.errorText}>
                        Invalid number for {countryCode}
                      </Text>
                    )}
                    <Text style={[styles.label, { marginTop: 10 }]}>
                      Delivery Address
                    </Text>
                    <TextInput
                      style={styles.addressInput}
                      placeholder="Room No, Hostel Name, or Faculty building..."
                      value={deliveryAddress}
                      onChangeText={setDeliveryAddress}
                      placeholderTextColor={PRIMARY_COLOR_TINT}
                      multiline
                    />
                  </View>
                )}
              </View>
            )}
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <CurrencyDisplay value={subtotal} size="small" />
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Transaction Tax (2%)</Text>
              <CurrencyDisplay value={transactionTax} size="small" />
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <CurrencyDisplay value={grandTotal} size="large" />
            </View>
            <View
              style={[styles.balanceCard, !canAfford && styles.balanceError]}
            >
              <Text style={styles.balanceText}>Your Balance:</Text>
              <CurrencyDisplay value={userBalance} size="small" />
            </View>
            <TouchableOpacity
              style={[styles.buyBtn, !canAfford && styles.disabledBtn]}
              onPress={handleProceedToVerify}
              disabled={!canAfford}
            >
              <Text style={styles.buyBtnText}>
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
      <Toast config={toastConfig} />
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  itemWrapper: {
    paddingHorizontal: 15,
    marginTop: 10,
  },
  summaryContainer: {
    padding: 20,
    backgroundColor: '#FFF',
    marginTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#222',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: { color: '#666', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 15 },
  grandTotalLabel: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  balanceError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  balanceText: { fontSize: 14, fontWeight: '600', color: '#444' },
  buyBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledBtn: { backgroundColor: '#A1A1AA' },
  buyBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  itemDeliveryContainer: {
    paddingHorizontal: 10,
    marginTop: -5,
  },
  miniToggleRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
  },
  miniBtn: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
  },
  miniBtnActive: {
    backgroundColor: PRIMARY_COLOR,
  },
  miniBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY_COLOR_TINT,
    marginLeft: 3,
  },
  whiteText: { color: '#fff' },
  defaultDeliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  defaultDeliveryText: {
    fontSize: 11,
    color: PRIMARY_COLOR_TINT,
    marginLeft: 5,
    fontWeight: 'bold',
  },
  proBanner: {
    marginLeft: 5,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignContent: 'center',
  },
  proBannerText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  deliveryInfoCard: {
    marginBottom: 15,
  },
  stationNoticeContainer: {
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: PRIMARY_COLOR,
  },
  stationRow: {
    width: '100%',
  },
  stationText: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    marginLeft: 6,
    flex: 1,
  },
  stationText2: {
    fontSize: 12,
    color: PRIMARY_COLOR,
  },
  selectedStationOptionText: {
    color: '#fff',
  },
  homeDeliveryForm: {
    width: '100%',
  },
  addressInput: {
    backgroundColor: '#fadccc',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
    textAlignVertical: 'top',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  phoneInputContainer: {
    width: '100%',
    height: 60,
    backgroundColor: '#fadccc',
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    overflow: 'hidden',
  },
  phoneTextContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
  },
  errorText: {
    color: PRIMARY_COLOR,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2222',
    marginBottom: 8,
  },
  stationOption: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedStationOption: {
    backgroundColor: PRIMARY_COLOR,
  },
});
