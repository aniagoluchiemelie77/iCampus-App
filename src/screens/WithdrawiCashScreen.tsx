import {iCashActionsStyles, PaymentMethodCard, CARD_WIDTH} from './BuyiCashScreen';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Pressable
} from 'react-native';
import { baseUrl } from '../components/HomeScreenComponents';
import {AddPaymentModal} from '../components/AddPaymentMethodModal.tsx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../components/hooks';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '@components/Classroomcomponent';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import toastConfig from '@components/ToastConfig';
import { PageHeader } from '../components/PageHeader';
import { useRoute } from '@react-navigation/native';
import ReactNativeBiometrics from 'react-native-biometrics';
import {
  fetchLiveRate,
} from '../utils/UserTransactionsHelpers.tsx';
import { UserBankOrCardDetails } from 'types/firebase';
const rnBiometrics = new ReactNativeBiometrics();

export const ICashWithdrawPage = ({ navigation }: any) => {
  const route = useRoute();
  const user = useAppSelector(state => state.user);
  const inputRef = useRef<TextInput>(null);
  const [iCashAmount, setICashAmount] = useState('');
  const [localCurrencyEquivalent, setLocalCurrencyEquivalent] =
    useState('0.00');
  const [localCurrency, setLocalCurrency] = useState('');
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [currencyData, setCurrencyData] = useState({
    rate: 1550,
    code: 'NGN',
  });
  const [savedMethods, setSavedMethods] = useState<UserBankOrCardDetails[]>([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const [selectedMethod, setSelectedMethod] =
    useState<UserBankOrCardDetails | null>(null);
  const hasPaymentMethod = savedMethods.length > 0;
  const EXCHANGE_RATE_USD = 0.74;
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [step, setStep] = useState<'details' | 'pin'>('details');
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const WITHDRAWAL_FEE_PERCENT = 0.01;
  const rawAmount =
    parseFloat(iCashAmount) * EXCHANGE_RATE_USD * currencyData.rate;
  const fee = rawAmount * WITHDRAWAL_FEE_PERCENT;
  const finalPayout = rawAmount - fee;
  const fetchPaymentMethods = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}user/payment-methods/${user?.uid}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const result = await response.json();
      const methods = Array.isArray(result) ? result : result.data;
      if (Array.isArray(methods)) {
        setSavedMethods(methods);
      }
    } catch (error) {
      console.error('Error fetching methods:', error);
    }
  }, [user?.uid]);
  useEffect(() => {
    const getLiveRate = async () => {
      try {
        const data = await fetchLiveRate(user?.country || 'Nigeria');
        setCurrencyData({
          rate: data.rate,
          code: data.code,
        });
      } catch (error) {
        console.error('Failed to update rates:', error);
      }
    };
    getLiveRate();
  }, [user?.country]);
  useEffect(() => {
    const numericICash = parseFloat(iCashAmount);
    if (numericICash > 0) {
      const inUsd = numericICash * EXCHANGE_RATE_USD;
      const calculatedLocalCurrency = inUsd * currencyData.rate;
      setLocalCurrencyEquivalent(
        calculatedLocalCurrency.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      );
    } else {
      setLocalCurrencyEquivalent('0.00');
    }
  }, [iCashAmount, currencyData]);
  useEffect(() => {
    const getCurrency = async () => {
      const data = await fetchLiveRate(user?.country || 'Nigeria');
      setLocalCurrency(data.symbol);
    };
    getCurrency();
  }, [user?.country]);
  const needsRefresh = (route.params as any)?.refresh;
  useEffect(() => {
    fetchPaymentMethods();
    if (needsRefresh) {
      const timer = setTimeout(() => {
        fetchPaymentMethods();
      }, 2000);
      navigation.setParams({ refresh: undefined } as any);
      return () => clearTimeout(timer);
    }
  }, [needsRefresh, navigation, fetchPaymentMethods]);
  const handleWithdrawTrigger = () => {
    const numericICash = parseFloat(iCashAmount);
    if (!numericICash || numericICash <= 0) return;
    if (!selectedMethod) {
      Toast.show({ type: 'info', text1: 'Please select a bank account' });
      return;
    }
    setStep('details');
    setShowConfirmModal(true);
  };
  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPin(cleaned);
    if (cleaned.length === 6) {
      verifyPin(cleaned);
    }
  };
  const finalExecution = useCallback(async () => {
    setIsProcessing(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const pinRes = await fetch(`${baseUrl}user/verify-icash-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin }),
      });
      const pinData = await pinRes.json();
      if (!pinRes.ok) {
        Toast.show({
          type: 'error',
          text1: 'Verification Failed',
          text2: pinData.message,
        });
        return;
      }
      const response = await fetch(
        `${baseUrl}user/transactions/initialize-withdraw`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Idempotency-Key': Date.now().toString(),
          },
          body: JSON.stringify({
            iCashAmount: parseFloat(iCashAmount),
            amountToReceive: finalPayout,
            fee: fee,
            currency: currencyData.code,
            userId: user.uid,
            bankDetails: selectedMethod,
          }),
        },
      );
      const data = await response.json();
      if (data.status === 'success') {
        setShowConfirmModal(false);
        navigation.navigate('iCashSuccessScreen', {
          amount: iCashAmount,
          type: 'withdraw',
          payout: finalPayout,
          currency: currencyData.code,
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Withdrawal Failed',
        text2: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    pin,
    iCashAmount,
    finalPayout,
    fee,
    currencyData.code,
    user.uid,
    selectedMethod,
    navigation,
  ]);
  const verifyPin = async (code: string) => {
    setIsProcessing(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}user/verify-icash-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin: code }),
      });
      if (response.ok) {
        finalExecution();
      } else {
        setPin(''); // Clear PIN on failure
        Animated.sequence([
          Animated.timing(shakeAnimation, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnimation, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnimation, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnimation, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
        ]).start();
        const data = await response.json();
        Toast.show({
          type: 'error',
          text1: 'Invalid PIN',
          text2: data.message,
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Security Error',
        text2: 'Connection failed',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  const handleRequestReset = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}user/request-pin-reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'OTP Sent',
          text2: 'Check your email for the reset code.',
        });
        navigation.navigate('ICashResetPin');
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not request reset.',
      });
    }
  };
  const handleBiometricAuth = useCallback(async () => {
    const { available } = await rnBiometrics.isSensorAvailable();
    if (available) {
      try {
        const { success } = await rnBiometrics.simplePrompt({
          promptMessage: 'Confirm identity to withdraw iCash',
        });
        if (success) {
          finalExecution();
        }
      } catch (error) {
        console.log('Biometric prompt failed or was cancelled');
      }
    } else {
      console.log('Biometrics not available on this device');
    }
  }, [finalExecution]);
  useEffect(() => {
    if (step === 'pin') {
      handleBiometricAuth();
    }
  }, [step, handleBiometricAuth]);

  const withdrawalMethods = savedMethods.filter(type => type.method === 'bank');
  return (
    <ScrollView style={iCashActionsStyles.container}>
      <PageHeader title="Withdraw iCash" />
      <View style={iCashActionsStyles.bodyContainer}>
        <Text style={iCashActionsStyles.label}>Enter iCash to Withdraw</Text>
        <View style={iCashActionsStyles.inputContainer}>
          <Icon
            name="diamond"
            size={20}
            color={PRIMARY_COLOR}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={iCashActionsStyles.inputBorderless}
            placeholder="0.00"
            keyboardType="numeric"
            value={iCashAmount}
            onChangeText={setICashAmount}
          />
        </View>
        <View style={iCashActionsStyles.exchangeCard}>
          <View style={iCashActionsStyles.exchangeRow}>
            <Text style={iCashActionsStyles.exchangeText}>Exchange Rate</Text>
            <Text style={iCashActionsStyles.exchangeValue}>
              1 iCash ≈ {localCurrency}{' '}
              {(EXCHANGE_RATE_USD * currencyData.rate).toFixed(2)}
            </Text>
          </View>
          <View style={iCashActionsStyles.divider} />
          <Text style={iCashActionsStyles.resultLabel}>You will receive:</Text>
          <View style={iCashActionsStyles.resultDiv}>
            <Text style={iCashActionsStyles.currencyPrefix}>
              {localCurrency}
            </Text>
            <Text style={iCashActionsStyles.resultValue}>
              {localCurrencyEquivalent}
            </Text>
          </View>
        </View>
        {!hasPaymentMethod && (
          <View style={iCashActionsStyles.warningBox}>
            <Icon name="alert-circle" size={20} color={PRIMARY_COLOR} />
            <Text style={iCashActionsStyles.warningText}>
              You haven't added a withdrawal method. Please add a bank account
              to continue.
            </Text>
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={iCashActionsStyles.horizontalScrollPadding}
          snapToInterval={CARD_WIDTH + 15}
          decelerationRate="fast"
        >
          {withdrawalMethods.map(method => (
            <PaymentMethodCard
              key={method.id}
              item={method}
              isSelected={selectedMethod?.id === method.id}
              onSelect={() => setSelectedMethod(method)}
            />
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[
            iCashActionsStyles.buyBtn,
            (!iCashAmount || parseFloat(iCashAmount) <= 0) && { opacity: 0.5 },
          ]}
          onPress={handleWithdrawTrigger}
          disabled={!iCashAmount || parseFloat(iCashAmount) <= 0}
        >
          <Text style={iCashActionsStyles.buyBtnText}>
            {!hasPaymentMethod
              ? 'Add Bank Account'
              : !selectedMethod
              ? 'Select a Bank Account'
              : 'Confirm Withdrawal'}
          </Text>
        </TouchableOpacity>
      </View>
      <Toast config={toastConfig} />
      <AddPaymentModal
        visible={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        currencyData={currencyData}
        user={user}
        mode="withdraw"
      />
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        transparent={true}
      >
        <View style={iCashActionsStyles.modalOverlay}>
          <View style={iCashActionsStyles.bottomSheet}>
            <View style={iCashActionsStyles.modalHeader}>
              <Text style={iCashActionsStyles.modalTitle}>
                {step === 'details'
                  ? 'Confirm Withdrawal'
                  : 'Enter your iCash PIN'}
              </Text>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                <Icon name="close" size={24} color={PRIMARY_COLOR_TINT} />
              </TouchableOpacity>
            </View>
            {step === 'details' ? (
              <>
                <View style={iCashActionsStyles.detailRow}>
                  <Text style={iCashActionsStyles.detailRowText}>
                    Withdraw Amount:
                  </Text>
                  <View style={iCashActionsStyles.detailRowSubrow}>
                    <Icon
                      name="diamond"
                      size={19}
                      color="#2222"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={iCashActionsStyles.detailRowText}>
                      {iCashAmount}
                    </Text>
                  </View>
                </View>
                <View style={iCashActionsStyles.detailRow}>
                  <Text style={iCashActionsStyles.detailRowText}>
                    Charges (1%):
                  </Text>
                  <Text style={iCashActionsStyles.detailRowText}>
                    {' '}
                    - {localCurrency}
                    {fee.toFixed(2)}
                  </Text>
                </View>
                <View
                  style={[
                    iCashActionsStyles.detailRow,
                    iCashActionsStyles.totalRow,
                  ]}
                >
                  <Text style={iCashActionsStyles.totalText}>
                    Amount you will receive:
                  </Text>
                  <Text style={iCashActionsStyles.totalText}>
                    {localCurrency}
                    {finalPayout.toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={iCashActionsStyles.payBtn}
                  onPress={() => setStep('pin')}
                >
                  <Text style={iCashActionsStyles.payBtnText}>Pay</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View>
                {step === 'pin' && (
                  <View style={iCashActionsStyles.pinContainer}>
                    <Text style={iCashActionsStyles.pinSubtitle}>
                      Enter your 6-digit iCash PIN
                    </Text>
                    <TextInput
                      ref={inputRef}
                      value={pin}
                      onChangeText={handleTextChange}
                      maxLength={6}
                      keyboardType="number-pad"
                      secureTextEntry
                      style={iCashActionsStyles.hiddenInput}
                      autoFocus={true}
                    />
                    <Pressable
                      onPress={() => inputRef.current?.focus()}
                      style={iCashActionsStyles.pressableArea}
                    >
                      <Animated.View
                        style={[
                          iCashActionsStyles.pinRow,
                          { transform: [{ translateX: shakeAnimation }] },
                        ]}
                      >
                        {[...Array(6)].map((_, i) => (
                          <View
                            key={i}
                            style={[
                              iCashActionsStyles.dot,
                              pin.length > i && iCashActionsStyles.dotFilled,
                              pin.length === i && iCashActionsStyles.dotActive,
                            ]}
                          />
                        ))}
                      </Animated.View>
                    </Pressable>
                    <View style={iCashActionsStyles.pinActionRow}>
                      <TouchableOpacity
                        onPress={handleBiometricAuth}
                        style={iCashActionsStyles.iconBtn}
                      >
                        <Icon
                          name="fingerprint"
                          size={28}
                          color={PRIMARY_COLOR}
                        />
                        <Text style={iCashActionsStyles.iconBtnText}>
                          Use Fingerprint
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleRequestReset}>
                        <Text style={iCashActionsStyles.forgotText}>
                          Forgot PIN?
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {isProcessing && (
                      <ActivityIndicator
                        style={{ marginTop: 20 }}
                        color={PRIMARY_COLOR}
                      />
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};