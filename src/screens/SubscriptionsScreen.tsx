import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppSelector } from '../components/hooks';
import { PayWithFlutterwave } from 'flutterwave-react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchLiveRate } from '../utils/UserTransactionsHelpers';
import { PageHeader } from '../components/PageHeader';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { User } from 'types/firebase';
import Modal from 'react-native-modal';
import Toast from 'react-native-toast-message';
import {verifySubscriptionOnBackend} from '../api/localPostApis';
import { FLUTTERWAVE_PUBLIC_KEY } from '@env';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
type SubscriptionTier = User['tier'] | 'free';
type FlutterwaveCurrency = 
  | 'NGN' | 'USD' | 'GHS' | 'ZAR' | 'KES' | 'UGX' | 'TZS' | 'GBP' | 'EUR' | 'CAD'
  ;

interface Props {
  route: { params: { targetScreen?: string } };
  navigation: any;
}
const PRICES: Record<string, number> = {
    free: 0,
    pro: 1.11,
    premium: 3.69,
};
interface FlutterwaveButtonProps {
  onPress: () => void;
  label: string;
}

const FlutterwaveButton = ({ onPress, label }: FlutterwaveButtonProps) => (
  <TouchableOpacity style={styles.payButton} onPress={onPress}>
    <Text style={styles.payButtonText}>{label}</Text>
  </TouchableOpacity>
);

