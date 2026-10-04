import React, { useEffect, useState, useCallback } from 'react';
import {
  FlatList,
  TouchableOpacity,
  Text,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAppDataContext } from '../context/EventContext';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { PageHeader } from '../components/PageHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { useNavigation } from '@react-navigation/native';
import { OrderAccordion } from '../components/MyQRCodeSection';
import { CancellationModal } from '../components/OrderCancellationModal';
import { useTheme } from '../context/ThemeContext';
import { MarketplaceOrder } from '../types/firebase';

const OrderListItem = React.memo(
  ({
    item,
    onCancel,
    colors,
  }: {
    item: any;
    onCancel: (id: string) => void;
    colors: any;
  }) => (
    <>
      <OrderAccordion order={item} />
      <TouchableOpacity
        style={[styles.cancelButton, { backgroundColor: colors.btnColor }]}
        onPress={() => onCancel(item.orderId)}
      >
        <Text style={[styles.cancelButtonText, { color: colors.btnTextColor }]}>
          Cancel Order
        </Text>
      </TouchableOpacity>
    </>
  ),
);
export const PendingOrdersScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const {
    pendingOrders,
    fetchPendingOrders,
    isOrdersLoading,
    isFetchingMoreOrders,
  } = useAppDataContext();
  const [isModalVisible, setModalVisible] = useState(false);
  const [orderId, setOrderId] = useState('');
  useEffect(() => {
    fetchPendingOrders();
  }, [fetchPendingOrders]);
  const renderItem = useCallback(
    ({ item }: { item: MarketplaceOrder }) => (
      <OrderListItem
        item={item}
        onCancel={(id: string) => {
          setOrderId(id);
          setModalVisible(true);
        }}
        colors={colors}
      />
    ),
    [colors],
  );
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
        renderItem={renderItem}
        contentContainerStyle={{ marginHorizontal: 15 }}
        onEndReached={() => fetchPendingOrders(true)}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isOrdersLoading}
            onRefresh={() => fetchPendingOrders(false)}
            colors={[PRIMARY_COLOR]}
          />
        }
        ListFooterComponent={
          isFetchingMoreOrders ? (
            <ActivityIndicator
              color={PRIMARY_COLOR}
              size="small"
              style={{ marginVertical: 15 }}
            />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            iconName="shopping-bag"
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
  container: { flex: 1 },
  cancelButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    marginTop: -5,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
