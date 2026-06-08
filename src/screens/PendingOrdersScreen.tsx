import React, { useEffect, useState } from 'react';
import { FlatList, TouchableOpacity, Text, RefreshControl, StyleSheet } from 'react-native';
import { useAppDataContext } from '../components/EventContext';
import {EmptyState} from '../components/EmptyFlatlistComponent';
import {PageHeader} from '../components/PageHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import {PRIMARY_COLOR} from '../assets/styles/colors';
import { useNavigation } from '@react-navigation/native';
import {OrderAccordion} from '../components/MyQRCodeSection';
import {CancellationModal} from '../components/OrderCancellationModal';
import { useTheme } from '../context/ThemeContext';

export const PendingOrdersScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { pendingOrders, fetchPendingOrders, isOrdersLoading } =
    useAppDataContext();
  const [isModalVisible, setModalVisible] = useState(false);
  const [orderId, setOrderId] = useState('');
  useEffect(() => {
    fetchPendingOrders();
  }, [fetchPendingOrders]);
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader
        title="My Orders"
        subtitle={`${pendingOrders.length} item(s) pending`}
      />
      <FlatList
        data={pendingOrders}
        keyExtractor={item => item.orderId}
        renderItem={({ item }) => (
          <>
            <OrderAccordion order={item} />
            <TouchableOpacity
              style={[styles.cancelButton, {backgroundColor: colors.btnColor}]}
              onPress={() => {
                setOrderId(item.orderId);
                setModalVisible(true);
              }}
            >
              <Text style={[styles.cancelButtonText, {color: colors.btnTextColor}]}>Cancel Order</Text>
            </TouchableOpacity>
          </>
        )}
        refreshControl={
          <RefreshControl
            refreshing={isOrdersLoading}
            onRefresh={() => fetchPendingOrders()}
            colors={[PRIMARY_COLOR]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            iconName="shopping-bag-outlined"
            title="No Pending Deliveries"
            subtitle="Your active physical orders will appear here for verification."
            buttonText="Go to Marketplace"
            onPress={() => navigation.navigate('Home', { activeTab: 'store' })}
          />
        }
      />
      <CancellationModal
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        orderId={orderId}
      />
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  cancelButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 14,
    alignContent: 'center',
    marginBottom: 15,
    marginTop: -5,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});