export const SubscriptionScreen = ({ route, navigation }: Props) => {
    const { tier, email, firstname, lastname, country } = useAppSelector(state => state.user);
    const [selectedTier, setSelectedTier] = useState(tier);
    const [isPayModalVisible, setPayModalVisible] = useState(false);
    const { targetScreen } = route.params || {};
    const [exchangeData, setExchangeData] = useState({ rate: 1, symbol: '$', code: 'USD' });
    const getLocalPriceValue = React.useCallback((id: string) => {
        return (PRICES[id] || 0) * exchangeData.rate;
    }, [exchangeData.rate]);
    const formatLocalPrice = React.useCallback((id: string) => {
        const value = getLocalPriceValue(id);
        return `${exchangeData.symbol}${value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }, [exchangeData.symbol, getLocalPriceValue]);
    const plans: { id: SubscriptionTier; name: string; features: string[] }[] = [
        { id: 'free', name: 'Free', features: ['Basic Profile', '1x Post Impression Boost', '2 Free Lectures Exceptions Per Month', 'Drop-off location for purchased items', 'Standard Search'] },
        { id: 'pro', name: 'Pro', features: ['Subscribed Badge', '2x Post Impression Boost', '4 Free Lectures Exceptions Per Month', 'Home Delivery or Drop-off location for purchased items', 'Standard Search + AI Suggestions', 'Create Paid Courses', 'iTag username personalization', 'Verified Merchant Profile', 'iScore visibility of Searched Users'] },
        { id: 'premium', name: 'Premium', features: ['Premium Badge', '5x Post Impression Boost', '6 Free Lectures Exceptions Per Month', 'Free Shipping or Home Delivery or Drop-off location for purchased items', 'Optimized Search + AI Suggestions + Ghost Mode', 'Create Paid Courses', 'iTag custom personalization', 'Verified Merchant Profile', 'iScore visibility of Searched Users'] },
    ];
    const handlePaymentSuccess = async (data: any) => {
        try {
            const transactionId = data.transaction_id || data.flw_ref;
            if (data.status === 'successful' || data.status === 'completed') {
                const verification = await verifySubscriptionOnBackend(transactionId, selectedTier!, exchangeData.rate);      
                if (verification.success) {
                    Toast.show({
                        type: 'success',
                        text1: 'Subscription Active!',
                        text2: 'Your account has been upgraded.',
                    });
                    if (targetScreen) {
                        navigation.navigate(targetScreen);
                    } else {
                        navigation.navigate('Home');
                    }
                }
            } 
        } catch (error) {
            console.error("Verification Error:", error);
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
    const renderCustomButton = React.useCallback((props: any) => (
        <FlutterwaveButton 
            onPress={props.onPress} 
            label={`Pay ${formatLocalPrice(selectedTier!)}`} 
        />
    ), [selectedTier, formatLocalPrice]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <PageHeader
                title="Subscription Plans"
            />
            <View style={styles.horizontalWrapper}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    snapToAlignment="center"
                    snapToInterval={CARD_WIDTH + 20} 
                    decelerationRate="fast"
                    contentContainerStyle={styles.horizontalScrollContent}
                >
                    {plans.map((plan) => {
                        const isCurrentPlan = tier === plan.id;
                        const isSelected = selectedTier === plan.id;
                        const isFree = plan.id === 'free';

                        return (
                            <View 
                                key={plan.id} 
                                style={[
                                    styles.card, 
                                   { width: CARD_WIDTH },
                                   isSelected && styles.selectedCard,
                                   isCurrentPlan && styles.currentPlanBorder // Primary color border
                                ]}
                            >
                                {isCurrentPlan && (
                                    <View style={styles.currentPlanLabel}>
                                        <Text style={styles.currentPlanLabelText}>Your current plan</Text>
                                    </View>
                                )}
                                <View style={styles.cardHeader}>
                                    <Text style={styles.planName}>{plan.name}</Text>
                                    {isCurrentPlan ? (
                                        <Text style={styles.badgeText}>Active</Text>
                                    ) : (
                                        <Text style={styles.badgeText}>{formatLocalPrice(plan.id!)}</Text>
                                    )}
                                </View>
                                <View style={styles.featureList}>
                                    {plan.features.map((f, i) => (
                                        <View key={i} style={styles.featureRow}>
                                            <MaterialIcons name="check-circle-outlined" size={16} color={PRIMARY_COLOR} />
                                            <Text style={styles.featureText}>{f}</Text>
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
                                        style={styles.payButton}
                                    >
                                        <Text style={styles.payButtonText}>
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
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Confirm Subscription</Text>
                        <Text style={styles.modalSubTitle}>
                            You are upgrading to the {selectedTier?.toUpperCase()} plan.
                        </Text>
                        <View style={styles.priceBreakdown}>
                            <Text style={styles.priceLabel}>Total to pay:</Text>
                            <Text style={styles.priceValue}>{formatLocalPrice(selectedTier!)}</Text>
                        </View>
                        <PayWithFlutterwave
                            onRedirect={(data) => {
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
                            <Text style={styles.cancelButtonText}>Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
   );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: 17, fontWeight: 'bold', color: '#222' },
  price: { fontSize: 28, fontWeight: '800', marginVertical: 10 },
  perMonth: { fontSize: 14, fontWeight: '400', color: '#666' },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureText: { marginLeft: 8, color: '#2222' },
  badgeText: { color: PRIMARY_COLOR, fontSize: 12, fontWeight: 'bold' },
  payButton: { backgroundColor: PRIMARY_COLOR, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, width: '100%' },
  payButtonText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  horizontalWrapper: {
    marginVertical: 20,
  },
  horizontalScrollContent: {
    paddingHorizontal: 20, 
  },
  card: {
    backgroundColor: '#fadccc',
    borderRadius: 20,
    padding: 20,
    marginRight: 20, 
    height: 420,
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
    backgroundColor: PRIMARY_COLOR, 
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  currentPlanLabelText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  featureList: {
    marginTop: 10,
    flex: 1,
  },
  continueButton: {
    backgroundColor: '#007AFF', // PRIMARY_COLOR
    margin: 20,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
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
    color: '#222',
  },
  modalSubTitle: {
    fontSize: 13,
    color: '#2222',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 15,
  },
  priceBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    padding: 13,
    borderRadius: 12,
    marginBottom: 15,
  },
  priceLabel: {
    fontSize: 14,
    color: '#2222',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
  },
  cancelButton: {
    marginTop: 16,
    alignItems: 'center',
    backgroundColor: '#fadccc',
    padding: 18,    
    borderRadius: 12,
    alignSelf: 'center',
    alignContent: 'center',
    borderColor: PRIMARY_COLOR_TINT,
    borderWidth: .8,
  },
  cancelButtonText: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: '600',
  },
});
