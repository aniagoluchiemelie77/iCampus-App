import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Linking,
} from 'react-native';
import { SettingItem } from '../components/SettingsItem';
import Toast from 'react-native-toast-message';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import DeviceInfo from 'react-native-device-info';
import { useNavigation } from '@react-navigation/native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestPinReset } from '../api/localPostApis.ts';
import Rate, { AndroidMarket } from 'react-native-rate';
import { ICAMPUS_APPLE_ID } from '@env';
import { CustomButton } from '../assets/components/AppUIComponents';
import { LogoutModal } from '../components/LogoutModal.tsx';
import { DeleteAccountModal } from '../components/DeleteAccountModal.tsx';
import { updateThemeState } from '../context/UserSlice.ts';
import { useAppSelector } from '../hooks/hooks.ts';
import { useDispatch } from 'react-redux';
import { updateUserThemePreference } from '../api/localPutApis.ts';
import { useTheme } from '../context/ThemeContext';
import { IconOutline } from '@ant-design/icons-react-native';
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
  const user = useAppSelector(state => state.user) || {};
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
    GooglePackageName: 'com.icampus',
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
  const handlePinReset = useCallback(async () => {
    if (isResetting) return;
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
  }, [isResetting, navigation]);

  const handleThemeToggle = async () => {
    const newTheme = isCurrentlyDark ? 'light' : 'dark';
    dispatch(updateThemeState(newTheme));
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.theme = newTheme;
        await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
      }
      const result = await updateUserThemePreference(newTheme);
      if (!result.success) {
        throw new Error(result.error || 'Failed to sync');
      }
    } catch (error) {
      console.error('Theme sync error, rolling back:', error);
      const previousTheme = user.theme;
      dispatch(updateThemeState(previousTheme));

      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.theme = previousTheme;
        await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
      }

      Toast.show({
        type: 'error',
        text1: 'Sync Connection Loss',
        text2: 'Theme could not be saved to your account cloud.',
      });
    }
  };
  const throttledReset = useMemo(
    () => throttle(handlePinReset, 2000),
    [handlePinReset],
  );
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Settings" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ marginHorizontal: 15, paddingBottom: 40 }}
      >
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
            icon="verified"
            title="Subscription"
            subtitle="Manage your Premium plan"
            onPress={() => navigation.navigate('Subscription')}
          />
          <SettingItem
            icon="fingerprint"
            title="Secure iCash Transactions"
            subtitle={`Use ${biometryType} for iCash operations`}
            toggle
            value={biometricsEnabled}
            onPress={toggleBiometrics}
            onValueChange={toggleBiometrics}
          />
          <SettingItem
            icon="lock-reset"
            title="Reset iCashPin"
            subtitle={
              isResetting ? 'Requesting...' : 'Security for your campus wallet'
            }
            onPress={throttledReset}
          />
          <SettingItem
            icon="lock-reset"
            title="Reset Login Password"
            subtitle="Manage your iCampus login password"
            onPress={() => navigation.navigate('ResetPasswordScreen')}
          />
          <SettingItem
            icon="email"
            title="Emails"
            subtitle="Manage your iCampus emails"
            onPress={() => navigation.navigate('EmailsScreen')}
          />
          <SettingItem
            icon="smartphone"
            title="Phone Numbers"
            subtitle="Manage your phone numbers"
            onPress={() => navigation.navigate('PhoneScreen')}
          />
        </View>
        <SectionHeader title="App Settings" />
        <View style={styles.group}>
          <SettingItem
            icon="palette"
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
            onValueChange={handleThemeToggle}
          />
          <SettingItem
            icon="auto-awesome"
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
            icon="notifications-active"
            title="Notifications"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
        </View>
        <SectionHeader title="Support" />
        <View style={styles.group}>
          <SettingItem
            icon="help-center"
            title="Help Center"
            onPress={() => {
              navigation.navigate('Assistant', {
                contextType: 'support',
                contextData: { title: 'Customer Support' },
                assistantTitle: 'Support AI',
                placeholder: 'Describe your issue...',
                initialMessage:
                  'Hi there! I am your Support Assistant. How can I help you with your account today?',
              });
            }}
          />
          <SettingItem
            icon="support-agent"
            title="Contact Us"
            subtitle="Get in touch with our support team"
            expandable={true}
            expandedContent={
              <>
                <TouchableOpacity
                  onPress={() => Linking.openURL('mailto:support@example.com')}
                  style={styles.socialButton}
                >
                  <IconOutline name="mail" size={22} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL('https://twitter.com/yourhandle')
                  }
                  style={styles.socialButton}
                >
                  <IconOutline
                    name="twitter"
                    size={22}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL('https://linkedin.com/company/yourcompany')
                  }
                  style={styles.socialButton}
                >
                  <IconOutline
                    name="linkedin"
                    size={22}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL('https://instagram.com/yourhandle')
                  }
                  style={styles.socialButton}
                >
                  <IconOutline
                    name="instagram"
                    size={22}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </>
            }
          />
          <SettingItem
            icon="help-center"
            title="Frequently Asked Questions (FAQs)"
            onPress={() => navigation.navigate('FAQScreen')}
          />
        </View>
        <SectionHeader title="Partner With Us" />
        <View style={styles.group}>
          <SettingItem
            icon="storefront"
            title="Register a Drop-Off (Pickup) Station"
            subtitle="Register your business location as an iCampus hub"
            onPress={() => navigation.navigate('RegisterStation')}
          />
        </View>
        <SectionHeader title="Spread the Word" />
        <View style={styles.group}>
          <SettingItem
            icon="star-rate"
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
          style={[
            styles.logoutButton,
            {
              marginTop: 20,
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
            },
          ]}
          onPress={() => setLogoutModalVisible(true)}
        >
          <Text style={[styles.logoutText, { color: colors.primary }]}>
            Log Out
          </Text>
        </TouchableOpacity>
        <CustomButton
          title="Delete Account"
          style={[
            styles.logoutButton,
            { backgroundColor: colors.btnColor, marginTop: 0 },
          ]}
          onPress={() => setDeleteModalVisible(true)}
        />

        <Text style={[styles.versionText, { color: colors.text }]}>
          App Version: {version}
          {buildNumber}
        </Text>
      </ScrollView>
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
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 15,
    marginBottom: 20,
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
    fontSize: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 10,
    marginRight: 15,
  },
});
