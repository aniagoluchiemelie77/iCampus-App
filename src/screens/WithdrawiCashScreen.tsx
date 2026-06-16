import {iCashActionsStyles, PaymentMethodCard, CARD_WIDTH} from './BuyiCashScreen';
import { IcashPinOrFingerprintVerifyModal } from '../components/iCashPinOrFingerprintVerifyComponent.tsx';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import Toast from 'react-native-toast-message';
import { PageHeader } from '../components/PageHeader';
import { useRoute } from '@react-navigation/native';
import { fetchLiveRate } from '../utils/UserTransactionsHelpers.tsx';
import { UserBankOrCardDetails } from '../types/firebase';
import { getUserPaymentMethods } from '../api/localGetApis.ts';
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export const ICashWithdrawPage = ({ navigation }: any) => {
  const { colors } = useTheme();
  const route = useRoute();
  const user = useAppSelector(state => state.user);
  const [iCashAmount, setICashAmount] = useState('');
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [currencyData, setCurrencyData] = useState({
    rate: 1550,
    code: 'NGN',
    symbol: '₦',
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
          symbol: data.symbol,
        });
      } catch (error) {
        console.error('Failed to update rates:', error);
      }
    };
    getLiveRate();
  }, [user?.country]);
  useEffect(() => {
    let isMounted = true;
    const getLiveRate = async () => {
      const data = await fetchLiveRate(user?.country || 'Nigeria');
      if (isMounted)
        setCurrencyData({
          rate: data.rate,
          code: data.code,
          symbol: data.symbol,
        });
    };
    getLiveRate();
    return () => {
      isMounted = false;
    };
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
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'iCashSuccessScreen',
              params: {
                amount: iCashAmount,
                type: 'withdraw',
                payout: finalPayout,
                currency: currencyData.code,
                amountPurchased: 0,
                amountPaid: 0,
                recipientUsername: '',
              },
            },
          ],
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Transaction Error',
          text2: data.message || 'Something went wrong, please retry',
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
  const numericICash = parseFloat(iCashAmount) || 0;
  const localCurrencyEquivalent = (
    numericICash *
    EXCHANGE_RATE_USD *
    currencyData.rate
  ).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const isButtonDisabled = useMemo(() => {
    const amount = parseFloat(iCashAmount) || 0;
    return (
      amount <= 0 || amount > (user?.pointsBalance || 0) || !selectedMethod
    );
  }, [iCashAmount, user?.pointsBalance, selectedMethod]);
  const withdrawalMethods = savedMethods.filter(type => type.method === 'bank');
  return (
    <ScrollView
      style={[
        iCashActionsStyles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <PageHeader title="Withdraw iCash" />
      <View
        style={[
          iCashActionsStyles.bodyContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <Text style={[iCashActionsStyles.label, { color: colors.text }]}>
          Enter iCash to Withdraw
        </Text>
        <View style={iCashActionsStyles.inputContainer}>
          <MaterialIcons
            name="diamond-outlined"
            size={20}
            color={colors.primary}
            style={{ marginRight: 5 }}
          />
          <TextInput
            style={[iCashActionsStyles.inputBorderless, { color: colors.text }]}
            placeholder="0.00"
            keyboardType="numeric"
            value={iCashAmount}
            onChangeText={setICashAmount}
            placeholderTextColor={colors.inputTextHolder}
          />
        </View>
        <View style={iCashActionsStyles.exchangeRow}>
          <Text
            style={[iCashActionsStyles.exchangeText, { color: colors.text }]}
          >
            Exchange Rate
          </Text>
          <Text
            style={[
              iCashActionsStyles.exchangeValue,
              { color: colors.primary },
            ]}
          >
            1 iCash ≈ {currencyData.symbol}{' '}
            {(EXCHANGE_RATE_USD * currencyData.rate).toFixed(2)}
          </Text>
        </View>
        <Text style={[iCashActionsStyles.resultLabel, { color: colors.text }]}>
          You are withdrawing:
        </Text>
        <View style={iCashActionsStyles.resultDiv}>
          <Text
            style={[iCashActionsStyles.currencyPrefix, { color: colors.text }]}
          >
            {currencyData.symbol}
          </Text>
          <Text
            style={[iCashActionsStyles.resultValue, { color: colors.success }]}
          >
            {localCurrencyEquivalent}
          </Text>
        </View>
        {!hasPaymentMethod && (
          <View style={iCashActionsStyles.warningBox}>
            <MaterialIcons
              name="info-outlined"
              size={20}
              color={colors.primary}
            />
            <Text
              style={[
                iCashActionsStyles.warningText,
                { color: colors.primary },
              ]}
            >
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
              colors={colors}
            />
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[
            iCashActionsStyles.buyBtn,
            { backgroundColor: colors.btnColor },
            (!iCashAmount ||
              parseFloat(iCashAmount) <= 0 ||
              parseFloat(iCashAmount) > (user?.pointsBalance || 0)) && {
              opacity: 0.5,
            },
          ]}
          onPress={handleWithdrawTrigger}
          disabled={isButtonDisabled}
        >
          <Text
            style={[
              iCashActionsStyles.buyBtnText,
              { color: colors.btnTextColor },
            ]}
          >
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
      <AddPaymentModal
        visible={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        currencyData={currencyData}
        user={user}
        mode="withdraw"
      />
      {step === 'details' ? (
        <>
          <Modal
            visible={showConfirmModal}
            animationType="slide"
            transparent={true}
          >
            <View style={iCashActionsStyles.modalOverlay}>
              <View
                style={[
                  iCashActionsStyles.bottomSheet,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <View style={iCashActionsStyles.modalHeader}>
                  <Text
                    style={[
                      iCashActionsStyles.modalTitle,
                      { color: colors.textDarker },
                    ]}
                  >
                    Confirm Withdrawal
                  </Text>
                  <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
                    <MaterialIcons
                      name="cancel"
                      size={24}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
                <View style={iCashActionsStyles.detailRow}>
                  <Text
                    style={[
                      iCashActionsStyles.detailRowText,
                      { color: colors.text },
                    ]}
                  >
                    Withdraw Amount:
                  </Text>
                  <CurrencyDisplay value={+iCashAmount} size="medium" />
                </View>
                <View style={iCashActionsStyles.detailRow}>
                  <Text
                    style={[
                      iCashActionsStyles.detailRowText,
                      { color: colors.text },
                    ]}
                  >
                    Charges (1%):
                  </Text>
                  <Text
                    style={[
                      iCashActionsStyles.detailRowText,
                      { color: colors.text },
                    ]}
                  >
                    {' '}
                    - {currencyData.symbol}
                    {fee.toFixed(2)}
                  </Text>
                </View>
                <View style={iCashActionsStyles.detailRow}>
                  <Text
                    style={[
                      iCashActionsStyles.totalText,
                      { color: colors.text },
                    ]}
                  >
                    Amount you will receive:
                  </Text>
                  <Text
                    style={[
                      iCashActionsStyles.totalText,
                      { color: colors.text },
                    ]}
                  >
                    {currencyData.symbol} {finalPayout.toFixed(2)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    iCashActionsStyles.payBtn,
                    { backgroundColor: colors.btnColor },
                  ]}
                  onPress={() => setStep('pin')}
                >
                  <Text
                    style={[
                      iCashActionsStyles.payBtnText,
                      { color: colors.btnTextColor },
                    ]}
                  >
                    Pay
                  </Text>
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