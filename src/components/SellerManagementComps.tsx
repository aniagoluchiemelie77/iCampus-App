import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { useAppDataContext } from '../context/EventContext';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { formatStatNumber } from '../utils/followCountFormatter';
import {
  ProductSale,
  UserTier,
  Product,
  Transactions,
} from '../types/firebase';
import { CurrencyDisplay } from './CurrencyFormatter';
import { EmptyState } from './EmptyFlatlistComponent';
import {
  fetchPayoutHistoryAPI,
  fetchUserReviewsAPI,
} from '../api/localGetApis';
import { requestPayoutAPI } from '../api/localPostApis';
import { deleteProductApi } from '../api/localDeleteApis';
import { markOrderAsDroppedOffAPI } from '../api/localPatchApis';
import { UserAvatar } from './UserAvatar';
import { AddPaymentModal } from './AddPaymentMethodModal';
import { UserIdentity } from './UserIdentity';
import { useNavigation } from '@react-navigation/native';
import RNPickerSelect from 'react-native-picker-select';
import moment from 'moment';
import { useDispatch } from 'react-redux';
import { setUser } from '../context/UserSlice';
import { CustomButton } from '../assets/components/AppUIComponents';
import { useExchangeRate } from '../hooks/useExchangeRate.ts';
import Svg, {
  Polyline,
  Defs,
  LinearGradient,
  Stop,
  Path,
} from 'react-native-svg';
import { ReviewItem } from './ReviewItem';
import { useTheme } from '../context/ThemeContext';
import { useSellerProducts } from '../hooks/useSQLiteDb.ts';
import { ActionModal } from './LogoutModal.tsx';
import { fetchUserWithOfflineFallback } from '../hooks/useUserDetails.ts';
import { useConvertedCurrency } from '../hooks/useCurrencyConverter';
import { parseFirestoreDate } from '../utils/dateFormatter.ts';
interface StatusCardProps {
  label: string;
  count: string;
  color: string;
  icon: string;
}
interface StatusCardMiniProps {
  label: string;
  count: number;
  color: string;
  isSuccess?: boolean;
}
interface TopBuyerProfile {
  uid: string;
  firstname: string;
  lastname: string;
  username: string;
  profilePic: string | string[];
  tier: UserTier;
  isVerified: boolean;
  totalSpent: number;
  organizationName?: string;
  displayScore?: number | string;
}
const ProductListHeader = ({
  count,
  onAdd,
}: {
  count: number;
  onAdd: () => void;
}) => {
  const { colors: themeColors } = useTheme();
  return (
    <View
      style={[
        styles.listHeader,
        { backgroundColor: themeColors.backgroundSecondary },
      ]}
    >
      <Text style={[styles.countText, { color: themeColors.textDarker }]}>
        Total Listings: {count}
      </Text>
    </View>
  );
};
const ProductEmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <EmptyState
    iconName="store-front"
    title="No Products Found"
    subtitle="You haven't listed any items for sale yet. Start your journey by adding your first product!"
    buttonText="Create Product"
    onPress={onAdd}
  />
);
const LineGraph = ({
  trend,
  colorOverride,
  themeBackgroundColor,
}: {
  trend: 'up' | 'down';
  colorOverride?: string;
  themeBackgroundColor: string;
}) => {
  const isUp = trend === 'up';
  const color = colorOverride || (isUp ? '#4CAF50' : PRIMARY_COLOR);

  const linePoints = isUp
    ? '0,40 20,35 40,38 60,20 80,25 100,5'
    : '0,5 20,15 40,10 60,30 80,35 100,45';

  const fillPath = isUp
    ? 'M0,40 L20,35 L40,38 L60,20 L80,25 L100,5 L100,50 L0,50 Z'
    : 'M0,5 L20,15 L40,10 L60,30 L80,35 L100,45 L100,50 L0,50 Z';

  return (
    <View style={{ flex: 1, marginTop: 10 }}>
      <Svg height="100%" width="100%" viewBox="0 0 100 50">
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.4" />
            <Stop offset="1" stopColor={themeBackgroundColor} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Path d={fillPath} fill="url(#grad)" />
        <Polyline
          points={linePoints}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};
export const StatusCard = ({ label, count, color, icon }: StatusCardProps) => (
  <View style={[styles.statusCard, { borderLeftColor: color }]}>
    <View style={styles.statusIconContainer}>
      <MaterialIcons name={icon} size={22} color={color} />
    </View>
    <View>
      <Text style={[styles.statusCount, { color: color }]}>{count}</Text>
      <Text style={styles.statusLabel}>{label}</Text>
    </View>
  </View>
);
export const StatusCardMini = ({
  label,
  count,
  color,
}: StatusCardMiniProps) => {
  const { colors: themeColor } = useTheme();
  return (
    <View style={[styles.statusCard, { borderColor: color }]}>
      <View style={styles.statusIconContainerMini}>
        <CurrencyDisplay value={count} size="medium" />
      </View>
      <Text
        style={[styles.statusLabel, { marginTop: 4, color: themeColor.text }]}
      >
        {label}
      </Text>
    </View>
  );
};
// ---------------------------------------------------------------------------
// Sales Orders
// ---------------------------------------------------------------------------
type OrderFilter = 'all' | 'pending_delivery' | 'dropped_off' | 'completed' | 'cancelled';

const useOrderStatusMeta = () => {
  const { colors: themeColors } = useTheme();
  return {
    pending_delivery: {
      label: 'Pending',
      long: 'Awaiting delivery',
      icon: 'local-shipping',
      color: themeColors.pendingDelivery,
    },
    dropped_off: {
      label: 'At station',
      long: 'At drop-off station',
      icon: 'storefront',
      color: themeColors.primaryTint,
    },
    completed: {
      label: 'Completed',
      long: 'Delivered & paid',
      icon: 'check-circle',
      color: themeColors.success,
    },
    cancelled: {
      label: 'Cancelled',
      long: 'Cancelled',
      icon: 'cancel',
      color: themeColors.primary,
    },
  } as Record<
    Exclude<OrderFilter, 'all'>,
    { label: string; long: string; icon: string; color: string }
  >;
};

/** One order: everything visible at a glance, plus the next action if any. */
const SellerOrderCard = ({
  order,
  onStatusUpdated,
}: {
  order: any;
  onStatusUpdated: () => void;
}) => {
  const { colors: themeColors } = useTheme();
  const { currentUser } = useAppDataContext();
  const statusMeta = useOrderStatusMeta();
  const meta =
    statusMeta[order.status as Exclude<OrderFilter, 'all'>] ||
    statusMeta.pending_delivery;
  const [markingDropOff, setMarkingDropOff] = useState(false);
  // Orders are paid in the buyer's currency; show the seller's equivalent.
  const { convertedValue } = useConvertedCurrency(
    Number(order.amountPaid) || 0,
    order.amountPaidCurrencyCode || 'NGN',
    currentUser?.country,
  );
  const createdAt = parseFirestoreDate(order.createdAt);
  const isDropOff = order.deliveryMethod === 'drop_off';

  const handleMarkAsDroppedOff = async () => {
    setMarkingDropOff(true);
    try {
      const result = await markOrderAsDroppedOffAPI(order.orderId);
      if (result.success) {
        Toast.show({
          type: 'success',
          text2: result.message || 'Marked as dropped off at the station.',
        });
        onStatusUpdated();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Update failed',
          text2: result.message || 'Please try again.',
        });
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: err?.message || 'Please try again.',
      });
    } finally {
      setMarkingDropOff(false);
    }
  };

  const footerMessage =
    order.status === 'pending_delivery'
      ? isDropOff && order.selectedStation
        ? `Drop off at ${order.selectedStation.name}`
        : 'Buyer is waiting for direct delivery'
      : order.status === 'dropped_off'
        ? `Waiting for the buyer to pick up at ${order.selectedStation?.name || 'the station'}`
        : order.status === 'cancelled'
          ? `Reason: ${order.cancellationReason || 'No reason provided'}`
          : order.completedAt
            ? `Completed on ${moment(parseFirestoreDate(order.completedAt)).format('MMM D, YYYY')}`
            : 'Delivered and paid out';

  return (
    <View
      style={[hub.orderCard, { backgroundColor: themeColors.backgroundSecondary }]}
    >
      <View style={hub.orderTopRow}>
        <View style={[hub.orderIconTile, { backgroundColor: meta.color + '1F' }]}>
          <MaterialIcons name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[hub.orderTitle, { color: themeColors.textDarker }]}
            numberOfLines={1}
          >
            {order.productName}
          </Text>
          <Text style={[hub.orderMeta, { color: themeColors.text }]}>
            #{order.orderId} · {order.quantity} {order.quantity === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <View style={[hub.statusPill, { backgroundColor: meta.color + '1F' }]}>
          <Text style={[hub.statusPillText, { color: meta.color }]}>
            {meta.label}
          </Text>
        </View>
      </View>

      <View style={[hub.orderStatsRow, { borderColor: themeColors.border + '40' }]}>
        <View style={hub.orderStat}>
          <Text style={[hub.orderStatLabel, { color: themeColors.text }]}>Amount</Text>
          <CurrencyDisplay
            value={convertedValue}
            size="small"
            isSuccess={order.status === 'completed'}
          />
        </View>
        <View style={hub.orderStat}>
          <Text style={[hub.orderStatLabel, { color: themeColors.text }]}>Date</Text>
          <Text style={[hub.orderStatValue, { color: themeColors.textDarker }]}>
            {createdAt ? moment(createdAt).format('MMM D, YYYY') : '—'}
          </Text>
        </View>
        <View style={hub.orderStat}>
          <Text style={[hub.orderStatLabel, { color: themeColors.text }]}>Delivery</Text>
          <Text style={[hub.orderStatValue, { color: themeColors.textDarker }]}>
            {isDropOff ? 'Drop-off' : 'Direct'}
          </Text>
        </View>
      </View>

      <View style={[hub.orderFooter, { backgroundColor: meta.color + '12' }]}>
        <MaterialIcons name={meta.icon} size={16} color={meta.color} />
        <Text
          style={[hub.orderFooterText, { color: themeColors.text }]}
          numberOfLines={2}
        >
          {footerMessage}
        </Text>
      </View>

      {order.status === 'pending_delivery' && isDropOff && (
        <CustomButton
          title="Mark as dropped off"
          iconName="where-to-vote"
          onPress={handleMarkAsDroppedOff}
          isLoading={markingDropOff}
          disabled={markingDropOff}
          style={hub.orderAction}
        />
      )}
    </View>
  );
};

