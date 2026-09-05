import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { useAppSelector } from '../hooks/hooks';
import { PayWithFlutterwave } from 'flutterwave-react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { PageHeader } from '../components/PageHeader';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { User } from '../types/firebase';
import Toast from 'react-native-toast-message';
import { CustomButton } from '../assets/components/AppUIComponents';
import { verifySubscriptionOnBackend } from '../api/localPostApis';
import { FLUTTERWAVE_PUBLIC_KEY } from '@env';
import {
  USD_SUBSCRIPTION_PRICES,
  DELIVERY_FEES,
  EXCEPTION_ACCOUNT_LIMITS,
} from '../constants/inAppConstants';
import { useTheme } from '../context/ThemeContext';
import { useExchangeRate } from '../hooks/useExchangeRate.ts';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
type SubscriptionTier = User['tier'] | 'free';

type FlutterwaveCurrency =
  'NGN' | 'USD' | 'GHS' | 'ZAR' | 'KES' | 'UGX' | 'TZS' | 'GBP' | 'EUR' | 'CAD';

interface Props {
  route: { params: { targetScreen?: string } };
  navigation: any;
}
interface FlutterwaveButtonProps {
  onPress: () => void;
  label: string;
}

const toPercentLabel = (rate: number) => `${(rate * 100).toFixed(0)}%`;
const PLANS: { id: SubscriptionTier; name: string; features: string[] }[] = [
  {
    id: 'free',
    name: 'Free',
    features: [
      'Basic Profile',
      '1x Post Impression Boost',
      `${EXCEPTION_ACCOUNT_LIMITS.free} free lecture exceptions per month`,
      `Standard shipping fees (${toPercentLabel(
        DELIVERY_FEES.free.home_delivery,
      )} Home Deivery / ${toPercentLabel(
        DELIVERY_FEES.free.drop_off,
      )} Drop-off)`,
      'Standard Search',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    features: [
      'Subscribed Badge',
      '2x Post Impression Boost',
      `${EXCEPTION_ACCOUNT_LIMITS.pro} Free Lectures Exceptions Per Month`,
      `Discounted shipping (${toPercentLabel(
        DELIVERY_FEES.pro.home_delivery,
      )} Home Delivery / ${toPercentLabel(
        DELIVERY_FEES.pro.drop_off,
      )} Drop-off)`,
      'Standard Search + AI Suggestions',
      'iTag username personalization',
      'Verified Merchant Profile',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    features: [
      'Premium Badge',
      '5x Post Impression Boost',
      `${EXCEPTION_ACCOUNT_LIMITS.premium} free lecture exceptions per month`,
      `Lowest shipping fees (${toPercentLabel(
        DELIVERY_FEES.premium.home_delivery,
      )} Home Delivery / ${toPercentLabel(
        DELIVERY_FEES.premium.drop_off,
      )} Drop-off)`,
      'Optimized Search + AI Suggestions + Ghost Mode',
      'iTag custom personalization',
      'Verified Merchant Profile',
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
  const { exchangeData } = useExchangeRate(country || 'Nigeria');

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {isCurrentPlan ? 'Active' : formatLocalPrice(plan.id!)}
                  </Text>
                </View>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.cardScrollContent}
                >
                  <View style={styles.featureList}>
                    {plan.features.map((f, i) => (
                      <View key={i} style={styles.featureRow}>
                        <MaterialIcons
                          name="check-circle"
                          size={18}
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
                </ScrollView>

                {!isFree && !isCurrentPlan && (
                  <CustomButton
                    title={isSelected ? 'Selected' : 'Select Plan'}
                    onPress={() => {
                      setSelectedTier(plan.id);
                      setPayModalVisible(true);
                    }}
                    style={styles.payButtonMain}
                  />
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>

      <Modal
        visible={isPayModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPayModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setPayModalVisible(false)}
        >
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
              You are upgrading to {selectedTier?.toUpperCase()} plan.
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
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  horizontalWrapper: {
    marginHorizontal: 15,
  },
  horizontalScrollContent: {
    paddingHorizontal: 10,
    paddingTop: 15,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    marginRight: 20,
    minHeight: 550,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'space-between',
    position: 'relative',
  },
  currentPlanBorder: {
    borderColor: PRIMARY_COLOR_TINT,
  },
  selectedCard: {
    borderColor: PRIMARY_COLOR,
    transform: [{ scale: 1.02 }],
  },
  currentPlanLabel: {
    position: 'absolute',
    top: -14,
    left: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
  },
  currentPlanLabelText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  planName: { fontSize: 18, fontWeight: '700', lineHeight: 20 },
  badgeText: { fontSize: 16, fontWeight: '700', lineHeight: 20 },
  cardScrollContent: {
    flexGrow: 1,
  },
  featureList: {
    marginVertical: 15,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  featureText: {
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  payButton: {
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 20,
    width: '100%',
    paddingVertical: 14,
    alignSelf: 'center',
    backgroundColor: PRIMARY_COLOR,
  },
  payButtonMain: {
    marginTop: 'auto',
  },
  payButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 48,
    height: 5,
    backgroundColor: PRIMARY_COLOR_TINT,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalSubTitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  priceBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  priceLabel: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
    marginBottom: 20,
  },
  cancelButton: {
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export const FlutterwaveButton = ({
  onPress,
  label,
}: FlutterwaveButtonProps) => (
  <TouchableOpacity style={styles.payButton} onPress={onPress}>
    <Text style={styles.payButtonText}>{label}</Text>
  </TouchableOpacity>
);
