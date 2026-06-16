import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {userPreferences} from '../types/firebase';
import {SettingItem} from '../components/SettingsItem';
import {SectionHeader} from './Settings';
import {PRIMARY_COLOR_TINT} from '../assets/styles/colors';
import { PageHeader } from '../components/PageHeader.tsx';
import { updatePreferences } from '../api/localPatchApis.ts';
import { useAppSelector } from '../components/hooks';
import { useTheme } from '../context/ThemeContext';

export const NotificationSettings = () => {
  const { colors } = useTheme();
  const [_isLoading, setIsLoading] = useState(true);
  const [prefs, setPrefs] = useState<userPreferences | null>(null);
  const user = useAppSelector(state => state.user);
  const handleToggle = async (
    section: 'notifications' | 'channels',
    key: string,
  ) => {
    setIsLoading(true);
    if (!prefs) return;
    const sectionData = prefs[section];
    if (!sectionData) return;
    const previousValue = sectionData[key as keyof typeof sectionData];
    const newValue = !previousValue;
    const updated = {
      ...prefs,
      [section]: { ...prefs[section], [key]: newValue },
    };
    setPrefs(updated);
    const dbUpdate = {
      [`${section}.${key}`]: newValue,
    };
    const result = await updatePreferences(user.uid, dbUpdate);
    if (!result.success) {
      const rollback = {
        ...prefs,
        [section]: { ...prefs[section], [key]: previousValue },
      };
      setPrefs(rollback);
    }
    setIsLoading(false);
  };
  
  
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader title="Notification Settings" />
      <SectionHeader title="Alert Categories" />
      <View style={styles.section}>
        <SettingItem
          icon="school-outlined"
          title="Classroom"
          subtitle="Assignments, grades, and lectures"
          toggle
          value={prefs?.notifications?.classroom}
          onPress={() => handleToggle('notifications', 'classroom')}
        />
        <SettingItem
          icon="account-balance-wallet-outlined"
          title="Finance"
          subtitle="iCash transfers and withdrawals"
          toggle={true}
          value={prefs?.notifications?.finance}
          onPress={() => handleToggle('notifications', 'finance')}
        />
        <SettingItem
          icon="groups-outlined"
          title="Social"
          subtitle="Likes, followers, and mentions"
          toggle={true}
          value={prefs?.notifications?.social}
          onPress={() => handleToggle('notifications', 'social')}
        />
      </View>
      {/* CHANNELS SECTION */}
      <SectionHeader title="Channels" />
      <View style={styles.section}>
        <SettingItem
          icon="notifications-active-outlined"
          title="Push Notifications"
          toggle={true}
          value={prefs?.channels?.push}
          onPress={() => handleToggle('channels', 'push')}
        />
        <SettingItem
          icon="mail-outline"
          title="Email Alerts"
          toggle={true}
          value={prefs?.channels?.email}
          onPress={() => handleToggle('channels', 'email')}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  section: {
    borderBottomWidth: 0.5,
    borderColor: PRIMARY_COLOR_TINT,
  },
});