import {iCashActionsStyles, PaymentMethodCard, CARD_WIDTH} from './BuyiCashScreen';
import { IcashPinOrFingerprintVerifyModal } from '../components/iCashPinOrFingerprintVerifyComponent.tsx';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { AddPaymentModal } from '../components/AddPaymentMethodModal.tsx';
import { initializeWithdrawTransaction } from '../api/localPostApis';
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
import { fetchLiveRate } from '../utils/UserTransactionsHelpers.tsx';
import { UserBankOrCardDetails } from 'types/firebase';
import { getUserPaymentMethods } from 'api/localGetApis.ts';

export const ICashWithdrawPage = ({ navigation }: any) => {
  const route = useRoute();
  const user = useAppSelector(state => state.user);
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
  const [selectedMethod, setSelectedMethod] =
    useState<UserBankOrCardDetails | null>(null);
  const hasPaymentMethod = savedMethods.length > 0;
  const EXCHANGE_RATE_USD = 0.74;
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [step, setStep] = useState<'details' | 'pin'>('details');
  const [_isProcessing, setIsProcessing] = useState(false);
  const WITHDRAWAL_FEE_PERCENT = 0.01;
  const rawAmount =
    parseFloat(iCashAmount) * EXCHANGE_RATE_USD * currencyData.rate;
  const fee = rawAmount * WITHDRAWAL_FEE_PERCENT;
  const finalPayout = rawAmount - fee;
  const fetchPaymentMethods = useCallback(async () => {
    if (!user?.uid) return;
    const methods = await getUserPaymentMethods(user.uid);
    setSavedMethods(methods);
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
  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);
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
  const finalExecution = useCallback(async () => {
    setIsProcessing(true);
    try {
      const payload = {
        iCashAmount: parseFloat(iCashAmount),
        amountToReceive: finalPayout,
        fee: fee,
        currency: currencyData.code,
        userId: user.uid,
        bankDetails: selectedMethod,
      };
      const response = await initializeWithdrawTransaction(payload);
      const data = response.data;
      if (data.status === 'success') {
        setShowConfirmModal(false);
        navigation.navigate('iCashSuccessScreen', {
          amount: iCashAmount,
          type: 'withdraw',
          payout: finalPayout,
          currency: currencyData.code,
          amountPurchased: 0,
          amountPaid: 0,
          recipientUsername: '',
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
    iCashAmount,
    finalPayout,
    fee,
    currencyData.code,
    user.uid,
    selectedMethod,
    navigation,
  ]);

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
            (!iCashAmount ||
              parseFloat(iCashAmount) <= 0 ||
              parseFloat(iCashAmount) > (user?.pointsBalance || 0)) && {
              opacity: 0.5,
            },
          ]}
          onPress={handleWithdrawTrigger}
          disabled={
            !iCashAmount ||
            parseFloat(iCashAmount) <= 0 ||
            parseFloat(iCashAmount) > (user?.pointsBalance || 0)
          }
        >
          <Text style={iCashActionsStyles.buyBtnText}>
            {!iCashAmount || parseFloat(iCashAmount) <= 0
              ? 'Enter Amount'
              : parseFloat(iCashAmount) > (user?.pointsBalance || 0)
              ? 'Insufficient Balance'
              : !hasPaymentMethod
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
      {/* Withdraw details or pay verification modal */}
      {step === 'details' ? (
        <>
          <Modal
            visible={showConfirmModal}
            animationType="slide"
            transparent={true}
          >
            <View style={iCashActionsStyles.modalOverlay}>
              <View style={iCashActionsStyles.bottomSheet}>
                <View style={iCashActionsStyles.modalHeader}>
                  <Text style={iCashActionsStyles.modalTitle}>
                    Confirm Withdrawal
                  </Text>
                  <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                    <Icon name="close" size={24} color={PRIMARY_COLOR_TINT} />
                  </TouchableOpacity>
                </View>
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
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <>
          <IcashPinOrFingerprintVerifyModal
            isVisible={showConfirmModal}
            onClose={() => setShowConfirmModal(false)}
            onSuccess={finalExecution}
            navigation={navigation}
          />
        </>
      )}
    </ScrollView>
  );
};