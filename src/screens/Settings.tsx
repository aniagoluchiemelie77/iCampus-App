import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SettingItem } from '../components/SettingsItem';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRIMARY_COLOR_TINT } from '@components/Classroomcomponent';
import { PageHeader } from '../components/PageHeader.tsx';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DeviceInfo from 'react-native-device-info';
import { useNavigation } from '@react-navigation/native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPinReset } from '../api/localPostApis.ts';
import Rate, { AndroidMarket } from 'react-native-rate';
import { ICAMPUS_APPLE_ID } from '@env';
import { LogoutModal } from '../components/LogoutModal.tsx';
import { DeleteAccountModal } from '../components/DeleteAccountModal.tsx';
import { updateThemeState } from '../components/UserSlice.ts';
import { useAppSelector } from '../components/hooks';
import { useDispatch } from 'react-redux';
import { updateUserThemePreference } from '../api/localPutApis.ts';
import { useTheme } from '../context/ThemeContext';

const rnBiometrics = new ReactNativeBiometrics();

export const SectionHeader = ({ title }: { title: string }) => {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionHeader, { color: colors.text }]}>{title}</Text>
  );
};

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
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user);
  const dispatch = useDispatch();
  const deviceColorScheme = useColorScheme();
  const isCurrentlyDark =
    user.theme === 'dark' ||
    (user.theme === 'system' && deviceColorScheme === 'dark');
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
  const handleThemeToggle = async () => {
    const newTheme = isCurrentlyDark ? 'light' : 'dark';
    dispatch(updateThemeState(newTheme));
    try {
      const result = await updateUserThemePreference(newTheme);
      if (!result.success) {
        dispatch(updateThemeState(isCurrentlyDark ? 'dark' : 'light'));
        Toast.show({
          type: 'error',
          text1: 'Sync Connection Loss',
          text2: result.error,
        });
      }
    } catch (error) {
      console.error('Theme cloud sync error fallback executed:', error);
      dispatch(updateThemeState(isCurrentlyDark ? 'dark' : 'light'));
      Toast.show({
        type: 'error',
        text1: 'Sync Connection Loss',
        text2: 'Theme could not be saved to your account cloud.',
      });
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <PageHeader
          title="Settings"
          rightElement={
            <TouchableOpacity>
              <MaterialIcons
                name="help-outline-outlined"
                size={24}
                color={colors.primaryTint}
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
        <SectionHeader title="App Settings" />
        <View style={styles.group}>
          <SettingItem
            icon="palette-outlined"
            title="Theme"
            subtitle={
              user.theme === 'system'
                ? 'System Default'
                : isCurrentlyDark
                ? 'Dark Mode'
                : 'Light Mode'
            }
            toggle
            value={isCurrentlyDark}
            onPress={handleThemeToggle}
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
            icon="help-center-outlined"
            title="Frequently Asked Questions (FAQs)"
            onPress={() => navigation.navigate('FAQScreen')}
          />
        </View>
        <SectionHeader title="Spread the Word" />
        <View style={styles.group}>
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
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setLogoutModalVisible(true)}
        >
          <Text style={[styles.logoutText, { color: colors.primary }]}>
            Log Out
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.logoutButton,
            { backgroundColor: colors.btnColor, marginTop: 0 },
          ]}
          onPress={() => setDeleteModalVisible(true)}
        >
          <Text style={[styles.deleteText, { color: colors.btnTextColor }]}>
            Delete Account
          </Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.text }]}>
          App Version: {version} ({buildNumber})
        </Text>
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
    paddingHorizontal: 15,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    marginVertical: 15,
  },
  group: {
    borderBottomWidth: 0.5,
    borderColor: PRIMARY_COLOR_TINT,
  },
  logoutButton: {
    marginVertical: 20,
    paddingVertical: 15,
    borderRadius: 15,
    alignContent: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteText: {
    fontSize: 14,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 14,
  },
});
