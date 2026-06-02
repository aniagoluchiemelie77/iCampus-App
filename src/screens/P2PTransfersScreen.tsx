
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { IcashPinOrFingerprintVerifyModal } from '../components/iCashPinOrFingerprintVerifyComponent';
import { Camera, useFrameProcessor } from 'react-native-vision-camera';
import { useCameraDevice } from 'react-native-vision-camera';
import { scanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner';
import { useAppSelector } from '../components/hooks';
import Animated, { ZoomIn, FadeOutDown } from 'react-native-reanimated';
// @ts-ignore: runOnJS is deprecated in Reanimated but stable for Vision Camera
import { runOnJS } from 'react-native-reanimated';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '@components/Classroomcomponent';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { PageHeader } from '../components/PageHeader';
import { ITagCard } from '../components/iTag';
import { MyQRCodeSection } from '../components/MyQRCodeSection';
import { FeatureCard } from '../components/P2PFeatureCardComponent';
import { searchUsersByITag } from '../api/localGetApis';
import { executeP2PTransfer } from '../api/localPostApis';

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
  const user = useAppSelector(state => state.user);
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [step, setStep] = useState<'selection' | 'tagInput'>('selection');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = React.useState(false);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<ITagSearchResult | null>(
    null,
  );

  // Form States
  const [recipientTag, setRecipientTag] = useState('');
  const [amount, setAmount] = useState('');
  // Inside your IcashP2PScreen component
  const numericAmount = parseFloat(amount) || 0;
  const hasSufficientFunds = user?.pointsBalance! >= numericAmount;
  const isInputValid =
    numericAmount > 0 && recipientTag.length > 0 && searchResult;
  const isSendingToSelf = searchResult?.isUser === true; // Check the new backend flag

  // The button is only enabled if all these are true
  const canContinue = isInputValid && hasSufficientFunds && !isSendingToSelf;

  // Determine the button label dynamically
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
  const handleScanSuccess = async (data: string) => {
    setScannerVisible(false);
    const tag = data.includes(':') ? data.split(':').pop() : data;
    if (tag) {
      setRecipientTag(tag);
      setActiveTab('send');
      await handleSearch(tag);
    }
  };
  const device = useCameraDevice('back');
  React.useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // 3. Define the Frame Processor to scan barcodes
  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      const detectedBarcodes = scanBarcodes(frame, [BarcodeFormat.QR_CODE]);

      if (detectedBarcodes.length > 0) {
        const data = detectedBarcodes[0].displayValue;
        if (data) {
          console.log('Scanned QR:', data);
          runOnJS(handleScanSuccess)(data);
        }
      }
    },
    [handleScanSuccess],
  );
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
        setSearchResult(null); // Clear result if input is too short
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [recipientTag]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
      <PageHeader title="iCash P2P Transfers" />
      <View style={styles.tabWrapper}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'send' && styles.activeTab]}
          onPress={() => setActiveTab('send')}
        >
          <Text style={styles.tabText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'receive' && styles.activeTab]}
          onPress={() => setActiveTab('receive')}
        >
          <Text style={styles.tabText}>Receive</Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'send' ? (
        <>
          {step === 'selection' && (
            <View style={{ marginTop: 20 }}>
              <FeatureCard
                title="Scan QR Code"
                sub="Scan to pay instantly"
                icon="qr-code-outlined"
                onPress={() => setScannerVisible(true)}
              />
              \
              <FeatureCard
                title="Send via iTag"
                sub="Search @username"
                icon="alternate-email-outlined"
                onPress={() => setStep('tagInput')}
              />
            </View>
          )}
          {step === 'tagInput' && (
            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>Recipient iTag</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.atSymbol}>@</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="username"
                  value={recipientTag}
                  onChangeText={setRecipientTag}
                  autoCapitalize="none"
                />
              </View>
              {isSearching && (
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
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
                  <Text style={styles.sectionLabel}>Amount (iCash)</Text>
                  <View style={styles.inputWrapper}>
                    <Icon
                      name="diamond"
                      size={24}
                      color={PRIMARY_COLOR}
                      style={{ marginRight: 5 }}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="0.00"
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={setAmount}
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      !canContinue && styles.disabledButton,
                    ]}
                    onPress={handleContinue}
                    disabled={!canContinue}
                  >
                    <Text style={styles.sendButtonText}>{getButtonText()}</Text>
                  </TouchableOpacity>
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
      <Modal visible={scannerVisible} animationType="slide">
        <View style={styles.fullScreenModal}>
          <View style={styles.cameraPlaceholder}>
            {device != null && hasPermission ? (
              <>
                <Camera
                  style={StyleSheet.absoluteFill}
                  device={device}
                  isActive={scannerVisible}
                  frameProcessor={frameProcessor}
                />
                {/* Visual Frame Overlay */}
                <View style={styles.scanFrame} />
              </>
            ) : (
              <Text style={{ color: 'white' }}>
                {hasPermission ? 'Initializing Camera...' : 'No Camera Access'}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.closeScanner}
            onPress={() => setScannerVisible(false)}
          >
            <Icon name="close" size={30} color="#FFF" />
          </TouchableOpacity>

          <Text
            style={{
              color: '#FFF',
              position: 'absolute',
              bottom: 100,
              textAlign: 'center',
            }}
          >
            Align QR code within the frame
          </Text>
        </View>
      </Modal>
      <IcashPinOrFingerprintVerifyModal
        isVisible={isPinModalVisible}
        onClose={() => setIsPinModalVisible(false)}
        onSuccess={handlePinSuccess} // Runs the final transaction
        title="Confirm Transaction"
        navigation={navigation}
      />
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // --- Tab Switcher Styles ---
  tabWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fadccc',
    margin: 20,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  activeTab: {
    backgroundColor: PRIMARY_COLOR,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  activeTabText: {
    color: '#fff',
  },

  // --- Feature Card Styles ---
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    // Standard iCampus card shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR + '15', // 15% opacity version of primary
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 13,
    color: '#64748B',
  },
  lockedCard: {
    opacity: 0.6,
    backgroundColor: '#F8FAFC',
  },

  // --- Receive Section (QR & NFC) ---
  qrSection: {
    alignItems: 'center',
    padding: 30,
    marginTop: 10,
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    // Extra pop for the QR code
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  iTagText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    letterSpacing: 1,
  },
  nfcSection: {
    margin: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#F0F9FF', // Light blue for Premium feel
    borderWidth: 1,
    borderColor: '#B9E6FE',
    alignItems: 'center',
  },
  nfcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
    gap: 10,
  },
  nfcText: {
    color: '#0369A1',
    fontWeight: '600',
  },
  inputSection: {
    padding: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fadccc',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
    marginTop: 10,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeScanner: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 5,
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
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    marginRight: 5,
  },
  textInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#2222',
  },
  sendButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  sendButtonText: {
    color: '#FFF',
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
});