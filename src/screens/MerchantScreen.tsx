import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet, FlatList, Dimensions } from 'react-native';
import { PageHeader, UserIdentity, UserAvatar } from './YourComponents';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export const MerchantDashboard = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const stats = [
    { label: 'Total Sales', value: '120', icon: 'payments' },
    { label: 'Products', value: '14', icon: 'inventory' },
    { label: 'Wallet', value: '45,000 pts', icon: 'account-balance-wallet' },
  ];

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Merchant Hub" 
        subtitle="Manage your shop & earnings"
        rightElement={
          <TouchableOpacity onPress={() => {/* Navigate to Upload */}}>
            <MaterialIcons name="add-business" size={28} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Summary Section */}
        <View style={styles.profileCard}>
          <UserAvatar size={60} firstName="John" lastName="Doe" />
          <View style={{ marginLeft: 12 }}>
            <UserIdentity firstname="John" lastname="Doe" tier="pro" isVerified={true} showVerifyIcon={true} />
            <Text style={styles.verificationText}>Verified Merchant ✅</Text>
          </View>
        </View>

        {/* Audit / Analytics Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statBox}>
              <MaterialIcons name={stat.icon} size={20} color="#666" />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Withdrawal/KYC Banner (The "YouTube" check) */}
        {!isVerifiedForPayout && (
          <TouchableOpacity style={styles.warningBanner}>
            <MaterialIcons name="info" size={20} color="#B8860B" />
            <Text style={styles.warningText}>Complete verification to enable withdrawals.</Text>
          </TouchableOpacity>
        )}

        {/* Navigation Tabs */}
        <View style={styles.tabBar}>
          {['Overview', 'Orders', 'Inventory'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Area */}
        <View style={styles.content}>
          {activeTab === 'Overview' && <RecentReviewsSection />}
          {activeTab === 'Orders' && <OrdersList orders={marketplaceOrders} />}
          {activeTab === 'Inventory' && <ProductList products={userProducts} />}
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
  /* Profile Section */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: CARD_BG,
    marginBottom: 10,
  },
  verificationText: {
    fontSize: 12,
    color: '#4CAF50', // Success Green
    fontWeight: '600',
    marginTop: 2,
  },

  /* Audit / Analytics Grid */
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  statBox: {
    backgroundColor: CARD_BG,
    width: (width - 48) / 3, // Perfect 3-column split
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    // Soft Shadow
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Verification Banner (The "YouTube" style nudge) */
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBE6', // Light Warning Yellow
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE58F',
    marginBottom: 20,
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
  },

  /* Tab Navigation */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    marginHorizontal: 16,
    borderRadius: 25,
    padding: 4,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 21,
  },
  activeTab: {
    backgroundColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFF',
  },

  /* Content Area & Lists */
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  productCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#EEE',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  productMeta: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },

  /* Actions */
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    marginLeft: 8,
  },

  /* Wallet/Withdrawal Section */
  walletSection: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  walletBalance: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  withdrawBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 10,
  }
});