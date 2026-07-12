import React, { useState, useCallback, useMemo } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../hooks/hooks.ts';
import { PageHeader } from '../components/PageHeader';
import { getDistanceInMiles } from '../utils/distanceCalculator';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { useAppDataContext } from '../context/EventContext.tsx';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { CartItem } from '../components/CartItem';
import { IcashPinOrFingerprintVerifyModal } from '../components/iCashPinOrFingerprintVerifyComponent';
import Toast from 'react-native-toast-message';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { initializeCheckoutTransaction } from '../api/localPostApis';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useCheckout } from '../hooks/useCheckout.ts';
import { DELIVERY_FEES } from '../constants/inAppConstants';
import { useLocationServices } from '../hooks/useLocationService.ts';
import { StationCarousel } from '../components/StationCarousel.tsx';

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
  const currentUser = useAppSelector(state => state.user);
  const { allProducts } = useAppDataContext();
  const params = useMemo(() => {
    return (route.params || {}) as CheckoutScreenParams;
  }, [route.params]);
  const [isVerifyModalVisible, setIsVerifyModalVisible] = useState(false);

  const {
    checkoutItems,
    transactionalFinances,
    formValidation,
    phoneNumber,
    deliveryAddress,
    setDeliveryAddress,
    itemDeliveryMethods,
    selectedStations,
    handleStationSelect,
    handlePhoneChange,
    formattedValue,
    toggleDelivery,
    isPhoneValid,
    dropOffItems,
    homeItems,
  } = useCheckout(params, currentUser, allProducts);
  const { userCoords, locationPermission } = useLocationServices();

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

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const isPhysical = item.product?.type === 'physical';
      const selectedMethod = itemDeliveryMethods[item.productId] || 'drop_off';
      const gateways = item.product?.physicalDetails?.sellerGateways || [];
      const hasHome = gateways.includes('home_delivery');
      const stations = item.product?.physicalDetails?.dropOffAddress || [];
      const hasDropOff = stations.length > 0;
      const tier = currentUser?.tier || 'free';
      const rate =
        DELIVERY_FEES[tier as keyof typeof DELIVERY_FEES][
          selectedMethod as 'home_delivery' | 'drop_off'
        ];
      const canToggle = hasHome && hasDropOff;
      const isOnlyHome = hasHome && !hasDropOff;
      const isOnlyDropOff = !hasHome && hasDropOff;

      return (
        <View
          style={[
            styles.itemWrapper,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <CartItem cartEntry={item} product={item.product!} />
          {isPhysical && (
            <View style={styles.itemDeliveryContainer}>
              {canToggle && (
                <View style={styles.miniToggleRow}>
                  <View
                    style={[
                      styles.miniToggleBtnRow,
                      { borderColor: colors.border },
                    ]}
                  >
                    {/* Drop-off Button */}
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
                        Drop-off Station
                      </Text>
                    </TouchableOpacity>

                    {/* Home Button */}
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
                        Home Delivery
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.rateText, { color: colors.textDarker }]}>
                    + {toPercentLabel(rate)}
                  </Text>
                </View>
              )}

              {/* --- SCENARIO B: Only Home --- */}
              {isOnlyHome && (
                <Text style={[styles.rateText, { color: colors.text }]}>
                  Home Delivery Only
                </Text>
              )}

              {/* --- SCENARIO C: Only Drop-off (Show Carousel) --- */}
              {isOnlyDropOff && (
                <View>
                  <Text
                    style={[
                      styles.rateText,
                      { color: colors.textDarker, marginBottom: 10 },
                    ]}
                  >
                    Select Drop-off Station
                  </Text>
                  <StationCarousel
                    stations={stations}
                    selectedStation={selectedStations[item.productId]}
                    onSelect={station =>
                      handleStationSelect(item.productId, station)
                    }
                    userCoords={userCoords}
                  />
                </View>
              )}

              {/* --- Conditional Carousel for Scenario A (when Drop-off is selected) --- */}
              {canToggle && selectedMethod === 'drop_off' && (
                <View>
                  <Text
                    style={[
                      styles.rateText,
                      { color: colors.textDarker, marginBottom: 10 },
                    ]}
                  >
                    Select Drop-off Station
                  </Text>
                  <StationCarousel
                    stations={stations}
                    selectedStation={selectedStations[item.productId]}
                    onSelect={station =>
                      handleStationSelect(item.productId, station)
                    }
                    userCoords={userCoords}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      );
    },
    [
      itemDeliveryMethods,
      colors,
      currentUser?.tier,
      toggleDelivery,
      userCoords,
      handleStationSelect,
      selectedStations,
    ],
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
                              color: colors.primary,
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
    setDeliveryAddress,
    homeItems.length,
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
    marginBottom: 10,
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
  rateText: { fontSize: 14, fontWeight: 'bold' },
});
