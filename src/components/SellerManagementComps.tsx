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
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { useAppDataContext } from './EventContext';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { useAppSelector } from './hooks';
import { formatStatNumber } from '../utils/followCountFormatter';
import { ProductSale, UserTier, Product, Payout } from '../types/firebase';
import { CurrencyDisplay } from './CurrencyFormatter';
import { SellerOrderAccordion } from './MyQRCodeSection';
import { EmptyState } from './EmptyFlatlistComponent';
import { searchUsersByUid, fetchPayoutHistoryAPI } from '../api/localGetApis';
import { requestPayoutAPI } from '../api/localPostApis';
import { deleteProductApi } from '../api/localDeleteApis';
import { UserAvatar } from './UserAvatar';
import { IcashPinOrFingerprintVerifyModal } from './iCashPinOrFingerprintVerifyComponent';
import { UserIdentity } from './UserIdentity';
import { useNavigation } from '@react-navigation/native';
import RNPickerSelect from 'react-native-picker-select';
import moment from 'moment';
import { useDispatch } from 'react-redux';
import { setUser } from './UserSlice';
import Svg, {
  Polyline,
  Defs,
  LinearGradient,
  Stop,
  Path,
} from 'react-native-svg';
import { ReviewItem } from './ReviewItem';
import { useTheme } from '../context/ThemeContext';

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
  return(
  <View style={[styles.listHeader, {backgroundColor: themeColors.backgroundSecondary}]}>
    <Text style={[styles.countText, {color: themeColors.textDarker}]}>
      {count} {count === 1 ? 'Product' : 'Products'}
    </Text>
    <TouchableOpacity style={[styles.addBtn, {backgroundColor: themeColors.btnColor}]} onPress={onAdd}>
      <MaterialIcons name="add-business-outlined" size={20} color={themeColors.btnTextColor} />
      <Text style={[styles.addBtnText, {marginLeft: 4, color: themeColors.btnTextColor}]}>New</Text>
    </TouchableOpacity>
  </View>
)};
const ProductEmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <EmptyState
    iconName="store-front-outlined"
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
        <CurrencyDisplay value={count} size="medium" isSuccess={isSuccess} />
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
          name="hourglass-disabled-outlined"
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
          icon="delivery-dining-outlined"
        />
        <StatusCard
          label="Completed"
          count={formatStatNumber(
            sellerOrders.filter(o => o.status === 'completed').length,
          )}
          color={themeColors.success}
          icon="check-circle-outlined"
        />
        <StatusCard
          label="Cancelled"
          count={formatStatNumber(
            sellerOrders.filter(o => o.status === 'cancelled').length,
          )}
          color={themeColors.primary}
          icon="cancel-outlined"
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
  const { allProducts, pendingOrders, sellerSales } = useAppDataContext();
  const currentUser = useAppSelector(state => state.user);
  const navigation = useNavigation<any>();

  const sellerProducts = allProducts.filter(
    p => p.sellerId === currentUser.uid,
  );
  const sellerOrders = pendingOrders.filter(
    o => o.sellerId === currentUser.uid,
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
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
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
          <TouchableOpacity
            style={[
              styles.addBtnSmall,
              { backgroundColor: themeColors.btnColor },
            ]}
            onPress={() => navigation.navigate('CreateProduct')}
          >
            <Text
              style={[styles.addBtnText, { color: themeColors.btnTextColor }]}
            >
              Upload First Product
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View
            style={[
              styles.sectionHeader,
              { backgroundColor: themeColors.backgroundSecondary },
            ]}
          >
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.timeRange}>Total Reach</Text>
          </View>
          <View style={styles.statsOverviewRow}>
            <View
              style={[
                styles.statBox,
                { backgroundColor: themeColors.backgroundSecondary },
              ]}
            >
              <Text
                style={[styles.statValue, { color: themeColors.textDarker }]}
              >
                {formatStatNumber(totalImpressions)}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.text }]}>
                Impressions
              </Text>
            </View>
            <View
              style={[
                styles.statBox,
                { backgroundColor: themeColors.backgroundSecondary },
              ]}
            >
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
          <View style={styles.gridContainer}>
            <View style={styles.leftColumn}>
              <View
                style={[
                  styles.salesGraphBox,
                  { backgroundColor: themeColors.backgroundSecondary },
                ]}
              >
                <View
                  style={[styles.graphHeader, { padding: 0, borderRadius: 0 }]}
                >
                  <Text style={[styles.miniLabel, { color: themeColors.text }]}>
                    Sales Growth
                  </Text>
                  <MaterialIcons
                    name={totalSalesCount > 0 ? 'trending-up' : 'trending-flat'}
                    size={16}
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
                <View
                  style={[styles.graphHeader, { padding: 0, borderRadius: 0 }]}
                >
                  <Text style={[styles.miniLabel, { color: themeColors.text }]}>
                    Rating
                  </Text>
                  <MaterialIcons
                    name="star"
                    size={16}
                    color={themeColors.primary}
                  />
                </View>
                <View style={[styles.statBox, { padding: 0, borderRadius: 0 }]}>
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
                    size={26}
                    color={themeColors.primary}
                    style={{ marginLeft: 5 }}
                  />
                </View>
              </View>
            </View>
            <View style={styles.rightColumn}>
              <View
                style={[
                  styles.impressionsTallBox,
                  { backgroundColor: themeColors.backgroundSecondary },
                ]}
              >
                <View
                  style={[styles.graphHeader, { padding: 0, borderRadius: 0 }]}
                >
                  <Text
                    style={[
                      styles.miniLabel,
                      { color: themeColors.textDarker },
                    ]}
                  >
                    Impressions
                  </Text>
                  <MaterialIcons
                    name="bar-chart"
                    size={16}
                    color={themeColors.primary}
                  />
                </View>
                <LineGraph
                  trend={totalImpressions > 0 ? 'up' : 'down'}
                  colorOverride="rgba(255,255,255,0.8)"
                  themeBackgroundColor={themeColors.backgroundSecondary}
                />
                <View
                  style={[
                    styles.ratingMiniBox,
                    { padding: 0, borderRadius: 0 },
                  ]}
                >
                  <View
                    style={[
                      styles.graphHeader,
                      { marginBottom: 5, padding: 0, borderRadius: 0 },
                    ]}
                  >
                    <Text
                      style={[styles.miniLabel, { color: themeColors.text }]}
                    >
                      Total Generated Income
                    </Text>
                    <MaterialIcons
                      name="diamond-outlined"
                      size={16}
                      color={themeColors.primary}
                    />
                  </View>
                  <CurrencyDisplay
                    value={totalIncome}
                    size="medium"
                    containerStyle={styles.incomeCurrency}
                  />
                  <View
                    style={[
                      styles.graphHeader,
                      { marginVertical: 5, padding: 0, borderRadius: 0 },
                    ]}
                  >
                    <Text
                      style={[styles.miniLabel, { color: themeColors.text }]}
                    >
                      Available For Payout
                    </Text>
                    <MaterialIcons
                      name="diamond-outlined"
                      size={16}
                      color={themeColors.success}
                    />
                  </View>
                  <CurrencyDisplay
                    value={currentBalance}
                    size="medium"
                    containerStyle={styles.incomeCurrency}
                    isSuccess={true}
                  />
                </View>
              </View>
            </View>
          </View>
          {sellerOrders.length > 0 && (
            <View style={styles.statusRow}>
              <StatusCard
                label="Pending Orders"
                count={formatStatNumber(
                  sellerOrders.filter(o => o.status === 'pending_delivery')
                    .length,
                )}
                color={themeColors.pendingDelivery}
                icon="delivery-dining-outlined"
              />
              <StatusCard
                label="Completed Orders"
                count={formatStatNumber(
                  sellerOrders.filter(o => o.status === 'completed').length,
                )}
                color={themeColors.success}
                icon="check-circle-outlined"
              />
              <StatusCard
                label="Cancelled Orders"
                count={formatStatNumber(
                  sellerOrders.filter(o => o.status === 'cancelled').length,
                )}
                color={themeColors.primary}
                icon="cancel-outlined"
              />
            </View>
          )}
          <View
            style={[
              styles.reviewHighlight,
              { backgroundColor: themeColors.backgroundSecondary },
            ]}
          >
            <View>
              <Text style={[styles.ratingTitle, { color: themeColors.text }]}>
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
          <View
            style={[
              styles.newsCard,
              { backgroundColor: themeColors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.newsTag, { color: themeColors.text }]}>
              PRO TIP
            </Text>
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
  const { allProducts, currentUser, deleteProductLocal } = useAppDataContext();
  const navigation = useNavigation<any>();
  const sellerProducts = allProducts.filter(
    p => p.sellerId === currentUser.uid,
  );
  const hasProducts = sellerProducts.length > 0;
  const handleDeletePress = (productId: string, productTitle: string) => {
    Alert.alert(
      'Remove Listing?',
      `Are you sure you want to permanently delete "${productTitle}"? This will clear all hosted media assets and cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteProductApi(productId);
              if (result.success) {
                await deleteProductLocal(productId);
                Toast.show({
                  type: 'success',
                  text2: 'Product has been permanently removed.',
                });
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
            }
          },
        },
      ],
      { cancelable: true },
    );
  };
  const renderProductItem = ({ item }: { item: Product }) => {
    const isPhysical = item.type === 'physical';
    const isLowStock =
      isPhysical &&
      (item.amountInStock ?? 0) > 0 &&
      (item.amountInStock ?? 0) < 5;
    const isOutOfStock = isPhysical && item.amountInStock === 0;

    return (
      <TouchableOpacity style={[styles.card, {backgroundColor: themeColors.backgroundSecondary}]}>
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: item.mediaUrls[0] || 'https://via.placeholder.com/150',
            }}
            style={styles.thumbnail}
          />
          <View style={[styles.typeBadge, {backgroundColor: themeColors.backgroundSecondary}]}>
            <Text style={[styles.typeText, {color: themeColors.text}]}>{item.niche}</Text>
          </View>
        </View>
        <View style={styles.infoContainer}>
            <Text style={[styles.title, {color: themeColors.textDarker}]}>
              {item.title}
            </Text>
          <View style={styles.detailsRow}>
            <View style={styles.badge}>
            {isPhysical ? (
              <>
                <MaterialIcons
                  name="inventory-outlined"
                  size={16}
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
                    isOutOfStock ? { color: themeColors.primary } : {color: themeColors.text}
                  ]}
                >
                  {isOutOfStock
                    ? 'Out of Stock'
                    : `${item.amountInStock} in Stock`}
                </Text>
              </>
            ) : item.type === 'course' ? (
              <>
                <MaterialIcons
                  name="play-circle-outline"
                  size={14}
                  color={themeColors.text}
                />
                <Text style={[styles.detailText, {color: themeColors.text}]}>
                  {item.courseDetails?.content.length || 0} Lessons
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons
                  name="insert-drive-file"
                  size={14}
                  color={themeColors.text}
                />
                <Text style={[styles.detailText, {color: themeColors.text}]}>
                  {item.fileDetails?.fileFormat?.toUpperCase() || 'FILE'}
                </Text>
              </>
            )}
            </View>
            <CurrencyDisplay value={item.priceInPoints} size="medium" />
          </View>
          <View style={styles.statsFooter}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('CreateProduct', {
                  product: item,
                })
              }
            >
              <MaterialIcons
                name="edit-outlined"
                size={22}
                color={themeColors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeletePress(item.productId, item.title)}
            >
              <MaterialIcons
                name="delete-outlined"
                size={22}
                color={themeColors.primary}
              />
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
        <View style={[styles.emptyStateCard, {backgroundColor: themeColors.backgroundSecondary}]}>
          <MaterialIcons
            name="add-shopping-cart"
            size={60}
            color={themeColors.primary}
          />
          <Text style={[styles.emptyStateTitle, {color: themeColors.textDarker}]}>Start Selling</Text>
          <Text style={[styles.emptyStateSub, {color: themeColors.text}]}>
            You haven't uploaded any products yet.
          </Text>
          <TouchableOpacity
            style={[styles.addBtnSmall, {backgroundColor: themeColors.btnColor}]}
            onPress={() => navigation.navigate('CreateProduct')}
          >
            <Text style={[styles.addBtnText, {color: themeColors.btnTextColor}]}>Create Listing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.statusRow}>
            <StatusCard
              label="Total Products Count"
              count={formatStatNumber(sellerProducts.length)}
              color={themeColors.textDarker}
              icon="store-front-outlined"
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
        </>
      )}
    </ScrollView>
  );
};
export const PayoutView = () => {
  const { colors: themeColors } = useTheme();
  const { currentUser } = useAppDataContext();
  const [history, setHistory] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

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
  const handleWithdraw = async () => {
    if (!isVerified) {
      Alert.alert(
        'Verification Required',
        'Your account must be verified and Icash PIN created...',
      );
      return;
    }
    if (currentBalance < 5) {
      Alert.alert('Low Balance', 'Minimum payout amount is 5.00 iCash');
      return;
    }
    if (!currentUser.twoFactorEnabled) {
      navigation.navigate('iCashSecurity');
    }
    setIsPinVisible(true);
  };
  const executePayout = async () => {
    setIsPinVisible(false);
    setRequesting(true);
    const res = await requestPayoutAPI(currentBalance);
    if (res.success) {
      dispatch(
        setUser({ ...currentUser, pointsBalance: res.newPointsBalance }),
      );
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
    <View style={[styles.historyCard, {backgroundColor: themeColors.backgroundSecondary}]}>
      <View style={styles.historyInfo}>
        <Text style={[styles.refText, {color: themeColors.text}]}>{item.reference}</Text>
        <Text style={[styles.historyDate, {color: themeColors.text}]}>
          {moment(item.createdAt).format('MMM DD, YYYY • HH:mm')}
        </Text>
      </View>
      <View style={styles.historyRight}>
        <CurrencyDisplay value={item.amount} size="small" isSuccess={true}/>
        <Text style={[styles.statusBadge, {color: themeColors.success}]}>{item.status}</Text>
      </View>
    </View>
  );
  const renderHeader = () => (
    <View style={styles.balanceCard}>
      <Text style={[styles.balanceLabel, {color: themeColors.textDarker}]}>Available for Payout</Text>
      <CurrencyDisplay value={currentBalance} size="large" isSuccess={true} />
      {!isVerified || !currentUser.twoFactorEnabled ? (
        <>
          <Text style={[styles.warningText, {color: themeColors.primary}]}>
            {!isVerified ? 'Account verification' : 'Icash PIN' } is required for payout
          </Text>
          <TouchableOpacity
            style={[styles.verifyBtn, {backgroundColor: themeColors.btnColor}]}
            onPress={() => {
              if (!isVerified){
                navigation.navigate('PersonaVerify');
              }else {
                navigation.navigate('iCashSecurity');
              }
            }}
          >
            <Text style={[styles.verifyBtnText, {color: themeColors.btnTextColor}]}>
              {!isVerified ? 'Verify Identity' : 'Create Icash PIN' }
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={[
            styles.withdrawBtn,
            (currentBalance <= 0 || requesting) && styles.disabledBtn,
            {backgroundColor: themeColors.btnColor}
          ]}
          onPress={handleWithdraw}
          disabled={currentBalance <= 0 || requesting}
        >
          {requesting ? (
            <ActivityIndicator color={themeColors.btnTextColor} size={'small'} />
          ) : (
            <>
              <MaterialIcons
                name="account-balance-wallet-outlined"
                size={20}
                color={themeColors.btnTextColor}
              />
              <Text style={[styles.withdrawBtnText, {color: themeColors.btnTextColor}]}>Withdraw Funds</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
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
      <IcashPinOrFingerprintVerifyModal
        navigation={navigation}
        isVisible={isPinVisible}
        onClose={() => setIsPinVisible(false)}
        onSuccess={executePayout}
        title="Confirm Payout"
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

    // Handle year roll-over for previous month comparison
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

    const prevMonthTotal = filterSales(prevMonth, prevYear).reduce(
      (sum, s) => sum + s.netEarnings,
      0,
    );

    return {
      total: currentMonthTotal,
      trend: (currentMonthTotal >= prevMonthTotal ? 'up' : 'down') as
        | 'up'
        | 'down',
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
          <TouchableOpacity
            style={[styles.addBtnSmall, { backgroundColor: colors.btnColor }]}
            onPress={() => navigation.navigate('CreateProduct')}
          >
            <Text style={[styles.addBtnText, { color: colors.btnTextColor }]}>
              Upload First Product
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.statusRowB}>
            <StatusCardMini
              label="Total Generated Income"
              count={totalIncome}
              color={colors.pendingDelivery}
              icon="diamond-outlined"
            />
            <StatusCardMini
              label="Available For Payout"
              count={currentBalance}
              color={colors.success}
              icon="diamond-outlined"
              isSuccess={true}
            />
          </View>
          <View
            style={[
              styles.graphHeader,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.chartTitle, {color: colors.textDarker}]}>Revenue Trend</Text>
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
                  <CurrencyDisplay
                    value={buyer.totalSpent}
                    size="medium"
                    isSuccess={true}
                  />
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
  const currentUser = useAppSelector(state => state.user);
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
          <Text style={[styles.title, { color: colors.textDarker }]}>
            Customer Feedback
          </Text>
          <Text style={[styles.count, { color: colors.text }]}>
            {totalReviews} Total Reviews
          </Text>
        </View>
        <View style={styles.avgContainer}>
          <View style={styles.ratingRow}>
            <Text style={[styles.avgText, { color: ratingColor }]}>
              {avgRating}
            </Text>
            <MaterialIcons name="star" size={28} color={ratingColor} />
          </View>
          <Text style={[styles.performanceLabel, { color: ratingColor }]}>
            {numericAvg < 2
              ? 'Poor Performance'
              : numericAvg < 3.5
              ? 'Average'
              : 'Excellent'}
          </Text>
        </View>
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
            iconName="rate-review-outlined"
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
  container: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    padding: 15,
    borderRadius: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  timeRange: { fontSize: 12, color: PRIMARY_COLOR_TINT },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
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
  reviewHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  ratingTitle: { fontWeight: '600', fontSize: 14 },
  ratingSub: { fontSize: 12, marginTop: 4 },
  ratingValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: { fontWeight: 'bold', fontSize: 16, marginRight: 5 },
  emptyStateCard: {
    padding: 15,
    borderRadius: 15,
    alignContent: 'center',
    flex: 1,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  emptyStateSub: {
    marginBottom: 20,
    fontSize: 14,
  },
  addBtnSmall: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignContent: 'center',
    borderRadius: 15,
  },
  addBtnText: { fontWeight: '600', fontSize: 14 },
  newsCard: { padding: 15, borderRadius: 15, alignItems: 'center' },
  newsTag: {
    fontWeight: '900',
    fontSize: 14,
    marginBottom: 15,
  },
  newsText: { fontSize: 14, width: '100%' },
  statsOverviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statBox: {
    padding: 15,
    borderRadius: 15,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    fontWeight: 'bold',
  },
  gridContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 220,
    marginBottom: 20,
  },
  leftColumn: {
    flex: 2,
    marginRight: 10,
    justifyContent: 'space-between',
  },
  rightColumn: {
    flex: 1,
  },
  salesGraphBox: {
    flex: 1.4,
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  ratingMiniBox: {
    flex: 0.6,
    padding: 15,
    borderRadius: 15,
    elevation: 2,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  impressionsTallBox: {
    flex: 1,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  graphHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 15,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Inter-Medium',
  },
  statusIconContainer: {
    marginBottom: 10,
    alignContent: 'center',
  },
  incomeCurrency: {
    flex: 1,
  },
  emptyContainer: { flex: 1, alignContent: 'center', padding: 10 },
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
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15
  },
  count: {
    fontSize: 12,
  },
  avgContainer: {
    alignContent: 'center',
    flexDirection: 'row',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avgText: {
    fontSize: 22,
    fontWeight: '800',
    marginRight: 5,
  },
  performanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginLeft: 6,
  },
  chartTitle: {fontSize: 18, fontWeight: 'bold' },
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
    borderRadius: 15
  },
  countText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addBtn: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 2,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    alignItems: 'center'
  },
  imageContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  typeBadge: {
    position: 'absolute',
    top: -5,
    left: 5,
    padding: 5,
    borderRadius: 3,
    alignContent: 'center'
  },
  typeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },

  infoContainer: {
    flex: 1,
    marginLeft: 15,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
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
    alignSelf: 'flex-end'
  },
  listContainer: {
    paddingBottom: 40,
  },
  balanceCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 8,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    alignItems: 'center'
  },
  balanceLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  withdrawBtn: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 15,
    alignContent: 'center',
    marginTop: 20,
  },
  withdrawBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
  },
  verifyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 15,
    marginTop: 10,
    alignContent: 'center',
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
    marginBottom: 15,
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
    fontSize: 14,
    marginBottom: 5,
  },
  historyRight: {
    marginRight: 8,
    alignItems: 'center'
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
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
