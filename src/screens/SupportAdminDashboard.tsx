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
import { AdminExpandableFAB } from '../components/AdminExpandableFab.tsx';
import { useAppDataContext } from '../context/EventContext';
import { CustomButton } from '../assets/components/AppUIComponents';
import {
  AdminManagementSection,
  SupportTicketSection,
  SystemActivityLogs,
  Overview,
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
  Overview: Overview,
  Tickets: SupportTicketSection,
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
  const { unreadEmailSupportCount } = useAppDataContext();
  const [activeTab, setActiveTab] = useState('Overview');
  const navigation = useNavigation<any>();
  const [isFabMenuVisible, setFabMenuVisible] = useState(false);
  const toggleFab = () => setFabMenuVisible(!isFabMenuVisible);
  const visibleTabs = allTabs.filter((tab): tab is CategoryKey => {
    if (!(tab in CATEGORY_ACCESS)) return true;
    const roles = CATEGORY_ACCESS[tab as CategoryKey];
    return roles.includes(currentUser.adminType as any);
  });
  const ActiveComponent = TABS[activeTab as TabKey];
  const canViewFabWidgets =
    currentUser.adminType === 'super_admin' ||
    currentUser.adminType === 'support';
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage system administrators and team access"
        rightElement={
          canViewFabWidgets ? (
            <CustomButton
              title="Add Admin"
              onPress={() => navigation.navigate('AdminFormPage')}
              style={styles.topBtn}
              iconName="admin-panel-settings"
              iconColor="#fff"
            />
          ) : null
        }
      />
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
      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        <Suspense fallback={<DashboardSkeleton />}>
          {ActiveComponent ? (
            <ActiveComponent activeTab={activeTab} />
          ) : (
            <ActivityIndicator size={'large'} color={colors.primary} />
          )}
        </Suspense>
      </ScrollView>
      {!isFabMenuVisible && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            if (canViewFabWidgets) {
              setFabMenuVisible(true);
            } else {
              navigation.navigate('AdminSearchScreen');
            }
          }}
        >
          <MaterialIcons
            name={canViewFabWidgets ? 'widgets' : 'search'}
            size={28}
            color={colors.btnTextColor}
          />
        </TouchableOpacity>
      )}
      <AdminExpandableFAB
        isVisible={isFabMenuVisible}
        onClose={toggleFab}
        actions={['Search', 'Support Inquiries']}
        unreadSupportCount={unreadEmailSupportCount}
      />
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
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 'auto',
  },
  topBtnText: {
    marginRight: 4,
    fontSize: 14,
  },
  skeletonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  skeletonText: {
    fontSize: 14,
    marginVertical: 15,
  },
  fab: {
    position: 'absolute',
    bottom: 75,
    right: 20,
    backgroundColor: PRIMARY_COLOR,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },
});
