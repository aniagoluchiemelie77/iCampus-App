import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SettingItem } from '../components/SettingsItem';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRIMARY_COLOR_TINT } from '@components/Classroomcomponent';
import { PageHeader } from '../components/PageHeader.tsx';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR } from 'assets/styles/colors';
import DeviceInfo from 'react-native-device-info';
import { useNavigation } from '@react-navigation/native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPinReset } from '../api/localPostApis.ts';
import Rate, { AndroidMarket } from 'react-native-rate';
import { ICAMPUS_APPLE_ID } from '@env';
import { LogoutModal } from '../components/LogoutModal.tsx';
import { DeleteAccountModal } from '../components/DeleteAccountModal.tsx';

const rnBiometrics = new ReactNativeBiometrics();

export const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

export const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  return function (this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const Settings = () => {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const navigation = useNavigation<any>();
  const [isResetting, setIsResetting] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = React.useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [biometryType, setBiometryType] = useState<string>('Biometrics');
  const version = DeviceInfo.getVersion();
  const buildNumber = DeviceInfo.getBuildNumber();
  const options = {
    AppleAppID: ICAMPUS_APPLE_ID,
    GooglePackageName: 'com.useicampus.app',
    preferredAndroidMarket: AndroidMarket.Google,
    preferInApp: true,
    openAppStoreIfInAppFails: true,
  };
  const toggleBiometrics = async () => {
    if (!biometricsEnabled) {
      const { available, biometryType: detectedType } =
        await rnBiometrics.isSensorAvailable();
      if (available) {
        const hardwareLabel = detectedType === 'FaceID' ? 'FaceID' : 'TouchID';
        const { success } = await rnBiometrics.simplePrompt({
          promptMessage: `Confirm ${hardwareLabel} to enable`,
        });
        if (success) {
          await AsyncStorage.setItem('biometrics_enabled', 'true');
          setBiometricsEnabled(true);
          setBiometryType(hardwareLabel);
          Toast.show({ type: 'success', text2: `${hardwareLabel} Enabled` });
        }
      } else {
        Toast.show({
          type: 'error',
          text2: 'Biometrics not supported on this device',
        });
      }
    } else {
      await AsyncStorage.removeItem('biometrics_enabled');
      setBiometricsEnabled(false);
      Toast.show({ type: 'info', text2: 'Biometrics Disabled' });
    }
  };
  const handlePinReset = async () => {
    if (isResetting) return; // Prevent overlapping execution
    setIsResetting(true);
    try {
      const response = await requestPinReset();
      if (response.success) {
        navigation.navigate('ICashResetPin');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsResetting(false);
    }
  };
  const throttledReset = throttle(handlePinReset, 2000);
  useEffect(() => {
    const checkStatus = async () => {
      const val = await AsyncStorage.getItem('biometrics_enabled');
      setBiometricsEnabled(val === 'true');
    };
    checkStatus();
  }, []);
  useEffect(() => {
    const checkHardware = async () => {
      const { available, biometryType: type } =
        await rnBiometrics.isSensorAvailable();
      if (available) {
        if (type === BiometryTypes.FaceID) setBiometryType('FaceID');
        else if (type === BiometryTypes.TouchID) setBiometryType('TouchID');
        else setBiometryType('Biometrics');
      }
    };
    checkHardware();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <PageHeader
          title="Settings"
          rightElement={
            <TouchableOpacity>
              <MaterialIcons
                name="help-outline-outlined"
                size={24}
                color={PRIMARY_COLOR_TINT}
              />
            </TouchableOpacity>
          }
        />
        <SectionHeader title="Account & Security" />
        <View style={styles.group}>
          <SettingItem
            icon="devices"
            title="Linked Devices"
            subtitle="Manage where you're logged in"
            onPress={() => navigation.navigate('LinkedDevicesScreen')}
          />
          <SettingItem
            icon="block"
            title="Blocked Users"
            onPress={() => navigation.navigate('BlockedUsers')}
          />
          <SettingItem
            icon="verified-outlined"
            title="Subscription"
            subtitle="Manage your Premium plan"
            onPress={() => navigation.navigate('Subscription')}
          />
          <SettingItem
            icon="fingerprint-outlined"
            title="Biometric Login"
            subtitle={`Use ${biometryType} to secure your account`}
            toggle
            value={biometricsEnabled}
            onPress={toggleBiometrics}
          />
          <SettingItem
            icon="lock-reset-outlined"
            title="Reset iCashPin"
            subtitle={
              isResetting ? 'Requesting...' : 'Security for your campus wallet'
            }
            onPress={throttledReset}
          />
          <SettingItem
            icon="lock-reset-outlined"
            title="Reset Login Password"
            subtitle="Manage your iCampus login password"
            onPress={() => navigation.navigate('ResetPasswordScreen')}
          />
          <SettingItem
            icon="email-outlined"
            title="Emails"
            subtitle="Manage your iCampus emails"
            onPress={() => navigation.navigate('EmailsScreen')}
          />
          <SettingItem
            icon="smartphone-outlined"
            title="Phone Numbers"
            subtitle="Manage your phone numbers"
            onPress={() => navigation.navigate('PhoneScreen')}
          />
        </View>

        {/* App Settings */}
        <SectionHeader title="App Settings" />
        <View style={styles.group}>
          <SettingItem
            icon="palette-outlined"
            title="Theme"
            subtitle={isDarkMode ? 'Dark Mode' : 'Light Mode'}
            toggle
            value={isDarkMode}
            onPress={() => setIsDarkMode(!isDarkMode)}
          />
          <SettingItem
            icon="auto-awesome-outlined"
            title="iAssistant"
            subtitle="Your iCampus AI assistant"
            onPress={() =>
              navigation.navigate('Assistant', {
                contextType: 'general',
                contextData: {},
                initialMessage:
                  "Hi! I'm your iAssistant. Having trouble with your account or want to know how iCampus works?",
              })
            }
          />
          <SettingItem
            icon="notifications-active-outlined"
            title="Notifications"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
        </View>

        {/* Support & Legal */}
        <SectionHeader title="Support" />
        <View style={styles.group}>
          <SettingItem
            icon="help-center-outlined"
            title="Help Center"
            onPress={() => {}}
          />
          <SettingItem
            icon="alternate-email-outlined"
            title="Contact Us"
            onPress={() => {}}
          />
          <SettingItem
            icon="info-outline"
            title="About iCampus"
            onPress={() => {}}
          />
        </View>

        {/* Growth & Feedback */}
        <SectionHeader title="Spread the Word" />
        <View style={styles.group}>
          <SettingItem
            icon="campaign-outlined"
            title="Refer a Friend"
            subtitle="Get iCampus credits"
            onPress={() => navigation.navigate('ReferralScreen')}
          />
          <SettingItem
            icon="star-rate-outlined"
            title="Rate iCampus"
            subtitle="Let us know how we're doing"
            onPress={() => {
              Rate.rate(options, (success, errorMessage) => {
                if (success) {
                  console.log('Rating dialog opened');
                }
                if (errorMessage) {
                  console.error('Error rating:', errorMessage);
                }
              });
            }}
          />
        </View>

        {/* Danger Zone */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setLogoutModalVisible(true)}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setDeleteModalVisible(true)}
        >
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>
          App Version: {version} ({buildNumber})
        </Text>
        <Toast config={toastConfig} />
        {/* Modals */}
        <LogoutModal
          visible={isLogoutModalVisible}
          onClose={() => setLogoutModalVisible(false)}
          navigation={navigation}
        />
        <DeleteAccountModal
          visible={isDeleteModalVisible}
          onClose={() => setDeleteModalVisible(false)}
          navigation={navigation}
        />
      </ScrollView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY_COLOR_TINT,
    textTransform: 'capitalize',
    marginLeft: 15,
    marginVertical: 13,
  },
  group: {
    backgroundColor: '#fadccc',
    borderBottomWidth: 0.5,
    borderColor: PRIMARY_COLOR_TINT,
  },
  logoutButton: {
    marginTop: 30,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 15,
    alignContent: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteText: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    marginTop: 10,
    backgroundColor: '#fadccc',
    paddingVertical: 15,
    alignContent: 'center',
  },
  versionText: {
    textAlign: 'center',
    color: PRIMARY_COLOR_TINT,
    fontSize: 12,
    marginVertical: 20,
  },
});
