import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { userPreferences } from '../types/firebase';
import { SettingItem } from '../components/SettingsItem';
import { SectionHeader } from './Settings';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { PageHeader } from '../components/PageHeader.tsx';
import { updatePreferences } from '../api/localPatchApis.ts';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchPreferencesAPI } from '../api/localGetApis.ts';
import { EmptyState } from '../components/EmptyFlatlistComponent';

type Section = 'notifications' | 'channels';

export const NotificationSettings = () => {
  const { colors } = useTheme();
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [prefs, setPrefs] = useState<userPreferences | null>(null);
  // Toggles with a save in flight; ignored until it settles.
  const pending = useRef(new Set<string>());

  const loadPreferences = useCallback(async () => {
    setLoadState('loading');
    try {
      const result = await fetchPreferencesAPI();
      if (result.success && result.preferences) {
        setPrefs(result.preferences);
        setLoadState('ready');
      } else {
        setLoadState('error');
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleToggle = async (section: Section, key: string) => {
    const pendingKey = `${section}.${key}`;
    if (!prefs || pending.current.has(pendingKey)) return;
    const previousValue = !!(prefs[section] as any)?.[key];
    const newValue = !previousValue;
    pending.current.add(pendingKey);

    const apply = (value: boolean) =>
      setPrefs(prev =>
        prev ? { ...prev, [section]: { ...(prev[section] as any), [key]: value } } : prev,
      );
    apply(newValue);

    const result = await updatePreferences({ [section]: { [key]: newValue } } as any);
    if (!result.success) {
      apply(previousValue);
    } else if (result.data?.notifications && result.data?.channels) {
      // The server's saved copy is the truth.
      setPrefs(result.data);
    }
    pending.current.delete(pendingKey);
  };

  const row = (section: Section, key: string, icon: string, title: string, subtitle?: string) => (
    <SettingItem
      icon={icon}
      title={title}
      subtitle={subtitle}
      toggle
      value={!!(prefs?.[section] as any)?.[key]}
      onValueChange={() => handleToggle(section, key)}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Notification Settings" />
      {loadState === 'loading' && !prefs ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading your settings…</Text>
        </View>
      ) : loadState === 'error' && !prefs ? (
        <EmptyState
          iconName="cloud-off"
          title="Couldn't load your settings"
          subtitle="Check your connection and try again."
          buttonText="Try again"
          buttonIcon="refresh"
          onPress={loadPreferences}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 30 }}
        >
          <SectionHeader title="Alert Categories" />
          <View style={styles.section}>
            {row('notifications', 'classroom', 'school', 'Classroom', 'Assignments, grades, lectures and reminders')}
            {row('notifications', 'finance', 'account-balance-wallet', 'Finance', 'Payments, payouts and withdrawals')}
            {row('notifications', 'store', 'storefront', 'Store', 'Orders, deliveries and reviews')}
            {row('notifications', 'social', 'groups', 'Social', 'Likes, followers, and mentions')}
          </View>
          <SectionHeader title="Channels" />
          <View style={styles.section}>
            {row('channels', 'push', 'notifications-active', 'Push Notifications')}
            {row('channels', 'email', 'mail-outline', 'Email Alerts')}
          </View>
          <Text style={[styles.footnote, { color: colors.text }]}>
            Security alerts such as new sign-ins are always sent.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: {
    borderBottomWidth: 0.5,
    borderColor: PRIMARY_COLOR_TINT,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13, opacity: 0.75 },
  footnote: { fontSize: 12, opacity: 0.65, marginTop: 14, textAlign: 'center' },
});
