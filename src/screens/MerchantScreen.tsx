import React, { useState, Suspense } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { UserAvatar } from '../components/UserAvatar';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import { PageHeader } from '../components/PageHeader';
import { UserIdentity } from '../components/UserIdentity';
import {
  OrdersList,
  OverviewsScreenComponent,
  ProductList,
  PayoutView,
  ReviewsSection,
  SalesScreen,
} from '../components/SellerManagementComps.tsx';
import { useAppSelector } from '../hooks/hooks.ts';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { ActivityIndicator } from 'react-native-paper';
import { CustomButton } from '../assets/components/AppUIComponents';

const TABS = {
  Overview: OverviewsScreenComponent,
  Orders: OrdersList,
  Sales: SalesScreen,
  Inventory: ProductList,
  Payouts: PayoutView,
  Reviews: ReviewsSection,
};
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
export const MerchantDashboard = () => {
  const { colors } = useTheme();
  const currentUser = useAppSelector(state => state.user);
  const [activeTab, setActiveTab] = useState('Overview');
  const navigation = useNavigation<any>();
  const isOrganization = currentUser.organizationName !== '';
  const ActiveComponent = TABS[activeTab as keyof typeof TABS];
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Sales Hub"
        subtitle="Manage your listings"
        rightElement={
          <CustomButton
            title="Add Listing"
            onPress={() => navigation.navigate('CreateProduct')}
            style={styles.topBtn}
            iconName="add-business"
            iconColor="#fff"
          />
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
          username={currentUser?.username}
          organizationName={currentUser?.organizationName}
          style={styles.merchantAvatar}
        />
        <View style={styles.userInfoWrapper}>
          <UserIdentity
            firstname={currentUser?.firstname!}
            lastname={currentUser?.lastname}
            tier={currentUser?.tier!}
            isVerified={currentUser?.isVerified}
            showVerifyIcon={true}
            organizationName={currentUser.organizationName}
            isOrganization={isOrganization}
            size="medium"
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
        {['Overview', 'Orders', 'Sales', 'Inventory', 'Reviews', 'Payouts'].map(
          tab => (
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
          ),
        )}
      </ScrollView>
      <View style={styles.content}>
        <Suspense fallback={<DashboardSkeleton />}>
          {ActiveComponent ? <ActiveComponent /> : <OverviewsScreenComponent />}
        </Suspense>
      </View>
    </View>
  );
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 15,
    marginHorizontal: 15,
  },
  merchantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 40,
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  userInfoWrapper: {
    marginLeft: 10,
    flex: 1,
  },
  tab: {
    padding: 13,
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
    marginBottom: 20,
    marginHorizontal: 15,
    flexGrow: 0,
  },
  content: {
    flex: 1,
    marginHorizontal: 15,
  },
  tabBarScrollContainer: {
    paddingHorizontal: 10,
    alignItems: 'flex-start',
  },
  topBtn: {
    paddingHorizontal: 8,
    height: 40,
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
});
