import React, { useState, Suspense } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { UserAvatar } from '../components/UserAvatar';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import { PageHeader } from '../components/PageHeader';
import { UserIdentity } from '../components/UserIdentity';
import { useAppSelector } from '../hooks/hooks.ts';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { ActivityIndicator } from 'react-native-paper';
import { CATEGORY_ACCESS, CategoryKey } from '../constants/inAppConstants.ts';
import {
  AdminManagementSection,
  SystemActivityLogs,
} from '../components/AdminManagementComps.tsx';

const allTabs = [
  'Overview',
  'Tickets',
  'Security Alerts',
  'Finance',
  'User Operations',
  'Admin Actions',
  'Subscriptions',
  'Store',
  'Access Control',
];
const TABS = {
  //Overview: AdminOverviewStats,
  ///'Tickets': Ticketing,
  'Security Alerts': SystemActivityLogs,
  Financial: SystemActivityLogs,
  'User Operations': SystemActivityLogs,
  'Admin Actions': SystemActivityLogs,
  Subscriptions: SystemActivityLogs,
  Store: SystemActivityLogs,
  'Access Control': AdminManagementSection,
};

type TabKey = keyof typeof TABS;

const DashboardSkeleton = () => {
  const { colors: themeColors } = useTheme();
  return (
    <View style={styles.skeletonContainer}>
      <ActivityIndicator size={'small'} color={themeColors.primary} />
      <Text style={[styles.skeletonText, { color: themeColors.text }]}>
        Loading data...
      </Text>
    </View>
  );
};
export const AdminDashboard = () => {
  const { colors } = useTheme();
  const currentUser = useAppSelector(state => state.admin);
  const [activeTab, setActiveTab] = useState('Overview');
  const navigation = useNavigation<any>();
  const visibleTabs = allTabs.filter((tab): tab is CategoryKey => {
    if (!(tab in CATEGORY_ACCESS)) return true;
    const roles = CATEGORY_ACCESS[tab as CategoryKey];
    return roles.includes(currentUser.adminType as any);
  });
  const ActiveComponent = TABS[activeTab as TabKey];
  const isSuperAdmin = currentUser.adminType === 'super_admin';
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage system administrators and team access"
        rightElement={
          isSuperAdmin ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('AdminFormPage')}
              style={[styles.topBtn, { backgroundColor: colors.btnColor }]}
            >
              <Text style={[styles.topBtnText, { color: colors.btnTextColor }]}>
                Add Admin
              </Text>
              <MaterialIcons
                name="admin-panel-settings-outlined"
                size={22}
                color={colors.btnTextColor}
              />
            </TouchableOpacity>
          ) : null
        }
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <UserAvatar
            profilePic={currentUser?.profilePic}
            firstName={currentUser?.firstname}
            lastName={currentUser?.lastname}
            style={styles.merchantAvatar}
          />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <UserIdentity
              firstname={currentUser?.firstname!}
              lastname={currentUser?.lastname}
              isVerified={currentUser?.isVerified}
              showVerifyIcon={true}
              size="large"
            />
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScrollContainer}
          style={[
            styles.tabBarWrapper,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          {visibleTabs.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab
                    ? { color: colors.primary }
                    : { color: colors.text },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.content}>
          <Suspense fallback={<DashboardSkeleton />}>
            {ActiveComponent ? (
              <ActiveComponent activeTab={activeTab} />
            ) : (
              <ActivityIndicator size={'large'} color={colors.primary} />
            )}
          </Suspense>
        </View>
      </ScrollView>
    </View>
  );
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginVertical: 15,
    width: '100%',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginRight: 8,
  },
  activeTab: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabBarWrapper: {
    marginBottom: 15,
  },
  content: {
    flex: 1,
  },
  tabBarScrollContainer: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  merchantAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  topBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignContent: 'center',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBtnText: {
    marginRight: 4,
    fontSize: 14,
  },
  skeletonContainer: {
    alignContent: 'center',
    padding: 20,
  },
  skeletonText: {
    fontSize: 14,
    marginVertical: 15,
  },
});
