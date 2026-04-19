
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
import {
  Camera,
  useCameraDevices,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { scanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner';
import Animated, { ScaleInCenter, FadeOutDown } from 'react-native-reanimated';
import { baseUrl } from '../components/HomeScreenComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '@components/Classroomcomponent';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
//import Toast from 'react-native-toast-message';
//import toastConfig from '@components/ToastConfig';
import { PageHeader } from '../components/PageHeader';
import { getP2PPrivileges } from '../utils/UserTransactionsHelpers';
import { ITagCard } from '../components/iTag';
import { MyQRCodeSection } from '../components/MyQRCodeSection';
import {FeatureCard} from '../components/P2PFeatureCardComponent';

export const AnimatedCardWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <Animated.View
      entering={ScaleInCenter.springify().duration(400)}
      exiting={FadeOutDown}
      style={{ width: '100%', alignItems: 'center' }}
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
export const IcashP2PScreen = ({ user }: { user: any }) => {
  const privileges = getP2PPrivileges(user.plan);
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [step, setStep] = useState<'selection' | 'tagInput'>('selection');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  //Search States
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);

  // Form States
  const [recipientTag, setRecipientTag] = useState('');
  const [amount, setAmount] = useState('');
  const handleSearch = async (tag: string) => {
    setIsSearching(true);
    setSearchResult(null);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${baseUrl}user/iTag/search/${tag}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.ok) {
        setSearchResult(data);
      } else {
        console.log('Search error:', data.message);
        setSearchResult(null);
      }
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
                icon="qrcode-scan"
                onPress={() => setScannerVisible(true)}
              />\

              <FeatureCard
                title="Send via iTag"
                sub="Search @username"
                icon="at"
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
              {searchResult > 0 && (
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
                    <Icon name="diamond" size={20} color={PRIMARY_COLOR} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="0.00"
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={setAmount}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={() => {
                      // This is where you'd trigger your Pin modal
                      console.log('Sending to', recipientTag);
                    }}
                  >
                    <Text style={styles.sendButtonText}>Continue</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
          <View style={styles.cameraPlaceholder}>
            {device != null && hasPermission ? (
              <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={scannerVisible}
                frameProcessor={frameProcessor}
                frameProcessorFps={5}
              />
            ) : (
              <Text style={{ color: 'white' }}>No Camera Access</Text>
            )}
          </View>
        </>
      ) : (
        <>
          <MyQRCodeSection itagusername={user.itagusername} />
        </>
      )}

      {/* The Visual Frame Overlay */}
      <View style={styles.scanFrame} />
      <Modal visible={scannerVisible} animationType="slide">
        <View style={styles.fullScreenModal}>
          <TouchableOpacity
            style={styles.closeScanner}
            onPress={() => setScannerVisible(false)}
          >
            <Icon name="close" size={30} color="#FFF" />
          </TouchableOpacity>

          <Text style={{ color: '#FFF', position: 'absolute', top: 100 }}>
            Align QR code within the frame
          </Text>

          {/* Replace this View with your <Camera /> or <QRCodeScanner /> */}
          <View style={styles.cameraPlaceholder}>
            <View style={styles.scanFrame} />
          </View>
        </View>
      </Modal>
      <UpgradeModal
        visible={upgradeVisible}
        onClose={() => setUpgradeVisible(false)}
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
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#64748B',
    marginBottom: 8,
    marginTop: 15,
    marginHorizontal: 20,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeScanner: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 5,
  },
  cameraPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  atSymbol: {
    fontSize: 18,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    marginRight: 5,
  },
  textInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1E293B',
  },
  sendButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});