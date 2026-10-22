import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSocket } from '../hooks/useSocket';
import { useAppSelector } from '../hooks/hooks';
import {
  FlatList,
  TouchableOpacity,
  Text,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  View,
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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const OrderListItem = React.memo(
  ({
    item,
    onCancel,
    colors,
  }: {
    item: any;
    onCancel: (id: string) => void;
    colors: any;
  }) => {
    // The server only accepts cancellation while the order awaits delivery
    // (storeControllers: status === "pending_delivery"). Showing the button for
    // anything "not completed" also offered it on cancelled, cancelling and
    // dropped-off orders.
    // Also hidden once the order carries any sign of completion, in case the
    // status field lags behind (e.g. a cached copy from before the QR scan).
    const canCancel =
      item.status === 'pending_delivery' && !item.completedAt;

    return (
      <View style={styles.wrapperContainer}>
        <OrderAccordion order={item} />
        {canCancel && (
          <TouchableOpacity
            style={[
              styles.modernCancelButton,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.primary + '40',
              },
            ]}
            onPress={() => onCancel(item.orderId)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="cancel"
              size={16}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.cancelButtonText, { color: colors.primary }]}>
              Cancel Order
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
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
  const currentUser = useAppSelector(state => state.user);
  const socket = useSocket()?.socket;
  // `pendingOrders` also holds orders where this user is the seller.
  const myOrders = useMemo(
    () => (pendingOrders || []).filter(o => o?.buyerId === currentUser?.uid),
    [pendingOrders, currentUser?.uid],
  );
  const activeCount = myOrders.filter(
    o => o.status === 'pending_delivery' || o.status === 'dropped_off',
  ).length;
  // Refetch every time the screen is shown: orders change on other devices
  // (the seller scans the QR, a cancellation is processed), and a list
  // loaded once on mount kept showing those orders as still pending.
  const fetchRef = useRef(fetchPendingOrders);
  fetchRef.current = fetchPendingOrders;
  useFocusEffect(
    useCallback(() => {
      fetchRef.current(false);
    }, []),
  );
  // Refresh as soon as the server reports an order update.
  useEffect(() => {
    if (!socket) return;
    const onNotification = (data: any) => {
      const type = data?.actionType || data?.notification?.actionType;
      if (typeof type === 'string' && /ORDER|DELIVER|DROPPED/.test(type)) {
        fetchRef.current(false);
      }
    };
    socket.on('new_notification', onNotification);
    return () => {
      socket.off('new_notification', onNotification);
    };
  }, [socket]);
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
        title="My Purchase Orders"
        subtitle={`${activeCount} active ${activeCount === 1 ? 'order' : 'orders'}`}
      />
      <FlatList
        data={myOrders}
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
  wrapperContainer: {
    marginBottom: 16,
  },
  modernCancelButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
    marginHorizontal: 4,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    width: 'auto',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
