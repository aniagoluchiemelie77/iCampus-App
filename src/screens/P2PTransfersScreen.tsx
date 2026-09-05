
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { IcashPinOrFingerprintVerifyModal } from '../components/iCashPinOrFingerprintVerifyComponent';
import { CustomButton } from '../assets/components/AppUIComponents';
import { useAppSelector } from '../hooks/hooks';
import Animated, { ZoomIn, FadeOutDown } from 'react-native-reanimated';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import Toast from 'react-native-toast-message';
import { PageHeader } from '../components/PageHeader';
import { ITagCard } from '../components/iTag';
import { MyQRCodeSection } from '../components/MyQRCodeSection';
import { FeatureCard } from '../components/P2PFeatureCardComponent';
import { searchUsersByITag } from '../api/localGetApis';
import { executeP2PTransfer } from '../api/localPostApis';
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { OrderScannerModal } from '../components/OrderQRScannerModal';

interface ITagSearchResult {
  userId: string;
  username: string;
  isUser: boolean;
  isPremium: boolean;
  cardHolderName: string;
  cardNumber: string;
  tier: string;
  designOptions: {
    backgroundColor: string;
    backgroundImage: string;
    glassmorphismOpacity: number;
  };
}
export const AnimatedCardWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <Animated.View
      entering={ZoomIn.duration(400)}
      exiting={FadeOutDown}
      style={{ width: '100%', alignItems: 'center', overflow: 'hidden' }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.iTagContainer}
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
};
export const IcashP2PScreen = () => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user) || {};
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [step, setStep] = useState<'selection' | 'tagInput'>('selection');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<ITagSearchResult | null>(
    null,
  );
  const [recipientTag, setRecipientTag] = useState('');
  const [amount, setAmount] = useState('');

  const numericAmount = parseFloat(amount) || 0;
  const hasSufficientFunds = user?.pointsBalance! >= numericAmount;
  const isInputValid =
    numericAmount > 0 && recipientTag.length > 0 && searchResult;
  const isSendingToSelf = searchResult?.isUser === true;
  const canContinue = isInputValid && hasSufficientFunds && !isSendingToSelf;

  const getButtonText = () => {
    if (isSendingToSelf) return 'Cannot send to yourself';
    if (isLoading) return 'Processing...';
    if (numericAmount > (user.pointsBalance ?? 0))
      return 'Insufficient Balance';
    return 'Continue';
  };
  const handleSearch = async (tag: string) => {
    setIsSearching(true);
    setSearchResult(null);
    try {
      const data = await searchUsersByITag(tag);
      setSearchResult(data);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        console.log('User not found');
      } else {
        console.error('Search failed', error.message);
      }
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };
  const handleScanSuccess = async (scannedValue: string) => {
    setScannerVisible(false);
    const tag = scannedValue.includes(':')
      ? scannedValue.split(':').pop()
      : scannedValue;
    if (tag) {
      const cleanTag = tag.replace('@', '').trim();
      setRecipientTag(cleanTag);
      setActiveTab('send');
      setStep('tagInput');
      await handleSearch(cleanTag);
    }
  };
  const processFinalTransaction = async () => {
    setIsLoading(true);
    try {
      const result = await executeP2PTransfer({
        recipientId: searchResult!.userId,
        recipientiTagName: searchResult!.username,
        amount: parseFloat(amount),
        description: `Transfer to ${searchResult!.username}`,
      });
      if (result.success) {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'iCashSuccessScreen',
              params: {
                amount: parseFloat(amount),
                recipientUsername: searchResult!.username,
                type: 'p2p',
                amountPurchased: 0,
                amountPaid: 0,
                currency: 'iCash',
                payout: 0,
              },
            },
          ],
        });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Network Error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (canContinue) {
      setIsPinModalVisible(true);
    }
  };
  const handlePinSuccess = () => {
    setIsPinModalVisible(false);
    processFinalTransaction();
  };
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (recipientTag.length >= 3) {
        handleSearch(recipientTag);
      } else {
        setSearchResult(null);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [recipientTag]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <PageHeader title="iCash P2P Transfers" />
      <View
        style={[
          styles.tabWrapper,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'send' && styles.activeTab]}
          onPress={() => setActiveTab('send')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'send'
                ? { color: colors.primary }
                : { color: colors.text },
            ]}
          >
            Send
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'receive' && styles.activeTab]}
          onPress={() => setActiveTab('receive')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'receive'
                ? { color: colors.primary }
                : { color: colors.text },
            ]}
          >
            Receive
          </Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'send' ? (
        <>
          {step === 'selection' && (
            <View style={styles.cardDiv}>
              <FeatureCard
                title="Scan QR Code"
                sub="Scan to pay instantly"
                icon="qr-code"
                onPress={() => setScannerVisible(true)}
              />
              <FeatureCard
                title="Send via iTag"
                sub="Search @itagusername"
                icon="alternate-email"
                onPress={() => setStep('tagInput')}
              />
            </View>
          )}
          {step === 'tagInput' && (
            <View style={{ marginHorizontal: 15, marginVertical: 20, flex: 1 }}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Recipient iTag
              </Text>
              <View
                style={[styles.inputWrapper, { borderColor: colors.border }]}
              >
                <Text style={[styles.atSymbol, { color: colors.primary }]}>
                  @
                </Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Recipient's itag username"
                  value={recipientTag}
                  onChangeText={setRecipientTag}
                  autoCapitalize="none"
                  placeholderTextColor={colors.inputTextHolder}
                />
              </View>
              {isSearching && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
              {searchResult && (
                <AnimatedCardWrapper>
                  <ITagCard
                    iTagData={searchResult}
                    isPremium={searchResult.isPremium}
                    isOwner={searchResult.isUser}
                  />
                </AnimatedCardWrapper>
              )}
              {searchResult && (
                <>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.text, marginTop: 15 },
                    ]}
                  >
                    Amount (iCash)
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { borderColor: colors.border },
                    ]}
                  >
                    <MaterialIcons
                      name="diamond"
                      size={24}
                      color={colors.primary}
                      style={{ marginHorizontal: 7 }}
                    />
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="0.00"
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={setAmount}
                      placeholderTextColor={colors.inputTextHolder}
                    />
                  </View>
                  <CustomButton
                    title={getButtonText()}
                    style={[
                      styles.sendButton,
                      !canContinue && styles.disabledButton,
                      { backgroundColor: colors.btnColor },
                    ]}
                    onPress={handleContinue}
                    disabled={!canContinue}
                  />
                </>
              )}
            </View>
          )}
        </>
      ) : (
        <>
          <MyQRCodeSection itagusername={user.itagusername ?? ''} />
        </>
      )}
      <OrderScannerModal
        isVisible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onSuccess={handleScanSuccess}
        instructionText="Align recipient's iCash QR code within the frame"
      />
      <IcashPinOrFingerprintVerifyModal
        isVisible={isPinModalVisible}
        onClose={() => setIsPinModalVisible(false)}
        onSuccess={handlePinSuccess}
        title="Confirm Transaction"
        navigation={navigation}
      />
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    gap: 10,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flex: 1,
  },
  activeTab: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginVertical: 20,
    marginHorizontal: 15,
    gap: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    height: 50,
    width: '100%',
    borderWidth: 0.8,
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  resultContainer: {
    marginVertical: 20,
    alignItems: 'center',
    minHeight: 100, // Keeps layout stable
  },
  infoText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 10,
  },
  iTagContainer: {
    gap: 6,
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    position: 'relative',
  },
  closeScanner: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 20,
    borderRadius: 15,
    padding: 6,
  },
  cameraPlaceholder: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  atSymbol: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 7,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
  },
  sendButton: {
    paddingHorizontal: 15,
    marginTop: 15,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderRadius: 20,
    backgroundColor: 'transparent',
    position: 'absolute',
  },
  qrText: {
    marginVertical: 15,
    fontSize: 14,
    textAlign: 'center',
  },
});