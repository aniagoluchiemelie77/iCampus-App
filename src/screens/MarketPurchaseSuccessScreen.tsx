import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { OrderAccordion } from '../components/MyQRCodeSection'; 
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { CurrencyDisplay } from '../components/CurrencyFormatter';

export const MarketplacePurchaseSuccessScreen = ({ route, navigation }: any) => {
  const { orders, totalSpent } = route.params;
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.successHeader}>
          <View style={styles.iconCircle}>
            <MaterialIcons
              name="check-circle-outlined"
              size={50}
              color="white"
            />
          </View>
          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.subtitle}>
            Your order has been placed successfully
          </Text>

          <CurrencyDisplay value={totalSpent} size="large" />
        </View>

        <View style={styles.divider} />

        {/* 2. Order List Section */}
        <View style={styles.orderSection}>
          <Text style={styles.sectionTitle}>Your Items ({orders?.length})</Text>
          <Text style={styles.sectionSubtitle}>
            Tap an item to view details
          </Text>

          {orders.map((item: any) => (
            <OrderAccordion key={item.orderId} order={item} />
          ))}
        </View>

        {/* 3. Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Home', { activeTab: 'store' })}
          >
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('PendingOrdersScreen')}
          >
            <MaterialIcons
              name="inventory-outlined"
              size={20}
              color={PRIMARY_COLOR}
            />
            <Text style={styles.secondaryButtonText}>
              Track All Pending Orders
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.supportText}>
          Having issues?{' '}
          <TouchableOpacity>
            <Text style={styles.supportTextInText}>Contact Support</Text>
          </TouchableOpacity>
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
  scrollContent: {
    paddingBottom: 20,
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: PRIMARY_COLOR_TINT,
    marginBottom: 20,
  },
  divider: {
    height: 10,
    backgroundColor: PRIMARY_COLOR_TINT,
  },
  orderSection: {
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginLeft: 20,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#2222',
    marginLeft: 20,
    marginBottom: 15,
  },
  footer: {
    marginTop: 30,
    width: '100%'
  },
  primaryButton: {
    backgroundColor: PRIMARY_COLOR,
    height: 55,
    borderRadius: 15,
    alignContent: 'center',
    width: '100%',
    marginBottom: 15,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    width: '100%',
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  supportText: {
    textAlign: 'center',
    marginTop: 25,
    color: '#2222',
    fontSize: 13,
  },
  supportTextInText:{
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    textDecorationLine: 'underline'
  },
});
