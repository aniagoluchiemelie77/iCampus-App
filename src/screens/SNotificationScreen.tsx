import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { userPreferences } from '../types/firebase';
import { SettingItem } from '../components/SettingsItem';
import { SectionHeader } from './Settings';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { PageHeader } from '../components/PageHeader.tsx';
import { updatePreferences } from '../api/localPatchApis.ts';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchPreferencesAPI } from '../api/localGetApis.ts';

export const NotificationSettings = () => {
  const { colors } = useTheme();
  const [_isLoading, setIsLoading] = useState(true);
  const [prefs, setPrefs] = useState<userPreferences | null>(null);
  const handleToggle = async (
    section: 'notifications' | 'channels',
    key: string,
  ) => {
    if (!prefs) return;
    setIsLoading(true);

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

    console.log('Pressed Toggle: ', dbUpdate);
    const result = await updatePreferences(dbUpdate);

    if (!result.success) {
      const rollback = {
        ...prefs,
        [section]: { ...prefs[section], [key]: previousValue },
      };
      setPrefs(rollback);
    }
    setIsLoading(false);
  };
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setIsLoading(true);
        const result = await fetchPreferencesAPI();
        if (result.success && result.preferences) {
          setPrefs(result.preferences);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader title="Notification Settings" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 30 }}
      >
        <SectionHeader title="Alert Categories" />
        <View style={styles.section}>
          <SettingItem
            icon="school"
            title="Classroom"
            subtitle="Assignments, grades, and lectures"
            toggle
            value={prefs?.notifications?.classroom}
            onPress={() => handleToggle('notifications', 'classroom')}
            onValueChange={() => handleToggle('notifications', 'classroom')}
          />
          <SettingItem
            icon="account-balance-wallet"
            title="Finance"
            subtitle="iCash transfers and withdrawals"
            toggle={true}
            value={prefs?.notifications?.finance}
            onPress={() => handleToggle('notifications', 'finance')}
            onValueChange={() => handleToggle('notifications', 'finance')}
          />
          <SettingItem
            icon="groups"
            title="Social"
            subtitle="Likes, followers, and mentions"
            toggle={true}
            value={prefs?.notifications?.social}
            onPress={() => handleToggle('notifications', 'social')}
            onValueChange={() => handleToggle('notifications', 'social')}
          />
        </View>
        {/* CHANNELS SECTION */}
        <SectionHeader title="Channels" />
        <View style={styles.section}>
          <SettingItem
            icon="notifications-active"
            title="Push Notifications"
            toggle={true}
            value={prefs?.channels?.push}
            onPress={() => handleToggle('channels', 'push')}
            onValueChange={() => handleToggle('channels', 'push')}
          />
          <SettingItem
            icon="mail-outline"
            title="Email Alerts"
            toggle={true}
            value={prefs?.channels?.email}
            onPress={() => handleToggle('channels', 'email')}
            onValueChange={() => handleToggle('channels', 'email')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: {
    borderBottomWidth: 0.5,
    borderColor: PRIMARY_COLOR_TINT,
  },
});
