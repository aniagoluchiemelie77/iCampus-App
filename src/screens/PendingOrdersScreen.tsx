import React, { useEffect, useState, useCallback } from 'react';
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
    const isCompleted =
      item.status === 'completed' || item.status === 'delivered';

    return (
      <View style={styles.wrapperContainer}>
        <OrderAccordion order={item} />
        {!isCompleted && (
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
