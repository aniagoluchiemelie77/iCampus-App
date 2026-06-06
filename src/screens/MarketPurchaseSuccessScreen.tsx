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
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { useTheme } from '../context/ThemeContext';

export const MarketplacePurchaseSuccessScreen = ({
  route,
  navigation,
}: any) => {
  const { colors } = useTheme();
  const { orders, totalSpent } = route.params;
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons
          name="check-circle-outlined"
          size={60}
          color={colors.primary}
        />
        <Text style={[styles.title, { color: colors.textDarker }]}>
          Payment Successful!
        </Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          Your order has been placed successfully
        </Text>

        <CurrencyDisplay value={totalSpent} size="large" />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Your Items ({orders?.length})
        </Text>

        {orders.map((item: any) => (
          <OrderAccordion key={item.orderId} order={item} />
        ))}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.btnColor }]}
            onPress={() => navigation.navigate('Home', { activeTab: 'store' })}
          >
            <Text
              style={[styles.primaryButtonText, { color: colors.btnTextColor }]}
            >
              Back to Home
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.btnColor,
                flexDirection: 'row',
                alignItems: 'center',
              },
            ]}
            onPress={() => navigation.navigate('PendingOrdersScreen')}
          >
            <MaterialIcons
              name="inventory-outlined"
              size={20}
              color={colors.btnTextColor}
            />
            <Text
              style={[
                styles.primaryButtonText,
                { color: colors.btnTextColor, marginLeft: 4 },
              ]}
            >
              Track All Pending Orders
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.supportText, { color: colors.text }]}>
          Having issues?{' '}
          <TouchableOpacity>
            <Text style={[styles.supportTextInText, { color: colors.primary }]}>
              Contact Support
            </Text>
          </TouchableOpacity>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  scrollContent: {
    padding: 20,
    alignContent: 'center',
  },
  subContainer: {
    borderRadius: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 15,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 15,
  },
  footer: {
    marginTop: 20,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    alignContent: 'center',
  },
  primaryButtonText: {
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
    marginTop: 25,
    fontSize: 12,
  },
  supportTextInText: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
