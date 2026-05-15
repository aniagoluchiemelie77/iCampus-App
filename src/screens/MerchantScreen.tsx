import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { UserAvatar } from '../components/UserAvatar';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  PRIMARY_COLOR,
  BACKGROUND_LIGHT,
  PRIMARY_COLOR_TINT,
} from '../assets/styles/colors.ts';
import { PageHeader } from '../components/PageHeader';
import { UserIdentity } from '../components/UserIdentity';
import {
  OrdersList,
  OverviewsScreenComponent,
  ProductList,
  PayoutView,
  ReviewsSection,
} from '../components/SellerManagementComps.tsx';
import { useAppSelector } from '../components/hooks';

export const MerchantDashboard = () => {
  const currentUser = useAppSelector(state => state.user);
  const [activeTab, setActiveTab] = useState('Overview');
  const isOrganization = currentUser.organizationName !== '';

  return (
    <View style={styles.container}>
      <PageHeader
        title="Merchant Hub"
        subtitle="Manage your products & earnings"
        rightElement={
          <TouchableOpacity
            //onPress={() => {}}
            style={styles.topBtn}
          >
            <Text style={styles.topBtnText}>Manage hub</Text>
            <MaterialIcons name="settings-outlined" size={25} color="#fff" />
          </TouchableOpacity>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <UserAvatar
            profilePic={currentUser?.profilePic}
            firstName={currentUser?.firstname}
            lastName={currentUser?.lastname}
            username={currentUser?.username}
            organizationName={currentUser?.organizationName}
            style={styles.merchantAvatar}
          />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <UserIdentity
              firstname={currentUser?.firstname!}
              lastname={currentUser?.lastname}
              tier={currentUser?.tier!}
              isVerified={currentUser?.isVerified}
              showVerifyIcon={true}
              organizationName={currentUser.organizationName}
              isOrganization={isOrganization}
              size="large"
            />
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScrollContainer}
          style={styles.tabBarWrapper}
        >
          {['Overview', 'Orders', 'Inventory', 'Payouts', 'Reviews'].map(
            tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>
        <View style={styles.content}>
          {activeTab === 'Overview' && <OverviewsScreenComponent />}
          {activeTab === 'Orders' && <OrdersList />}
          {activeTab === 'Inventory' && <ProductList />}
          {activeTab === 'Payouts' && <PayoutView />}
          {activeTab === 'Reviews' && <ReviewsSection />}
        </View>
      </ScrollView>
    </View>
  );
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_LIGHT,
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
    marginRight: 5,
  },
  activeTab: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
  },
  activeTabText: {
    color: PRIMARY_COLOR,
  },
  tabBarWrapper: {
    marginBottom: 15,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    backgroundColor: '#fadccc',
    padding: 4,
  },
  content: {
    flex: 1,
  },
  tabBarScrollContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  merchantAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: PRIMARY_COLOR,
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  topBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: PRIMARY_COLOR,
    alignContent: 'center',
  },
  topBtnText: {
    marginRight: 3,
    fontSize: 14,
    color: '#fff',
  },
});