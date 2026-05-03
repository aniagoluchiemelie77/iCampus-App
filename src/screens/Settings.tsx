import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SettingItem } from '../components/SettingsItem';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRIMARY_COLOR_TINT } from '@components/Classroomcomponent';
import { PageHeader } from '../components/PageHeader.tsx';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR } from 'assets/styles/colors';
import { useAppSelector } from '@components/hooks.ts';
import DeviceInfo from 'react-native-device-info';
import { useNavigation } from '@react-navigation/native';

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

export const Settings = () => {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const user = useAppSelector(state => state.user);
  const navigation = useNavigation<any>();
  const [biometricsEnabled, setBiometricsEnabled] = React.useState(
    user.isVerified,
  );
  const version = DeviceInfo.getVersion();
  const buildNumber = DeviceInfo.getBuildNumber();

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

        {/* Account Section */}
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
            subtitle="FaceID or Fingerprint"
            toggle
            value={biometricsEnabled}
            onPress={() => setBiometricsEnabled(!biometricsEnabled)}
          />
          <SettingItem
            icon="lock-reset-outlined"
            title="Reset iCashPin"
            subtitle="Security for your campus wallet"
            onPress={() => {}}
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
            subtitle="AI Preferences & Voice"
            onPress={() => {}}
          />
          <SettingItem
            icon="notifications-active-outlined"
            title="Notifications"
            onPress={() => {}}
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
            onPress={() => {}}
          />
          <SettingItem
            icon="star-rate-outlined"
            title="Rate iCampus"
            subtitle="Let us know how we're doing"
            onPress={() => {}}
          />
        </View>

        {/* Danger Zone */}
        <TouchableOpacity style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>
          App Version: {version} ({buildNumber})
        </Text>
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
    marginVertical: 10,
  },
  group: {
    backgroundColor: '#fadccc',
    borderTopWidth: 0.8,
    borderBottomWidth: 0.8,
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