import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppSelector } from '../components/hooks';
import { PayWithFlutterwave } from 'flutterwave-react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchLiveRate } from '../utils/UserTransactionsHelpers';
import { PageHeader } from '../components/PageHeader';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { User } from '../types/firebase';
import Modal from 'react-native-modal';
import Toast from 'react-native-toast-message';
import { verifySubscriptionOnBackend } from '../api/localPostApis';
import { FLUTTERWAVE_PUBLIC_KEY } from '@env';
import { USD_SUBSCRIPTION_PRICES } from '../constants/inAppConstants';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
type SubscriptionTier = User['tier'] | 'free';

type FlutterwaveCurrency =
  | 'NGN'
  | 'USD'
  | 'GHS'
  | 'ZAR'
  | 'KES'
  | 'UGX'
  | 'TZS'
  | 'GBP'
  | 'EUR'
  | 'CAD';

interface Props {
  route: { params: { targetScreen?: string } };
  navigation: any;
}
interface FlutterwaveButtonProps {
  onPress: () => void;
  label: string;
}

export const FlutterwaveButton = ({
  onPress,
  label,
}: FlutterwaveButtonProps) => (
  <TouchableOpacity style={styles.payButton} onPress={onPress}>
    <Text style={styles.payButtonText}>{label}</Text>
  </TouchableOpacity>
);
const PLANS: { id: SubscriptionTier; name: string; features: string[] }[] = [
  {
    id: 'free',
    name: 'Free',
    features: [
      'Basic Profile',
      '1x Post Impression Boost',
      '1 Free Lecture Exceptions Per Month',
      'Drop-off location only for purchased items',
      'Standard Search',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    features: [
      'Subscribed Badge',
      '2x Post Impression Boost',
      '2 Free Lectures Exceptions Per Month',
      'Home Delivery or Drop-off location for purchased items',
      'Standard Search + AI Suggestions',
      'Create Paid Courses',
      'iTag username personalization',
      'Verified Merchant Profile',
      'iScore visibility of Searched Users',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    features: [
      'Premium Badge',
      '5x Post Impression Boost',
      '3 Free Lectures Exceptions Per Month',
      'Free Shipping or Home Delivery or Drop-off location for purchased items',
      'Optimized Search + AI Suggestions + Ghost Mode',
      'Create Paid Courses',
      'iTag custom personalization',
      'Verified Merchant Profile',
      'iScore visibility of Searched Users',
    ],
  },
];
export const SubscriptionScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { tier, email, firstname, lastname, country } = useAppSelector(
    state => state.user,
  );
  const [selectedTier, setSelectedTier] = useState(tier);
  const [isPayModalVisible, setPayModalVisible] = useState(false);
  const { targetScreen } = route.params || {};
  const [exchangeData, setExchangeData] = useState({
    rate: 1,
    symbol: '$',
    code: 'USD',
  });
  const getLocalPriceValue = React.useCallback(
    (id: string) => {
      const tierMap: Record<string, keyof typeof USD_SUBSCRIPTION_PRICES> = {
        pro: 'Pro',
        premium: 'Premium',
        free: 'Free',
      };
      const matchedTier = tierMap[id.toLowerCase()] || 'Free';
      return USD_SUBSCRIPTION_PRICES[matchedTier] * exchangeData.rate;
    },
    [exchangeData.rate],
  );
  const formatLocalPrice = React.useCallback(
    (id: string) => {
      const value = getLocalPriceValue(id);
      return `${exchangeData.symbol}${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [exchangeData.symbol, getLocalPriceValue],
  );
  const handlePaymentSuccess = async (data: any) => {
    try {
      const transactionId = data.transaction_id || data.flw_ref;
      if (data.status === 'successful' || data.status === 'completed') {
        const verification = await verifySubscriptionOnBackend(
          transactionId,
          selectedTier!,
          exchangeData.rate,
        );
        if (verification.success) {
          Toast.show({
            type: 'success',
            text1: 'Subscription Active!',
            text2: 'Your account has been upgraded.',
          });
          if (targetScreen) {
            navigation.navigate(targetScreen);
          } else {
            navigation.navigate('Home', { activeTab: 'home' });
          }
        }
      }
    } catch (error) {
      console.error('Verification Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: 'Please contact support if you were charged.',
      });
    }
  };
  useEffect(() => {
    const getRate = async () => {
      const data = await fetchLiveRate(country!);
      setExchangeData(data);
    };
    getRate();
  }, [country]);
  const renderCustomButton = React.useCallback(
    (props: any) => (
      <FlutterwaveButton
        onPress={props.onPress}
        label={`Pay ${formatLocalPrice(selectedTier!)}`}
      />
    ),
    [selectedTier, formatLocalPrice],
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <PageHeader title="Subscription Plans" />
      <View style={styles.horizontalWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToAlignment="center"
          snapToInterval={CARD_WIDTH + 20}
          decelerationRate="fast"
          contentContainerStyle={styles.horizontalScrollContent}
        >
          {PLANS.map(plan => {
            const isCurrentPlan = tier === plan.id;
            const isSelected = selectedTier === plan.id;
            const isFree = plan.id === 'free';

            return (
              <View
                key={plan.id}
                style={[
                  styles.card,
                  {
                    width: CARD_WIDTH,
                    backgroundColor: colors.backgroundSecondary,
                  },
                  isSelected && styles.selectedCard,
                  isCurrentPlan && styles.currentPlanBorder,
                ]}
              >
                {isCurrentPlan && (
                  <View
                    style={[
                      styles.currentPlanLabel,
                      { backgroundColor: colors.btnColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.currentPlanLabelText,
                        { color: colors.btnTextColor },
                      ]}
                    >
                      Your current plan
                    </Text>
                  </View>
                )}
                <View style={styles.cardHeader}>
                  <Text style={[styles.planName, { color: colors.text }]}>
                    {plan.name}
                  </Text>
                  {isCurrentPlan ? (
                    <Text style={[styles.badgeText, { color: colors.primary }]}>
                      Active
                    </Text>
                  ) : (
                    <Text style={[styles.badgeText, { color: colors.primary }]}>
                      {formatLocalPrice(plan.id!)}
                    </Text>
                  )}
                </View>
                <View style={styles.featureList}>
                  {plan.features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <MaterialIcons
                        name="check-circle-outlined"
                        size={16}
                        color={colors.primary}
                      />
                      <Text
                        style={[styles.featureText, { color: colors.text }]}
                      >
                        {f}
                      </Text>
                    </View>
                  ))}
                </View>
                {!isFree && selectedTier !== tier && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedTier(plan.id);
                      setPayModalVisible(true);
                    }}
                    disabled={isCurrentPlan}
                    style={[
                      styles.payButton,
                      { backgroundColor: colors.btnColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.payButtonText,
                        { color: colors.btnTextColor },
                      ]}
                    >
                      Select Plan
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
      <Modal
        isVisible={isPayModalVisible}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        onBackButtonPress={() => setPayModalVisible(false)}
        onBackdropPress={() => setPayModalVisible(false)}
        swipeDirection="down"
        onSwipeComplete={() => setPayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.textDarker }]}>
              Confirm Subscription
            </Text>
            <Text style={[styles.modalSubTitle, { color: colors.text }]}>
              You are upgrading to the {selectedTier?.toUpperCase()} plan.
            </Text>
            <View style={styles.priceBreakdown}>
              <Text style={[styles.priceLabel, { color: colors.text }]}>
                Total to pay:
              </Text>
              <Text style={[styles.priceValue, { color: colors.text }]}>
                {formatLocalPrice(selectedTier!)}
              </Text>
            </View>
            <PayWithFlutterwave
              onRedirect={data => {
                setPayModalVisible(false);
                handlePaymentSuccess(data);
              }}
              options={{
                tx_ref: `sub_${Date.now()}`,
                authorization: FLUTTERWAVE_PUBLIC_KEY,
                customer: { email, name: `${firstname} ${lastname}` },
                amount: getLocalPriceValue(selectedTier!),
                currency: exchangeData.code as FlutterwaveCurrency,
                payment_options: 'card,ussd,banktransfer',
              }}
              customButton={renderCustomButton}
            />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPayModalVisible(false)}
            >
              <Text
                style={[styles.cancelButtonText, { color: colors.primary }]}
              >
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: 14, fontWeight: 'bold' },
  featureRow: { flexDirection: 'row', alignItems: 'center'},
  featureText: { marginLeft: 8, fontSize: 14 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  payButton: { paddingHorizontal: 16, borderRadius: 15, alignContent: 'center', marginTop: 8, width: '80%', paddingVertical: 10, alignSelf: 'center' },
  payButtonText: { fontSize: 14, fontWeight: 'bold' },
  horizontalWrapper: {
    marginVertical: 20,
  },
  horizontalScrollContent: {
    paddingHorizontal: 20, 
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginRight: 20, 
    height: 400,
    elevation: 4,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currentPlanBorder: {
    borderColor: PRIMARY_COLOR_TINT, 
  },
  selectedCard: {
    borderColor: PRIMARY_COLOR, 
  },
  currentPlanLabel: {
    position: 'absolute',
    top: -12,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    zIndex: 10,
  },
  currentPlanLabelText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  featureList: {
    marginVertical: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: PRIMARY_COLOR_TINT,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalSubTitle: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 15,
  },
  priceBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 15,
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 15,
    alignItems: 'center',
    padding: 15,    
    borderRadius: 15,
    alignSelf: 'center',
    alignContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
