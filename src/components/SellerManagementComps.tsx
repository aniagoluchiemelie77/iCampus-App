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
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { useAppDataContext } from '../context/EventContext';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { useAppSelector } from '../hooks/hooks';
import { formatStatNumber } from '../utils/followCountFormatter';
import { ProductSale, UserTier, Product, Payout } from '../types/firebase';
import { CurrencyDisplay } from './CurrencyFormatter';
import { SellerOrderAccordion } from './MyQRCodeSection';
import { EmptyState } from './EmptyFlatlistComponent';
import { searchUsersByUid, fetchPayoutHistoryAPI } from '../api/localGetApis';
import { requestPayoutAPI } from '../api/localPostApis';
import { deleteProductApi } from '../api/localDeleteApis';
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
  icon: string;
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
        {count} {count === 1 ? 'Product' : 'Products'}
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
  icon,
  isSuccess,
}: StatusCardMiniProps) => {
  const { colors: themeColor } = useTheme();
  return (
    <View style={[styles.statusCard, { borderColor: color }]}>
      <View style={styles.statusIconContainer}>
        <MaterialIcons name={icon} size={22} color={color} />
      </View>
      <View>
        <CurrencyDisplay value={count} size="medium" />
        <Text
          style={[styles.statusLabel, { marginTop: 4, color: themeColor.text }]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
};
export const OrdersList = () => {
  const { colors: themeColors } = useTheme();
  const { pendingOrders, currentUser, fetchPendingOrders } =
    useAppDataContext();
  const sellerOrders = pendingOrders
    .filter(o => o.sellerId === currentUser.uid)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  if (sellerOrders.length === 0) {
    return (
      <View
        style={[
          styles.emptyContainer,
          { backgroundColor: themeColors.backgroundSecondary },
        ]}
      >
        <MaterialIcons
          name="hourglass-disabled"
          size={50}
          color={themeColors.text}
        />
        <Text style={[styles.emptyText, { color: themeColors.text }]}>
          No orders found yet.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.statusRow}>
        <StatusCard
          label="Pending"
          count={formatStatNumber(
            sellerOrders.filter(o => o.status === 'pending_delivery').length,
          )}
          color={themeColors.pendingDelivery}
          icon="delivery-dining"
        />
        <StatusCard
          label="Completed"
          count={formatStatNumber(
            sellerOrders.filter(o => o.status === 'completed').length,
          )}
          color={themeColors.success}
          icon="check-circle"
        />
        <StatusCard
          label="Cancelled"
          count={formatStatNumber(
            sellerOrders.filter(o => o.status === 'cancelled').length,
          )}
          color={themeColors.primary}
          icon="cancel"
        />
      </View>
      <FlatList
        data={sellerOrders}
        keyExtractor={item => item.orderId}
        renderItem={({ item }) => (
          <SellerOrderAccordion
            order={item}
            onStatusUpdated={fetchPendingOrders}
          />
        )}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      />
    </>
  );
};
export const OverviewsScreenComponent = () => {
  const { colors: themeColors } = useTheme();
  const { pendingOrders, sellerSales } = useAppDataContext();
  const currentUser = useAppSelector(state => state.user) || {};
  const { sellerProducts } = useSellerProducts(currentUser?.uid);
  const navigation = useNavigation<any>();

  const sellerOrders = (pendingOrders || []).filter(
    o => o?.sellerId === currentUser?.uid,
  );
  const hasProducts = sellerProducts.length > 0;
  const totalImpressions = sellerProducts.reduce(
    (sum, p) => sum + (p.impressions || 0),
    0,
  );
  const allRatings = sellerProducts.flatMap(p => p.ratings || []);
  const currentBalance = currentUser.pendingSalesBalance || 0;
  const avgRating =
    allRatings.length > 0
      ? (
          allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length
        ).toFixed(1)
      : '0.0';
  const totalIncome: number = sellerSales.reduce(
    (sum: number, sale: ProductSale) => sum + sale.netEarnings,
    0,
  );
  const totalSalesCount = sellerSales.reduce(
    (sum: number, sale: ProductSale) => sum + sale.quantity,
    0,
  );
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={[styles.contentContainer]}
    >
      {!hasProducts ? (
        <View
          style={[
            styles.emptyStateCard,
            { backgroundColor: themeColors.backgroundSecondary },
          ]}
        >
          <MaterialIcons
            name="add-shopping-cart"
            size={60}
            color={themeColors.primary}
          />
          <Text
            style={[styles.emptyStateTitle, { color: themeColors.textDarker }]}
          >
            Start Selling
          </Text>
          <Text style={[styles.emptyStateSub, { color: themeColors.text }]}>
            You haven't uploaded any products yet.
          </Text>
          <CustomButton
            title="Upload your first listing"
            onPress={() => navigation.navigate('CreateProduct')}
            style={[styles.addBtnSmall]}
          />
        </View>
      ) : (
        <>
          {/* Overview Header */}
          <View
            style={[
              styles.sectionHeader,
              { backgroundColor: themeColors.backgroundSecondary },
            ]}
          >
            <Text
              style={[styles.sectionTitle, { color: themeColors.textDarker }]}
            >
              Overview
            </Text>
            <Text style={styles.timeRange}>Total Reach</Text>
          </View>

          {/* Core Stats Row */}
          <View style={styles.statsOverviewRow}>
            <View
              style={[
                styles.statBox,
                { backgroundColor: themeColors.backgroundSecondary },
              ]}
            >
              <MaterialIcons
                name="visibility"
                size={20}
                color={themeColors.primary}
                style={styles.statIcon}
              />
              <View>
                <Text
                  style={[styles.statValue, { color: themeColors.textDarker }]}
                >
                  {formatStatNumber(totalImpressions)}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.text }]}>
                  Impressions
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.statBox,
                { backgroundColor: themeColors.backgroundSecondary },
              ]}
            >
              <MaterialIcons
                name="shopping-bag"
                size={20}
                color={themeColors.primary}
                style={styles.statIcon}
              />
              <View>
                <Text
                  style={[styles.statValue, { color: themeColors.textDarker }]}
                >
                  {formatStatNumber(totalSalesCount)}
                </Text>
                <Text style={[styles.statLabel, { color: themeColors.text }]}>
                  Total Sales
                </Text>
              </View>
            </View>
          </View>

          {/* Grid Container for Graphs and Financials */}
          <View style={styles.gridContainer}>
            {/* Left Column: Sales Growth & Quick Rating */}
            <View style={styles.leftColumn}>
              <View
                style={[
                  styles.salesGraphBox,
                  { backgroundColor: themeColors.backgroundSecondary },
                ]}
              >
                <View style={styles.graphHeader}>
                  <Text style={[styles.miniLabel, { color: themeColors.text }]}>
                    Sales Growth
                  </Text>
                  <MaterialIcons
                    name={totalSalesCount > 0 ? 'trending-up' : 'trending-flat'}
                    size={18}
                    color={themeColors.primary}
                  />
                </View>
                <LineGraph
                  trend={totalSalesCount > 5 ? 'up' : 'down'}
                  themeBackgroundColor={themeColors.backgroundSecondary}
                />
              </View>

              <View
                style={[
                  styles.ratingMiniBox,
                  { backgroundColor: themeColors.backgroundSecondary },
                ]}
              >
                <View style={styles.graphHeader}>
                  <Text style={[styles.miniLabel, { color: themeColors.text }]}>
                    Rating
                  </Text>
                  <MaterialIcons
                    name="star"
                    size={18}
                    color={themeColors.primary}
                  />
                </View>
                <View style={styles.ratingContentRow}>
                  <Text
                    style={[
                      styles.statValue,
                      { color: themeColors.textDarker },
                    ]}
                  >
                    {avgRating}
                  </Text>
                  <MaterialIcons
                    name="star"
                    size={24}
                    color={themeColors.primary}
                    style={{ marginLeft: 6 }}
                  />
                </View>
              </View>
            </View>

            {/* Right Column: Impressions & Financials (Rendered conditionally if impressions exist, or layout shifts cleanly) */}
            {totalImpressions > 0 && (
              <View style={styles.rightColumn}>
                <View
                  style={[
                    styles.impressionsTallBox,
                    { backgroundColor: themeColors.backgroundSecondary },
                  ]}
                >
                  <View style={styles.graphHeader}>
                    <Text
                      style={[
                        styles.miniLabel,
                        { color: themeColors.textDarker },
                      ]}
                    >
                      Impressions Activity
                    </Text>
                    <MaterialIcons
                      name="bar-chart"
                      size={18}
                      color={themeColors.primary}
                    />
                  </View>
                  <LineGraph
                    trend={totalImpressions > 0 ? 'up' : 'down'}
                    colorOverride="rgba(255,255,255,0.8)"
                    themeBackgroundColor={themeColors.backgroundSecondary}
                  />

                  <View style={styles.financialsDivider} />

                  <View style={styles.financialSection}>
                    <View style={styles.graphHeader}>
                      <Text
                        style={[styles.miniLabel, { color: themeColors.text }]}
                      >
                        Total Generated Income
                      </Text>
                      <MaterialIcons
                        name="diamond"
                        size={16}
                        color={themeColors.primary}
                      />
                    </View>
                    <CurrencyDisplay
                      value={totalIncome}
                      size="medium"
                      containerStyle={styles.incomeCurrency}
                    />

                    <View style={[styles.graphHeader, { marginTop: 10 }]}>
                      <Text
                        style={[styles.miniLabel, { color: themeColors.text }]}
                      >
                        Available For Payout
                      </Text>
                      <MaterialIcons
                        name="account-balance-wallet"
                        size={16}
                        color={themeColors.success}
                      />
                    </View>
                    <CurrencyDisplay
                      value={currentBalance}
                      size="medium"
                      containerStyle={styles.incomeCurrency}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Orders Status Row */}
          {sellerOrders.length > 0 && (
            <View style={styles.statusRow}>
              <StatusCard
                label="Pending"
                count={formatStatNumber(
                  sellerOrders.filter(o => o.status === 'pending_delivery')
                    .length,
                )}
                color={themeColors.pendingDelivery}
                icon="delivery-dining"
              />
              <StatusCard
                label="Completed"
                count={formatStatNumber(
                  sellerOrders.filter(o => o.status === 'completed').length,
                )}
                color={themeColors.success}
                icon="check-circle"
              />
              <StatusCard
                label="Cancelled"
                count={formatStatNumber(
                  sellerOrders.filter(o => o.status === 'cancelled').length,
                )}
                color={themeColors.primary}
                icon="cancel"
              />
            </View>
          )}

          {/* Customer Satisfaction / Reviews Section (Conditionally Rendered) */}
          {allRatings.length > 0 && (
            <View
              style={[
                styles.reviewHighlight,
                { backgroundColor: themeColors.backgroundSecondary },
              ]}
            >
              <View>
                <Text
                  style={[
                    styles.ratingTitle,
                    { color: themeColors.textDarker },
                  ]}
                >
                  Customer Satisfaction
                </Text>
                <Text style={[styles.ratingSub, { color: themeColors.text }]}>
                  {allRatings.length}{' '}
                  {allRatings.length === 1 ? 'review' : 'reviews'}
                </Text>
              </View>
              <View style={styles.ratingValueBox}>
                <Text
                  style={[styles.ratingText, { color: themeColors.textDarker }]}
                >
                  {avgRating}
                </Text>
                <MaterialIcons
                  name="star"
                  size={20}
                  color={themeColors.primary}
                />
              </View>
            </View>
          )}

          {/* Pro Tip Card */}
          <View
            style={[
              styles.newsCard,
              { backgroundColor: themeColors.backgroundSecondary },
            ]}
          >
            <View style={styles.proTipHeader}>
              <MaterialIcons
                name="lightbulb"
                size={16}
                color={themeColors.primary}
              />
              <Text style={[styles.newsTag, { color: themeColors.primary }]}>
                PRO TIP
              </Text>
            </View>
            <Text style={[styles.newsText, { color: themeColors.text }]}>
              {totalImpressions > 0 && totalSalesCount === 0
                ? 'High impressions but no sales? Try lowering your price or adding clearer descriptions.'
                : "Keep your stock updated! Products marked 'In Stock' get 2x more clicks."}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
};
export const ProductList = () => {
  const { colors: themeColors } = useTheme();
  const { currentUser, deleteProductLocal } = useAppDataContext();
  const navigation = useNavigation<any>();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { sellerProducts, refreshProducts } = useSellerProducts(
    currentUser?.uid,
  );

  const hasProducts = sellerProducts.length > 0;
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
    const isPhysical = item.type === 'physical';
    const isLowStock =
      isPhysical &&
      (item.amountInStock ?? 0) > 0 &&
      (item.amountInStock ?? 0) < 5;
    const isOutOfStock = isPhysical && item.amountInStock === 0;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: themeColors.backgroundSecondary },
        ]}
        activeOpacity={0.8}
      >
        {/* Thumbnail Container */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: item.mediaUrls[0] || 'https://via.placeholder.com/150',
            }}
            style={styles.thumbnail}
          />
        </View>

        {/* Info Container */}
        <View style={styles.infoContainer}>
          {/* Niche / Category Pill */}
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: themeColors.primary + '15' },
            ]}
          >
            <Text style={[styles.typeText, { color: themeColors.primary }]}>
              {item.niche?.toUpperCase()}
            </Text>
          </View>

          {/* Title */}
          <Text
            style={[styles.title, { color: themeColors.textDarker }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          {/* Stock & Price Row */}
          <View style={styles.detailsRow}>
            <View style={styles.badge}>
              <MaterialIcons
                name="inventory"
                size={14}
                color={
                  isOutOfStock
                    ? themeColors.primary
                    : isLowStock
                      ? themeColors.primaryTint
                      : themeColors.text
                }
              />
              <Text
                style={[
                  styles.detailText,
                  isOutOfStock
                    ? { color: themeColors.primary, fontWeight: '600' }
                    : { color: themeColors.text },
                ]}
              >
                {isOutOfStock
                  ? 'Out of Stock'
                  : `${item.amountInStock ?? 0} in stock`}
              </Text>
            </View>
            <CurrencyDisplay value={item.price} size="medium" />
          </View>

          {/* Actions Footer */}
          <View
            style={[
              styles.statsFooter,
              { borderTopColor: themeColors.border || 'rgba(0,0,0,0.05)' },
            ]}
          >
            <TouchableOpacity
              style={styles.actionIconButton}
              onPress={() =>
                navigation.navigate('CreateProduct', {
                  product: item,
                })
              }
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
      </TouchableOpacity>
    );
  };
  const handleAddNew = () => {
    navigation.navigate('CreateProduct');
  };
  return (
    <ScrollView>
      {!hasProducts ? (
        <View
          style={[
            styles.emptyStateCard,
            { backgroundColor: themeColors.backgroundSecondary },
          ]}
        >
          <MaterialIcons
            name="add-shopping-cart"
            size={60}
            color={themeColors.primary}
          />
          <Text
            style={[styles.emptyStateTitle, { color: themeColors.textDarker }]}
          >
            Start Selling
          </Text>
          <Text style={[styles.emptyStateSub, { color: themeColors.text }]}>
            You haven't uploaded any products yet.
          </Text>
          <CustomButton
            title="Upload your first listing"
            onPress={() => navigation.navigate('CreateProduct')}
            style={[styles.addBtnSmall]}
          />
        </View>
      ) : (
        <>
          <View style={styles.statusRow}>
            <StatusCard
              label="Total Products Count"
              count={formatStatNumber(sellerProducts.length)}
              color={themeColors.textDarker}
              icon="storefront"
            />
          </View>
          <FlatList
            data={sellerProducts}
            keyExtractor={item => item.productId}
            renderItem={renderProductItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListHeaderComponent={
              <ProductListHeader
                count={sellerProducts.length}
                onAdd={handleAddNew}
              />
            }
            ListEmptyComponent={<ProductEmptyState onAdd={handleAddNew} />}
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
            subtitle={`Are you sure you want to permanently delete "${selectedProduct?.title || ''}"? This will clear all hosted media assets and cannot be undone.`}
            continueText="Delete"
            loading={isDeleting}
          />
        </>
      )}
    </ScrollView>
  );
};
export const PayoutView = () => {
  const { colors: themeColors } = useTheme();
  const { currentUser } = useAppDataContext();
  const { exchangeData } = useExchangeRate(currentUser.country || 'Nigeria');
  const [history, setHistory] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const [isAddBankVisible, setIsAddBankVisible] = useState(false);
  const currentBalance = currentUser?.pendingSalesBalance || 0;
  const isVerified = currentUser?.isVerified || false;

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const res = await fetchPayoutHistoryAPI();
    if (res.success) setHistory(res.data);
    setLoading(false);
  };
  const executePayout = async () => {
    setRequesting(true);
    const res = await requestPayoutAPI(currentBalance);
    if (res.success) {
      dispatch(setUser({ ...currentUser }));
      Toast.show({
        type: 'success',
        text1: 'Fetch Error',
        text2: res.message || 'Payout processed successfully',
      });
      loadHistory();
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
  const renderHistoryItem = (item: Payout) => (
    <View
      style={[
        styles.historyCard,
        { backgroundColor: themeColors.backgroundSecondary },
      ]}
    >
      <View style={styles.historyInfo}>
        <Text style={[styles.refText, { color: themeColors.text }]}>
          {item.reference}
        </Text>
        <Text style={[styles.historyDate, { color: themeColors.text }]}>
          {moment(item.createdAt).format('MMM DD, YYYY • HH:mm')}
        </Text>
      </View>
      <View style={styles.historyRight}>
        <CurrencyDisplay value={item.amount} size="small" />
        <Text style={[styles.statusBadge, { color: themeColors.text }]}>
          {item.status}
        </Text>
      </View>
    </View>
  );
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
        keyExtractor={item => item.payoutId}
        renderItem={({ item }) => renderHistoryItem(item)}
        ListHeaderComponent={renderHeader}
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
export const SalesScreen = () => {
  const { colors } = useTheme();
  const { sellerSales, currentUser } = useAppDataContext();
  const navigation = useNavigation<any>();
  const [topBuyersProfiles, setTopBuyersProfiles] = useState<TopBuyerProfile[]>(
    [],
  );
  const hasProducts = sellerSales.length > 0;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIndex);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const yearItems = [
    { label: '2025', value: 2025 },
    { label: '2026', value: 2026 },
  ];

  const allMonths = [
    { label: 'January', value: 0 },
    { label: 'February', value: 1 },
    { label: 'March', value: 2 },
    { label: 'April', value: 3 },
    { label: 'May', value: 4 },
    { label: 'June', value: 5 },
    { label: 'July', value: 6 },
    { label: 'August', value: 7 },
    { label: 'September', value: 8 },
    { label: 'October', value: 9 },
    { label: 'November', value: 10 },
    { label: 'December', value: 11 },
  ];
  const availableMonths = allMonths.filter(
    m => selectedYear < currentYear || m.value <= currentMonthIndex,
  );

  const topBuyersList = useMemo(() => {
    const counts = sellerSales.reduce<Record<string, number>>((acc, sale) => {
      acc[sale.buyerId] = (acc[sale.buyerId] || 0) + sale.amountPaid;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 8);
  }, [sellerSales]);
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!currentUser?.tier || !currentUser?.usertype) return;
      const profiles = await Promise.all(
        topBuyersList.map(async ([uid, totalSpent]) => {
          const result = await searchUsersByUid(
            uid,
            currentUser.tier!,
            currentUser.usertype!,
          );
          const userData = Array.isArray(result) ? result[0] : result;
          if (!userData) return null;
          return {
            ...userData,
            totalSpent,
          } as TopBuyerProfile;
        }),
      );
      const validProfiles = profiles.filter(
        (p): p is TopBuyerProfile => p !== null && !!p.uid,
      );
      setTopBuyersProfiles(validProfiles);
    };
    if (topBuyersList.length > 0) {
      fetchProfiles();
    }
  }, [topBuyersList, currentUser?.tier, currentUser?.usertype]);
  const monthlyStats = useMemo(() => {
    const filterSales = (m: number, y: number) =>
      sellerSales.filter(s => {
        const d = new Date(s.createdAt);
        return d.getMonth() === m && d.getFullYear() === y;
      });

    const currentMonthTotal = filterSales(selectedMonth, selectedYear).reduce(
      (sum, s) => sum + s.netEarnings,
      0,
    );
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

    const prevMonthTotal = filterSales(prevMonth, prevYear).reduce(
      (sum, s) => sum + s.netEarnings,
      0,
    );

    return {
      total: currentMonthTotal,
      trend: (currentMonthTotal >= prevMonthTotal ? 'up' : 'down') as
        'up' | 'down',
    };
  }, [selectedMonth, selectedYear, sellerSales]);
  const totalIncome: number = sellerSales.reduce(
    (sum: number, sale: ProductSale) => sum + (sale.netEarnings || 0),
    0,
  );
  const currentBalance = currentUser.pendingSalesBalance || 0;

  return (
    <ScrollView style={styles.container}>
      {!hasProducts ? (
        <View
          style={[
            styles.emptyStateCard,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <MaterialIcons
            name="add-shopping-cart"
            size={60}
            color={colors.primary}
          />
          <Text style={[styles.emptyStateTitle, { color: colors.textDarker }]}>
            Start Selling
          </Text>
          <Text style={[styles.emptyStateSub, { color: colors.text }]}>
            You haven't uploaded any products yet.
          </Text>
          <CustomButton
            title="Upload your first listing"
            style={[styles.verifyBtn]}
            onPress={() => navigation.navigate('CreateProduct')}
          />
        </View>
      ) : (
        <>
          <View style={styles.statusRowB}>
            <StatusCardMini
              label="Total Generated Income"
              count={totalIncome}
              color={colors.pendingDelivery}
              icon="diamond"
            />
            <StatusCardMini
              label="Available For Payout"
              count={currentBalance}
              color={colors.success}
              icon="diamond"
              isSuccess={true}
            />
          </View>
          <View
            style={[
              styles.graphHeader,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.chartTitle, { color: colors.textDarker }]}>
              Revenue Trend
            </Text>
            <CurrencyDisplay value={monthlyStats.total} size="medium" />
          </View>
          <View
            style={[
              styles.dropdownRow,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <View style={styles.pickerContainer}>
              <Text style={[styles.pickerLabel, { color: colors.text }]}>
                Year
              </Text>
              <RNPickerSelect
                onValueChange={value => setSelectedYear(value)}
                items={yearItems}
                value={selectedYear}
                style={{
                  ...pickerSelectStyles,
                  inputIOS: {
                    ...pickerSelectStyles.inputIOS,
                    color: colors.text,
                  },
                  inputAndroid: {
                    ...pickerSelectStyles.inputAndroid,
                    color: colors.text,
                  },
                  iconContainer: {
                    top: 10,
                    right: 12,
                  },
                }}
                useNativeAndroidPickerStyle={false}
              />
            </View>
            <View style={styles.pickerContainer}>
              <Text style={[styles.pickerLabel, { color: colors.text }]}>
                Month
              </Text>
              <RNPickerSelect
                onValueChange={value => setSelectedMonth(value)}
                items={availableMonths}
                value={selectedMonth}
                style={{
                  ...pickerSelectStyles,
                  inputIOS: {
                    ...pickerSelectStyles.inputIOS,
                    color: colors.text,
                  },
                  inputAndroid: {
                    ...pickerSelectStyles.inputAndroid,
                    color: colors.text,
                  },
                  iconContainer: {
                    top: 10,
                    right: 12,
                  },
                }}
                useNativeAndroidPickerStyle={false}
              />
            </View>
          </View>
          <View style={{ height: 120 }}>
            <LineGraph
              trend={monthlyStats.trend as 'up' | 'down'}
              themeBackgroundColor={colors.backgroundSecondary}
            />
          </View>
          <View
            style={[
              styles.bodyCard,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>
              Your Top Customers
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {topBuyersProfiles.map(buyer => (
                <TouchableOpacity
                  key={buyer.uid}
                  style={styles.buyerCard}
                  onPress={() =>
                    navigation.navigate('Profile', {
                      identifier: buyer.uid,
                    })
                  }
                >
                  <View style={styles.buyerCardSubDiv}>
                    <UserAvatar
                      profilePic={buyer.profilePic}
                      firstName={buyer.firstname}
                      lastName={buyer.lastname}
                      style={styles.avatar}
                    />
                    <UserIdentity
                      firstname={buyer.firstname}
                      lastname={buyer.lastname}
                      tier={buyer?.tier || 'free'}
                      organizationName={buyer.organizationName}
                      size="small"
                      containerStyle={{ marginLeft: 8 }}
                    />
                  </View>
                  <CurrencyDisplay value={buyer.totalSpent} size="medium" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </ScrollView>
  );
};
export const ReviewsSection = () => {
  const { colors } = useTheme();
  const { allReviews, refreshReviews } = useAppDataContext();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const currentUser = useAppSelector(state => state.user) || {};
  const sellerReviews = allReviews.filter(r => r.targetId === currentUser.uid);
  const totalReviews = sellerReviews.length;
  const avgRating =
    totalReviews > 0
      ? (
          sellerReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
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
    await refreshReviews();
    setIsRefreshing(false);
  };
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
        keyExtractor={item => item.reviewerId}
        renderItem={({ item }) => <ReviewItem review={item} />}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            iconName="rate-review"
            title="No Reviews Yet"
            subtitle="When customers rate your products or service, they will appear here."
            buttonText="Refresh Now"
            onPress={handleRefresh}
          />
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
  historyCard: {
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 11,
  },
  refText: {
    fontSize: 12,
    marginBottom: 6,
  },
  historyRight: {
    marginRight: 8,
    alignItems: 'center',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
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