export const OrdersList = () => {
  const { colors: themeColors } = useTheme();
  const { pendingOrders, currentUser, fetchPendingOrders, isOrdersLoading } =
    useAppDataContext();
  const statusMeta = useOrderStatusMeta();
  const [filter, setFilter] = useState<OrderFilter>('all');

  const sellerOrders = useMemo(
    () =>
      (pendingOrders || [])
        .filter(o => o.sellerId === currentUser.uid)
        .sort(
          (a, b) =>
            (parseFirestoreDate(b.createdAt)?.getTime() || 0) -
            (parseFirestoreDate(a.createdAt)?.getTime() || 0),
        ),
    [pendingOrders, currentUser.uid],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: sellerOrders.length };
    sellerOrders.forEach(o => {
      c[o.status] = (c[o.status] || 0) + 1;
    });
    return c;
  }, [sellerOrders]);
  const visibleOrders =
    filter === 'all' ? sellerOrders : sellerOrders.filter(o => o.status === filter);

  useFocusEffect(
    React.useCallback(() => {
      fetchPendingOrders();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const filters: OrderFilter[] = [
    'all',
    'pending_delivery',
    'dropped_off',
    'completed',
    'cancelled',
  ];

  return (
    <FlatList
      data={visibleOrders}
      keyExtractor={item => item.orderId}
      renderItem={({ item }) => (
        <SellerOrderCard
          order={item}
          onStatusUpdated={() => fetchPendingOrders()}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={!!isOrdersLoading}
          onRefresh={() => fetchPendingOrders()}
          tintColor={themeColors.primary}
          colors={[themeColors.primary]}
        />
      }
      ListHeaderComponent={
        sellerOrders.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={hub.filterRow}
          >
            {filters.map(f => {
              const isActive = filter === f;
              const color = f === 'all' ? themeColors.primary : statusMeta[f].color;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  activeOpacity={0.8}
                  style={[
                    hub.filterChip,
                    { borderColor: color },
                    isActive && { backgroundColor: color },
                  ]}
                >
                  <Text
                    style={[hub.filterChipText, { color: isActive ? '#fff' : color }]}
                  >
                    {f === 'all' ? 'All' : statusMeta[f].label}
                  </Text>
                  <View
                    style={[
                      hub.filterCount,
                      { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : color + '1F' },
                    ]}
                  >
                    <Text
                      style={[hub.filterCountText, { color: isActive ? '#fff' : color }]}
                    >
                      {counts[f] || 0}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null
      }
      ListEmptyComponent={
        isOrdersLoading && sellerOrders.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={themeColors.primary} />
        ) : (
          <EmptyState
            iconName={sellerOrders.length === 0 ? 'receipt-long' : 'filter-list-off'}
            title={
              sellerOrders.length === 0
                ? 'No orders yet'
                : `No ${statusMeta[filter as Exclude<OrderFilter, 'all'>]?.long.toLowerCase() || ''} orders`
            }
            subtitle={
              sellerOrders.length === 0
                ? 'When buyers purchase your listings, their orders appear here.'
                : 'Try another filter to see the rest of your orders.'
            }
            buttonText={sellerOrders.length === 0 ? undefined : 'Show all orders'}
            onPress={sellerOrders.length === 0 ? undefined : () => setFilter('all')}
          />
        )
      }
      contentContainerStyle={[hub.listContent, visibleOrders.length === 0 && { flexGrow: 1 }]}
      showsVerticalScrollIndicator={false}
    />
  );
};

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
const OverviewStat = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
}) => {
  const { colors: themeColors } = useTheme();
  return (
    <View style={[hub.statTile, { backgroundColor: themeColors.backgroundSecondary }]}>
      <View style={[hub.statTileIcon, { backgroundColor: themeColors.primary + '1A' }]}>
        <MaterialIcons name={icon} size={18} color={themeColors.primary} />
      </View>
      <Text style={[hub.statTileValue, { color: themeColors.textDarker }]}>{value}</Text>
      <Text style={[hub.statTileLabel, { color: themeColors.text }]}>{label}</Text>
      {!!hint && (
        <Text style={[hub.statTileHint, { color: themeColors.text }]}>{hint}</Text>
      )}
    </View>
  );
};

export const OverviewsScreenComponent = () => {
  const { colors: themeColors } = useTheme();
  const {
    currentUser,
    fetchSellerSales,
    pendingOrders,
    sellerSales,
    catalogSyncVersion,
  } = useAppDataContext();
  const { sellerProducts } = useSellerProducts(currentUser?.uid, catalogSyncVersion);
  const navigation = useNavigation<any>();
  const statusMeta = useOrderStatusMeta();
  // Lifetime successful payouts, from the payout history endpoint.
  const [totalPaidOut, setTotalPaidOut] = useState<number | null>(null);

  const sellerOrders = (pendingOrders || []).filter(
    o => o?.sellerId === currentUser?.uid,
  );
  const hasProducts = sellerProducts.length > 0;
  const totalImpressions = sellerProducts.reduce(
    (sum, p) => sum + (p.impressions || 0),
    0,
  );
  const allRatings = sellerProducts.flatMap(p => p.ratings || []);
  const availableBalance = Number(currentUser.pendingSalesBalance) || 0;
  const totalGenerated = (totalPaidOut || 0) + availableBalance;
  const paidOutShare =
    totalGenerated > 0 ? Math.min(1, (totalPaidOut || 0) / totalGenerated) : 0;
  const avgRating =
    allRatings.length > 0
      ? (
          allRatings.reduce((sum, r) => sum + (r?.score || 0), 0) /
          allRatings.length
        ).toFixed(1)
      : '—';
  const totalSalesCount = sellerSales.reduce(
    (sum: number, sale: ProductSale) => sum + (sale.quantity || 0),
    0,
  );
  const conversion =
    totalImpressions > 0
      ? `${((totalSalesCount / totalImpressions) * 100).toFixed(1)}%`
      : '—';

  useFocusEffect(
    React.useCallback(() => {
      fetchSellerSales();
      let active = true;
      fetchPayoutHistoryAPI().then(res => {
        if (active && res.success && typeof res.totalPaidOut === 'number') {
          setTotalPaidOut(res.totalPaidOut);
        }
      });
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (!hasProducts) {
    return (
      <EmptyState
        iconName="add-business"
        title="Start selling on iCampus"
        subtitle="List your first product and your sales, earnings and orders will show up here."
        buttonText="Create your first listing"
        buttonIcon="add"
        onPress={() => navigation.navigate('CreateProduct')}
      />
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={hub.listContent}
    >
      {/* Earnings hero */}
      <View style={[hub.heroCard, { backgroundColor: themeColors.backgroundSecondary }]}>
        <View style={hub.heroHeader}>
          <Text style={[hub.heroLabel, { color: themeColors.text }]}>
            Total generated
          </Text>
          <MaterialIcons name="insights" size={20} color={themeColors.primary} />
        </View>
        {totalPaidOut === null ? (
          <ActivityIndicator
            style={{ alignSelf: 'flex-start', marginVertical: 14 }}
            color={themeColors.primary}
          />
        ) : (
          <CurrencyDisplay value={totalGenerated} size="large" />
        )}
        <Text style={[hub.heroSub, { color: themeColors.text }]}>
          Everything you have earned: paid out plus available balance.
        </Text>

        <View style={[hub.heroTrack, { backgroundColor: themeColors.primary + '22' }]}>
          <View
            style={[
              hub.heroTrackFill,
              { width: `${paidOutShare * 100}%`, backgroundColor: themeColors.success },
            ]}
          />
        </View>
        <View style={hub.heroSplitRow}>
          <View style={hub.heroSplit}>
            <View style={hub.heroLegend}>
              <View style={[hub.legendDot, { backgroundColor: themeColors.success }]} />
              <Text style={[hub.heroSplitLabel, { color: themeColors.text }]}>Paid out</Text>
            </View>
            <CurrencyDisplay value={totalPaidOut || 0} size="small" isSuccess />
          </View>
          <View style={[hub.heroSplit, { alignItems: 'flex-end' }]}>
            <View style={hub.heroLegend}>
              <View style={[hub.legendDot, { backgroundColor: themeColors.primary }]} />
              <Text style={[hub.heroSplitLabel, { color: themeColors.text }]}>Available</Text>
            </View>
            <CurrencyDisplay value={availableBalance} size="small" />
          </View>
        </View>
      </View>

      {/* Key stats */}
      <View style={hub.statGrid}>
        <OverviewStat
          icon="visibility"
          label="Impressions"
          value={formatStatNumber(totalImpressions)}
        />
        <OverviewStat
          icon="shopping-bag"
          label="Units sold"
          value={formatStatNumber(totalSalesCount)}
          hint={`${conversion} conversion`}
        />
        <OverviewStat
          icon="star"
          label="Avg. rating"
          value={avgRating}
          hint={`${allRatings.length} ${allRatings.length === 1 ? 'review' : 'reviews'}`}
        />
        <OverviewStat
          icon="inventory-2"
          label="Active listings"
          value={formatStatNumber(sellerProducts.length)}
        />
      </View>

      {/* Orders snapshot */}
      {sellerOrders.length > 0 && (
        <View style={[hub.sectionCard, { backgroundColor: themeColors.backgroundSecondary }]}>
          <Text style={[hub.sectionCardTitle, { color: themeColors.textDarker }]}>
            Orders
          </Text>
          <View style={hub.ordersSnapshotRow}>
            {(Object.keys(statusMeta) as Exclude<OrderFilter, 'all'>[]).map(key => {
              const meta = statusMeta[key];
              const count = sellerOrders.filter(o => o.status === key).length;
              return (
                <View key={key} style={hub.ordersSnapshotItem}>
                  <View style={[hub.ordersSnapshotIcon, { backgroundColor: meta.color + '1F' }]}>
                    <MaterialIcons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <Text style={[hub.ordersSnapshotCount, { color: themeColors.textDarker }]}>
                    {formatStatNumber(count)}
                  </Text>
                  <Text style={[hub.ordersSnapshotLabel, { color: themeColors.text }]}>
                    {meta.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Tip */}
      <View style={[hub.tipCard, { backgroundColor: themeColors.primary + '12' }]}>
        <MaterialIcons name="lightbulb" size={18} color={themeColors.primary} />
        <Text style={[hub.tipText, { color: themeColors.text }]}>
          {totalImpressions > 0 && totalSalesCount === 0
            ? 'People are viewing but not buying. Try clearer photos, a sharper description or a better price.'
            : sellerProducts.some(p => (Number(p.amountInStock) || 0) <= 0)
              ? 'Some listings are out of stock. Restock them so they keep showing up for buyers.'
              : 'Listings with several clear photos and an up-to-date stock count sell faster.'}
        </Text>
      </View>
    </ScrollView>
  );
};

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
export const ProductList = () => {
  const { colors: themeColors } = useTheme();
  const {
    currentUser,
    deleteProductLocal,
    syncCatalogToDatabase,
    catalogSyncVersion,
  } = useAppDataContext();
  const navigation = useNavigation<any>();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Re-reads SQLite whenever a catalog sync lands.
  const { sellerProducts, refreshProducts } = useSellerProducts(
    currentUser?.uid,
    catalogSyncVersion,
  );

  // Stock must be current here, so bypass the 30-minute sync throttle.
  const refreshFromServer = React.useCallback(async () => {
    setRefreshing(true);
    await syncCatalogToDatabase({ force: true });
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      refreshFromServer();
    }, [refreshFromServer]),
  );

  const handleDeletePress = (productId: string, productTitle: string) => {
    setSelectedProduct({ id: productId, title: productTitle });
    setDeleteModalVisible(true);
  };
  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;

    try {
      setIsDeleting(true);
      const result = await deleteProductApi(selectedProduct.id);

      if (result.success) {
        await deleteProductLocal(selectedProduct.id);
        Toast.show({
          type: 'success',
          text2: 'Product has been permanently removed.',
        });
        setDeleteModalVisible(false);
        setSelectedProduct(null);
        refreshProducts();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Delete Error',
          text2: result.message || 'Could not complete request.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: 'Something went wrong while connecting to the server.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    // All listings are physical; stock is read straight from the synced row
    // (no longer gated on `type`, which older cached rows were missing).
    const stock = Number(item.amountInStock) || 0;
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock < 5;
    const stockColor = isOutOfStock
      ? themeColors.primary
      : isLowStock
        ? themeColors.pendingDelivery
        : themeColors.success;
    const stockLabel = isOutOfStock
      ? 'Out of stock'
      : isLowStock
        ? `Only ${stock} left`
        : `${stock} in stock`;

    return (
      <View style={[styles.card, { backgroundColor: themeColors.backgroundSecondary }]}>
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: item.mediaUrls?.[0] || 'https://via.placeholder.com/150',
            }}
            style={styles.thumbnail}
          />
        </View>

        <View style={styles.infoContainer}>
          {!!item.niche && (
            <View
              style={[styles.typeBadge, { backgroundColor: themeColors.primary + '15' }]}
            >
              <Text style={[styles.typeText, { color: themeColors.primary }]}>
                {item.niche.toUpperCase()}
              </Text>
            </View>
          )}

          <Text
            style={[hub.productTitle, { color: themeColors.textDarker }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <View style={styles.detailsRow}>
            <View style={[hub.stockPill, { backgroundColor: stockColor + '1A' }]}>
              <MaterialIcons name="inventory-2" size={13} color={stockColor} />
              <Text style={[hub.stockPillText, { color: stockColor }]}>
                {stockLabel}
              </Text>
            </View>
            <CurrencyDisplay value={item.price} size="small" />
          </View>

          <View
            style={[
              styles.statsFooter,
              { borderTopColor: themeColors.border + '40' },
            ]}
          >
            <TouchableOpacity
              style={styles.actionIconButton}
              onPress={() => navigation.navigate('CreateProduct', { product: item })}
            >
              <MaterialIcons name="edit" size={18} color={themeColors.text} />
              <Text style={[styles.actionText, { color: themeColors.text }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionIconButton}
              onPress={() => handleDeletePress(item.productId, item.title)}
            >
              <MaterialIcons
                name="delete-outline"
                size={18}
                color={themeColors.primary}
              />
              <Text style={[styles.actionText, { color: themeColors.primary }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };
  const handleAddNew = () => {
    navigation.navigate('CreateProduct');
  };
  const outOfStockCount = sellerProducts.filter(
    p => (Number(p.amountInStock) || 0) <= 0,
  ).length;

  return (
    <>
      {/* The FlatList is the scroll container (it used to be nested in a
          ScrollView, which disabled virtualization). */}
      <FlatList
        data={sellerProducts}
        keyExtractor={item => item.productId}
        renderItem={renderProductItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshFromServer}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
        ListHeaderComponent={
          sellerProducts.length > 0 ? (
            <View
              style={[hub.inventoryHeader, { backgroundColor: themeColors.backgroundSecondary }]}
            >
              <View>
                <Text style={[hub.inventoryCount, { color: themeColors.textDarker }]}>
                  {sellerProducts.length} {sellerProducts.length === 1 ? 'listing' : 'listings'}
                </Text>
                <Text style={[hub.inventorySub, { color: themeColors.text }]}>
                  {outOfStockCount > 0
                    ? `${outOfStockCount} out of stock`
                    : 'All physical listings in stock'}
                </Text>
              </View>
              <CustomButton
                title="Add"
                iconName="add"
                onPress={handleAddNew}
                style={hub.inventoryAddBtn}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          refreshing ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={themeColors.primary} />
          ) : (
            <ProductEmptyState onAdd={handleAddNew} />
          )
        }
        contentContainerStyle={[
          hub.listContent,
          sellerProducts.length === 0 && { flexGrow: 1 },
        ]}
        showsVerticalScrollIndicator={false}
      />
      <ActionModal
        visible={deleteModalVisible}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalVisible(false);
            setSelectedProduct(null);
          }
        }}
        onContinue={handleConfirmDelete}
        title="Remove Listing?"
        subtitle={`Are you sure you want to permanently delete "${selectedProduct?.title || 'this listing'}"? This action cannot be undone.`}
        continueText="Delete"
        loading={isDeleting}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------
const getPayoutStatusStyle = (status: string) => {
  switch (status) {
    case 'success':
      return { bg: 'rgba(46, 204, 113, 0.15)', text: '#2ecc71' };
    case 'pending':
      return { bg: 'rgba(241, 196, 15, 0.15)', text: '#f1c40f' };
    case 'failed':
      return { bg: 'rgba(231, 76, 60, 0.15)', text: '#e74c3c' };
    default:
      return { bg: 'rgba(149, 165, 166, 0.15)', text: '#95a5a6' };
  }
};
/**
 * Each payout row must be its own component so currency conversion hooks
 * are called at the top level of a component. Calling hooks inside
 * FlatList's renderItem function crashes React Native.
 */
const PayoutHistoryItem = ({
  item,
  viewerCountry,
}: {
  item: Transactions;
  viewerCountry?: string;
}) => {
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation<any>();
  const { convertedValue } = useConvertedCurrency(
    item.amount,
    item.currency,
    viewerCountry,
  );

  const statusStyle = getPayoutStatusStyle(item.status);
  const isMoneyIn = item.payType === 'in';
  const isSuccessful = item.status === 'success';
  // Older payout records only have a document id, which the backend accepts.
  const transactionId = (item as any).transactionId || (item as any).id;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={!transactionId}
      onPress={() => navigation.navigate('TransactionDetail', { transactionId })}
      accessibilityRole="button"
      accessibilityLabel={`${item.title || 'Payout'}, ${item.status}. View details`}
      style={[
        styles.historyCard,
        {
          backgroundColor: themeColors.backgroundSecondary,
          borderLeftColor: isSuccessful ? themeColors.success : statusStyle.text,
        },
      ]}
    >
      <View style={styles.historyInfo}>
        <Text
          style={[styles.titleText, { color: themeColors.textDarker }]}
          numberOfLines={1}
        >
          {item.title || (item.type ? item.type.toUpperCase() : 'Transaction')}
        </Text>
        <Text
          style={[styles.refText, { color: themeColors.text }]}
          numberOfLines={1}
        >
          Ref: {item.reference}
        </Text>
        <Text style={[styles.historyDate, { color: themeColors.text }]}>
          {item.createdAt
            ? moment(parseFirestoreDate(item.createdAt)).format('MMM DD, YYYY • HH:mm')
            : 'Recent'}
        </Text>
      </View>
      <View style={styles.historyRight}>
        <View style={styles.amountRow}>
          <Text
            style={[
              styles.amountSign,
              { color: isSuccessful ? themeColors.success : themeColors.text },
            ]}
          >
            {isMoneyIn ? '+' : '-'}
          </Text>
          <CurrencyDisplay
            value={convertedValue}
            size="small"
            isSuccess={isSuccessful}
          />
        </View>
        <View style={hub.payoutRightRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status ? item.status.toUpperCase() : 'UNKNOWN'}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={themeColors.text} />
        </View>
      </View>
    </TouchableOpacity>
  );
};
export const PayoutView = () => {
  const { colors: themeColors } = useTheme();
  const { currentUser } = useAppDataContext();
  const { exchangeData } = useExchangeRate(currentUser?.country || 'Nigeria');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const [isAddBankVisible, setIsAddBankVisible] = useState(false);
  const currentBalance = currentUser?.pendingSalesBalance || 0;
  const isVerified = currentUser?.isVerified || false;

  useEffect(() => {
    loadInitialHistory();
  }, []);

  const loadInitialHistory = async () => {
    setLoading(true);
    const res = await fetchPayoutHistoryAPI();
    if (res.success) {
      setHistory(res.data);
      setHasMore(res.hasMore);
      setNextCursor(res.nextCursor);
    }
    setLoading(false);
  };

  const loadMoreHistory = async () => {
    if (loadingMore || !hasMore || !nextCursor) return;

    setLoadingMore(true);
    const res = await fetchPayoutHistoryAPI(nextCursor);
    if (res.success) {
      setHistory(prev => [...prev, ...res.data]);
      setHasMore(res.hasMore);
      setNextCursor(res.nextCursor);
    }
    setLoadingMore(false);
  };
  const executePayout = async () => {
    setRequesting(true);
    const res = await requestPayoutAPI(currentBalance);
    if (res.success) {
      dispatch(setUser({ ...currentUser }));
      Toast.show({
        type: 'success',
        text1: 'Payout Successful',
        text2: res.message || 'Payout processed successfully',
      });
      loadMoreHistory();
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'PayoutSuccess',
            params: {
              amount: currentBalance,
              transactionId: res.transactionId || 'N/A',
            },
          },
        ],
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Transaction Error',
        text2: res.message || 'An unexpected error occurred',
      });
    }
    setRequesting(false);
  };
  const renderHeader = () => {
    const hasPayoutAccount = !!currentUser?.subaccountId;

    return (
      <View
        style={[
          styles.balanceCard,
          { backgroundColor: themeColors.backgroundSecondary },
        ]}
      >
        <Text style={[styles.balanceLabel, { color: themeColors.textDarker }]}>
          Available for Payout
        </Text>
        <CurrencyDisplay value={currentBalance} size="large" />
        {!isVerified ? (
          <>
            <Text style={[styles.warningText, { color: themeColors.primary }]}>
              Identity verification is required for payout
            </Text>
            <CustomButton
              title="Verify Identity"
              style={styles.verifyBtn}
              onPress={() => navigation.navigate('PersonaVerify')}
            />
          </>
        ) : !hasPayoutAccount ? (
          <>
            <Text style={[styles.warningText, { color: themeColors.primary }]}>
              Payout bank account is required to withdraw funds
            </Text>
            <CustomButton
              title="Add Payout Bank"
              style={styles.verifyBtn}
              onPress={() => setIsAddBankVisible(true)}
            />
          </>
        ) : (
          <TouchableOpacity
            style={[
              styles.withdrawBtn,
              (currentBalance <= 0 || requesting) && styles.disabledBtn,
              { backgroundColor: themeColors.btnColor },
            ]}
            onPress={executePayout}
            disabled={currentBalance <= 0 || requesting}
          >
            {requesting ? (
              <ActivityIndicator
                color={themeColors.btnTextColor}
                size={'small'}
              />
            ) : (
              <>
                <MaterialIcons
                  name="account-balance-wallet"
                  size={20}
                  color={themeColors.btnTextColor}
                />
                <Text
                  style={[
                    styles.withdrawBtnText,
                    { color: themeColors.btnTextColor },
                  ]}
                >
                  Withdraw Funds
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
        <AddPaymentModal
          visible={isAddBankVisible}
          onClose={() => setIsAddBankVisible(false)}
          currencyData={exchangeData}
          user={currentUser}
          mode="withdraw"
        />
      </View>
    );
  };
  return (
    <>
      <FlatList
        data={history}
        keyExtractor={(item, index) =>
          item?.transactionId || item?.reference || `payout-${index}`
        }
        renderItem={({ item }) => (
          <PayoutHistoryItem item={item} viewerCountry={currentUser?.country} />
        )}
        ListHeaderComponent={renderHeader}
        onEndReached={loadMoreHistory}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              style={{ marginVertical: 20 }}
              color={themeColors.primary}
              size="small"
            />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              iconName="history"
              title="No Payouts Yet"
              subtitle="Your processed withdrawals will appear here."
            />
          ) : (
            <ActivityIndicator
              style={{ marginTop: 20 }}
              color={themeColors.primary}
              size="large"
            />
          )
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </>
  );
};
export const ReviewsSection = () => {
  const { colors } = useTheme();
  const { allReviews, setAllReviews } = useAppDataContext();
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const sellerReviews = allReviews;
  const totalReviews = sellerReviews.length;

  const avgRating =
    totalReviews > 0
      ? (
          sellerReviews.reduce((sum, r) => sum + (r?.rating || 0), 0) /
            totalReviews
        ).toFixed(1)
      : '0.0';

  const numericAvg = parseFloat(avgRating);
  const ratingColor =
    numericAvg < 2
      ? colors.primary
      : numericAvg < 3.5
        ? colors.primaryTint
        : colors.success;
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setPage(1);
    const response = await fetchUserReviewsAPI(1, 10);
    if (response.success) {
      setAllReviews(response.data);
      setHasMore(response.pagination.hasMore);
    }
    setIsRefreshing(false);
  };
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    const response = await fetchUserReviewsAPI(nextPage, 10);

    if (response.success) {
      setAllReviews(prev => [...prev, ...response.data]);
      setPage(nextPage);
      setHasMore(response.pagination.hasMore);
    }
    setIsLoadingMore(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      handleRefresh();
    }, []),
  );
  return (
    <View style={styles.container}>
      <View
        style={[styles.header, { backgroundColor: colors.backgroundSecondary }]}
      >
        <View style={styles.subheader}>
          <Text style={[styles.titleSecondary, { color: colors.textDarker }]}>
            Customer Feedback
          </Text>
          <Text style={[styles.count, { color: colors.text }]}>
            {totalReviews} Total Reviews
          </Text>
        </View>
        {avgRating && parseFloat(avgRating) > 0 && (
          <View style={styles.avgContainer}>
            <View style={styles.ratingRow}>
              <Text style={[styles.avgText, { color: ratingColor }]}>
                {avgRating}
              </Text>
              <MaterialIcons name="star" size={31} color={ratingColor} />
            </View>
            <Text style={[styles.performanceLabel, { color: ratingColor }]}>
              {numericAvg < 2
                ? 'Poor Performance'
                : numericAvg < 3.5
                  ? 'Average'
                  : 'Excellent'}
            </Text>
          </View>
        )}
      </View>
      <FlatList
        data={sellerReviews}
        keyExtractor={(item, index) =>
          item?.id || item?.reviewerId || `review-${index}`
        }
        renderItem={({ item }) => (item ? <ReviewItem review={item} /> : null)}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isRefreshing ? null : (
            <EmptyState
              iconName="rate-review"
              title="No Reviews Yet"
              subtitle="When customers rate your products or service, they will appear here."
              buttonText="Refresh Now"
              onPress={handleRefresh}
            />
          )
        }
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  statusRowB: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusCard: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 15,
    alignItems: 'center',
  },
  statusCount: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  statusLabel: { fontSize: 12 },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconContainerMini: {
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  emptyText: { fontSize: 14, marginTop: 15 },
  header: {
    padding: 20,
    width: '100%',
    marginBottom: 15,
  },
  subheader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  titleSecondary: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  count: {
    fontSize: 14,
  },
  avgContainer: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    flexDirection: 'row',
    marginTop: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  avgText: {
    fontSize: 25,
    fontWeight: '800',
    marginRight: 6,
  },
  performanceLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  chartTitle: { fontSize: 18, fontWeight: 'bold' },
  buyerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  buyerCardSubDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bodyCard: {
    padding: 15,
    borderRadius: 15,
  },
  avatar: { width: 45, height: 45, borderRadius: 22.5 },
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
    padding: 15,
    borderRadius: 15,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 12,
    marginRight: 5,
    fontWeight: '600',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    padding: 15,
    borderRadius: 15,
  },
  countText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addBtn: {
    width: 'auto',
    paddingHorizontal: 15,
  },
  listContainer: {
    paddingBottom: 40,
  },
  balanceCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 8,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  withdrawBtn: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  withdrawBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
  },
  verifyBtn: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  verifyBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  warningText: {
    fontSize: 14,
    marginVertical: 20,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    alignItems: 'flex-start',
  },
  imageContainer: {
    marginRight: 14,
  },
  thumbnail: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: '#eee',
  },
  infoContainer: {
    flex: 1,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  statsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 16,
  },
  actionIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  timeRange: {
    fontSize: 12,
    color: PRIMARY_COLOR_TINT,
    fontWeight: '600',
  },
  statsOverviewRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,107,0,0.1)',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  leftColumn: {
    flex: 1.2,
    gap: 12,
  },
  rightColumn: {
    flex: 1,
  },
  salesGraphBox: {
    flex: 1.4,
    padding: 14,
    borderRadius: 14,
    justifyContent: 'space-between',
  },
  ratingMiniBox: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    justifyContent: 'space-between',
  },
  ratingContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  impressionsTallBox: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    justifyContent: 'space-between',
  },
  graphHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  miniLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  financialsDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },
  financialSection: {
    width: '100%',
  },
  incomeCurrency: {
    marginVertical: 2,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  reviewHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  ratingTitle: {
    fontWeight: '700',
    fontSize: 15,
  },
  ratingSub: {
    fontSize: 12,
    marginTop: 2,
  },
  ratingValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontWeight: '700',
    fontSize: 18,
    marginRight: 4,
  },
  emptyStateCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSub: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 14,
  },
  addBtnSmall: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  newsCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  proTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  newsTag: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  newsText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 25,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: PRIMARY_COLOR_TINT,
    alignSelf: 'center',
    marginBottom: 15,
  },
  itemRow: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    marginVertical: 10,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyInfo: {
    flex: 1,
    marginRight: 10,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  refText: {
    fontSize: 12,
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 11,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  amountSign: {
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

const pickerSelectStyles = {
  inputIOS: {
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    paddingRight: 30,
    color: PRIMARY_COLOR,
  },
  inputAndroid: {
    paddingRight: 30,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
  },
};

// Styles for the redesigned Sales Hub tabs (orders, overview, inventory).
const hub = StyleSheet.create({
  listContent: { paddingTop: 4, paddingBottom: 40 },

  // Orders
  filterRow: { gap: 8, paddingBottom: 14, paddingRight: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.2,
    borderRadius: 20,
    paddingLeft: 13,
    paddingRight: 6,
    paddingVertical: 6,
  },
  filterChipText: { fontSize: 13, fontWeight: '700' },
  filterCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: { fontSize: 11, fontWeight: '800' },
  orderCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  orderTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderIconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderTitle: { fontSize: 15, fontWeight: '800' },
  orderMeta: { fontSize: 12, marginTop: 2, opacity: 0.75 },
  statusPill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  orderStatsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  orderStat: { flex: 1 },
  orderStatLabel: { fontSize: 11, fontWeight: '600', opacity: 0.7, marginBottom: 4 },
  orderStatValue: { fontSize: 14, fontWeight: '700' },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  orderFooterText: { flex: 1, fontSize: 13, lineHeight: 18 },
  orderAction: { marginTop: 12, borderRadius: 14 },

  // Overview
  heroCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heroLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  heroSub: { fontSize: 12, marginTop: 4, opacity: 0.7 },
  heroTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 16 },
  heroTrackFill: { height: '100%', borderRadius: 4 },
  heroSplitRow: { flexDirection: 'row', marginTop: 12 },
  heroSplit: { flex: 1 },
  heroLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  heroSplitLabel: { fontSize: 12, fontWeight: '600' },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 14,
  },
  statTile: { width: '48.5%', borderRadius: 16, padding: 14 },
  statTileIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statTileValue: { fontSize: 22, fontWeight: '800' },
  statTileLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  statTileHint: { fontSize: 11, marginTop: 4, opacity: 0.65 },
  sectionCard: { borderRadius: 18, padding: 16, marginBottom: 14 },
  sectionCardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  ordersSnapshotRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ordersSnapshotItem: { alignItems: 'center', flex: 1 },
  ordersSnapshotIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  ordersSnapshotCount: { fontSize: 18, fontWeight: '800' },
  ordersSnapshotLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  tipCard: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
  },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },

  // Inventory
  inventoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  inventoryCount: { fontSize: 17, fontWeight: '800' },
  inventorySub: { fontSize: 12, marginTop: 2, opacity: 0.75 },
  inventoryAddBtn: { width: 'auto', paddingHorizontal: 16, height: 38, borderRadius: 19 },
  productTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stockPillText: { fontSize: 12, fontWeight: '700' },

  // Payouts
  payoutRightRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
