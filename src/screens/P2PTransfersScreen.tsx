
import React, 
{ useState, 
    //useEffect, 
    //useCallback, 
    //useRef 
} from 'react';
import {
  View,
  Text,
  //TextInput,
  //ActivityIndicator,
  //Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  //Animated,
  //Pressable
} from 'react-native';
//import { baseUrl } from '../components/HomeScreenComponents';
//import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PRIMARY_COLOR,
} from '@components/Classroomcomponent';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
//import Toast from 'react-native-toast-message';
//import toastConfig from '@components/ToastConfig';
import { PageHeader } from '../components/PageHeader';
//import ReactNativeBiometrics from 'react-native-biometrics';
import { getP2PPrivileges } from '../utils/UserTransactionsHelpers';

export const IcashP2PScreen = ({ user }: { user: any }) => {
  const privileges = getP2PPrivileges(user.plan);
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <PageHeader title="iCash P2P Transfers" />
      {/* TIERED TAB SELECTOR */}
      <View style={styles.tabWrapper}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'send' && styles.activeTab]}
          onPress={() => setActiveTab('send')}
        >
          <Text style={styles.tabText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.card, !privileges.hasITags && styles.lockedCard]}
          disabled={!privileges.hasITags}
        >
          <View style={styles.iconContainer}>
            <Icon name="at-circle" size={24} color={PRIMARY_COLOR} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Send to iTag</Text>
            <Text style={styles.cardSub}>Transfer using @username</Text>
          </View>
          {!privileges.hasITags && (
            <Icon name="lock-closed" size={18} color="#64748B" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'receive' && styles.activeTab]}
          onPress={() => {
            if (privileges.canReceive) {
              setActiveTab('receive');
            } else {
              showUpgradePrompt('Pro');
            }
          }}
        >
          {!privileges.canReceive && (
            <Icon name="lock-closed" size={14} color="#999" />
          )}
          <Text
            style={[
              styles.tabText,
              !privileges.canReceive && { color: '#999' },
            ]}
          >
            Receive
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {activeTab === 'send' ? (
          <View>
            {/* 1. SCANNER (Visible to all) */}
            <FeatureCard
              title="Scan QR Code"
              sub="Scan to pay instantly"
              icon="qrcode-scan"
              onPress={() => navigation.navigate('Scanner')}
            />

            <FeatureCard
              title="Send via iTag"
              sub="Search @username"
              icon="at"
              locked={!privileges.hasITags}
              onPress={() => {
                if (privileges.hasITags) {
                  navigation.navigate('ITagSearch');
                } else {
                  setUpgradeModalVisible(true); // Open your pricing modal
                }
              }}
            />
          </View>
        ) : (
          <>
            <MyQRCodeSection user={user} />
          </>
        )}
      </ScrollView>
    </View>
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
    backgroundColor: '#F1F5F9', // Light Slate
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
    backgroundColor: '#FFFFFF',
    // Soft shadow for the active tab look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: PRIMARY_COLOR,
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
  }
});