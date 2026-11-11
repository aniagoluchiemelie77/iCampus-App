import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SettingItem } from '../components/SettingsItem';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import DeviceInfo from 'react-native-device-info';
import { useNavigation } from '@react-navigation/native';
import Rate, { AndroidMarket } from 'react-native-rate';
import { ICAMPUS_APPLE_ID } from '../config/environment';
import { CustomButton } from '../assets/components/AppUIComponents';
import { LogoutModal } from '../components/LogoutModal.tsx';
import { DeleteAccountModal } from '../components/DeleteAccountModal.tsx';
import { useAppSelector } from '../hooks/hooks.ts';
import { useThemeToggle } from '../hooks/useThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { IconOutline } from '@ant-design/icons-react-native';
import { canManageSubscriptions } from '../utils/subscriptionAccess';
import { centeredColumn } from '../utils/layout';

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
  const { isDark: isCurrentlyDark, toggleTheme: handleThemeToggle } =
    useThemeToggle();
  const navigation = useNavigation<any>();
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const readableVersion = DeviceInfo.getReadableVersion();
  const options = {
    AppleAppID: ICAMPUS_APPLE_ID,
    GooglePackageName: 'com.icampus',
    preferredAndroidMarket: AndroidMarket.Google,
    preferInApp: true,
    openAppStoreIfInAppFails: true,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Settings" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ paddingHorizontal: 15, paddingBottom: 40 }, centeredColumn()]}
      >
        <SectionHeader title="Account & Security" />
        <View style={styles.group}>
          <SettingItem
            icon="devices"
            title="Linked Devices"
            subtitle="Manage where you're logged in"
            onPress={() => navigation.navigate('LinkedDevicesScreen')}
          />
          {canManageSubscriptions(user) && <SettingItem
            icon="verified"
            title="Subscription"
            subtitle="Manage your Premium plan"
            onPress={() => navigation.navigate('Subscription')}
          />}
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
          App Version: {readableVersion}
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
