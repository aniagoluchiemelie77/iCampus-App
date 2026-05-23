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
}) => (
  <View style={styles.listHeader}>
    <Text style={styles.countText}>
      {count} {count === 1 ? 'Product' : 'Products'}
    </Text>
    <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
      <MaterialIcons name="add-business-outlined" size={20} color="#FFF" />
      <Text style={styles.addBtnText}>New</Text>
    </TouchableOpacity>
  </View>
);
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
}: {
  trend: 'up' | 'down';
  colorOverride?: string;
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
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0.01" />
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
}: StatusCardMiniProps) => (
  <View style={[styles.statusCard, { borderLeftColor: color }]}>
    <View style={styles.statusIconContainer}>
      <MaterialIcons name={icon} size={22} color={color} />
    </View>
    <View>
      <CurrencyDisplay value={count} size="medium" />
      <Text style={[styles.statusLabel, { marginTop: 4 }]}>{label}</Text>
    </View>
  </View>
);
export const OrdersList = () => {
  const { pendingOrders, currentUser } = useAppDataContext();
  const sellerOrders = pendingOrders
    .filter(o => o.sellerId === currentUser.uid)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  if (sellerOrders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons
          name="hourglass-disabled-outlined"
          size={50}
          color={PRIMARY_COLOR}
        />
        <Text style={styles.emptyText}>No orders found yet.</Text>
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
          color="#FF9800"
          icon="delivery-dining-outlined"
        />
        <StatusCard
          label="Completed"
          count={formatStatNumber(
            sellerOrders.filter(o => o.status === 'completed').length,
          )}
          color="#4CAF50"
          icon="check-circle-outlined"
        />
        <StatusCard
          label="Cancelled"
          count={formatStatNumber(
            sellerOrders.filter(o => o.status === 'cancelled').length,
          )}
          color={PRIMARY_COLOR}
          icon="cancel-outlined"
        />
      </View>
      <FlatList
        data={sellerOrders}
        keyExtractor={item => item.orderId}
        renderItem={({ item }) => <SellerOrderAccordion order={item} />}
        contentContainerStyle={{ paddingBottom: 30, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      />
    </>
  );
};
export const OverviewsScreenComponent = () => {
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
        <View style={styles.emptyStateCard}>
          <MaterialIcons
            name="add-shopping-cart"
            size={45}
            color={PRIMARY_COLOR}
          />
          <Text style={styles.emptyStateTitle}>Start Selling</Text>
          <Text style={styles.emptyStateSub}>
            You haven't uploaded any products yet.
          </Text>
          <TouchableOpacity
            style={styles.addBtnSmall}
            onPress={() => navigation.navigate('CreateProduct')}
          >
            <Text style={styles.addBtnText}>Upload First Product</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.timeRange}>Total Reach</Text>
          </View>
          <View style={styles.statsOverviewRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {formatStatNumber(totalImpressions)}
              </Text>
              <Text style={styles.statLabel}>Impressions</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {formatStatNumber(totalSalesCount)}
              </Text>
              <Text style={styles.statLabel}>Total Sales</Text>
            </View>
          </View>
          <View style={styles.gridContainer}>
            <View style={styles.leftColumn}>
              <View style={styles.salesGraphBox}>
                <View style={styles.graphHeader}>
                  <Text style={styles.miniLabel}>Sales Growth</Text>
                  <MaterialIcons
                    name={totalSalesCount > 0 ? 'trending-up' : 'trending-flat'}
                    size={16}
                    color={PRIMARY_COLOR}
                  />
                </View>
                <LineGraph trend={totalSalesCount > 5 ? 'up' : 'down'} />
              </View>
              <View style={styles.ratingMiniBox}>
                <View style={styles.graphHeader}>
                  <Text style={styles.miniLabel}>Rating</Text>
                  <MaterialIcons name="star" size={16} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{avgRating}</Text>
                  <MaterialIcons
                    name="star"
                    size={19}
                    color={PRIMARY_COLOR}
                    style={{ marginLeft: 4 }}
                  />
                </View>
              </View>
            </View>
            <View style={styles.rightColumn}>
              <View style={styles.impressionsTallBox}>
                <View style={styles.graphHeader}>
                  <Text style={styles.miniLabel}>Impressions</Text>
                  <MaterialIcons
                    name="bar-chart"
                    size={16}
                    color={PRIMARY_COLOR}
                  />
                </View>
                <LineGraph
                  trend={totalImpressions > 0 ? 'up' : 'down'}
                  colorOverride="rgba(255,255,255,0.8)"
                />
                <View style={styles.ratingMiniBox}>
                  <View style={[styles.graphHeader, { marginBottom: 3 }]}>
                    <Text style={styles.miniLabel}>Total Income</Text>
                    <MaterialIcons
                      name="diamond"
                      size={16}
                      color={PRIMARY_COLOR}
                    />
                  </View>
                  <CurrencyDisplay
                    value={totalIncome}
                    size="medium"
                    containerStyle={styles.incomeCurrency}
                  />
                  <View style={[styles.graphHeader, { marginVertical: 3 }]}>
                    <Text style={styles.miniLabel}>Available For Payout</Text>
                    <MaterialIcons
                      name="diamond"
                      size={16}
                      color={PRIMARY_COLOR}
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
          </View>
          <View style={styles.statusRow}>
            <StatusCard
              label="Pending"
              count={formatStatNumber(
                sellerOrders.filter(o => o.status === 'pending_delivery')
                  .length,
              )}
              color="#FF9800"
              icon="delivery-dining-outlined"
            />
            <StatusCard
              label="Completed"
              count={formatStatNumber(
                sellerOrders.filter(o => o.status === 'completed').length,
              )}
              color="#4CAF50"
              icon="check-circle-outlined"
            />
            <StatusCard
              label="Cancelled"
              count={formatStatNumber(
                sellerOrders.filter(o => o.status === 'cancelled').length,
              )}
              color={PRIMARY_COLOR}
              icon="cancel-outlined"
            />
          </View>
          <View style={styles.reviewHighlight}>
            <View>
              <Text style={styles.ratingTitle}>Customer Satisfaction</Text>
              <Text style={styles.ratingSub}>
                {allRatings.length}{' '}
                {allRatings.length === 1 ? 'review' : 'reviews'}
              </Text>
            </View>
            <View style={styles.ratingValueBox}>
              <Text style={styles.ratingText}>{avgRating}</Text>
              <MaterialIcons name="star" size={16} color={PRIMARY_COLOR} />
            </View>
          </View>
          <View style={styles.newsCard}>
            <Text style={styles.newsTag}>PRO TIP</Text>
            <Text style={styles.newsText}>
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
  const { allProducts, currentUser } = useAppDataContext();
  const navigation = useNavigation<any>();
  const sellerProducts = allProducts.filter(
    p => p.sellerId === currentUser.uid,
  );
  const hasProducts = sellerProducts.length > 0;
  const renderProductItem = ({ item }: { item: Product }) => {
    const isPhysical = item.type === 'physical';
    const isLowStock =
      isPhysical &&
      (item.amountInStock ?? 0) > 0 &&
      (item.amountInStock ?? 0) < 5;
    const isOutOfStock = isPhysical && item.amountInStock === 0;

    return (
      <TouchableOpacity style={styles.card}>
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: item.mediaUrls[0] || 'https://via.placeholder.com/150',
            }}
            style={styles.thumbnail}
          />
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          <Text style={styles.category}>{item.category}</Text>
          <View style={styles.detailsRow}>
            {isPhysical ? (
              <View style={styles.badge}>
                <MaterialIcons
                  name="inventory-outlined"
                  size={14}
                  color={
                    isOutOfStock
                      ? PRIMARY_COLOR
                      : isLowStock
                      ? '#FF9800'
                      : '#4CAF50'
                  }
                />
                <Text
                  style={[
                    styles.detailText,
                    isOutOfStock && { color: PRIMARY_COLOR },
                  ]}
                >
                  {isOutOfStock
                    ? 'Out of Stock'
                    : `${item.amountInStock} in Stock`}
                </Text>
              </View>
            ) : item.type === 'course' ? (
              <View style={styles.badge}>
                <MaterialIcons
                  name="play-circle-outline"
                  size={14}
                  color={PRIMARY_COLOR}
                />
                <Text style={styles.detailText}>
                  {item.courseDetails?.totalLessons || 0} Lessons
                </Text>
              </View>
            ) : (
              <View style={styles.badge}>
                <MaterialIcons
                  name="insert-drive-file"
                  size={14}
                  color={PRIMARY_COLOR}
                />
                <Text style={styles.detailText}>
                  {item.fileDetails?.fileFormat?.toUpperCase() || 'FILE'}
                </Text>
              </View>
            )}
            <CurrencyDisplay value={item.priceInPoints} size="medium" />
          </View>
          <View style={styles.statsFooter}>
            <View style={styles.statItem}>
              <MaterialIcons
                name="shopping-cart-outlined"
                size={14}
                color={PRIMARY_COLOR_TINT}
              />
              <Text style={styles.statLabel}>{item.sales || 0}</Text>
            </View>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() =>
                navigation.navigate('CreateProduct', {
                  product: item,
                })
              }
            >
              <MaterialIcons
                name="edit-outlined"
                size={17}
                color={PRIMARY_COLOR}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem}>
              <MaterialIcons
                name="delete-outlined"
                size={17}
                color={PRIMARY_COLOR}
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
        <View style={styles.emptyStateCard}>
          <MaterialIcons
            name="add-shopping-cart"
            size={45}
            color={PRIMARY_COLOR}
          />
          <Text style={styles.emptyStateTitle}>Start Selling</Text>
          <Text style={styles.emptyStateSub}>
            You haven't uploaded any products yet.
          </Text>
          <TouchableOpacity
            style={styles.addBtnSmall}
            onPress={() => navigation.navigate('CreateProduct')}
          >
            <Text style={styles.addBtnText}>Upload First Product</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.statusRow}>
            <StatusCard
              label="Total Products Count"
              count={formatStatNumber(sellerProducts.length)}
              color={PRIMARY_COLOR}
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
  const { currentUser } = useAppDataContext();
  const [history, setHistory] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const currentBalance = currentUser?.pendingSalesBalance || 0;
  const isVerified =
    (currentUser?.isVerified && currentUser?.twoFactorEnabled) || false;

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
        'Your account must be verified and 2 factor authentification enabled...',
      );
      return;
    }
    if (currentBalance < 5) {
      Alert.alert('Low Balance', 'Minimum payout amount is 5.00 iCash');
      return;
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
    <View style={styles.historyCard}>
      <View style={styles.historyInfo}>
        <Text style={styles.historyMethod}>
          {item.method || 'Internal Transfer'}
        </Text>
        <Text style={styles.historyDate}>
          {moment(item.createdAt).format('MMM DD, YYYY • HH:mm')}
        </Text>
        <Text style={styles.refText}>{item.reference}</Text>
      </View>
      <View style={styles.historyRight}>
        <CurrencyDisplay value={item.amount} size="small" />
        <Text style={styles.statusBadge}>{item.status}</Text>
      </View>
    </View>
  );
  const renderHeader = () => (
    <View style={styles.balanceCard}>
      <Text style={styles.balanceLabel}>Available for Payout</Text>
      <CurrencyDisplay value={currentBalance} size="large" />
      {!isVerified ? (
        <>
          <Text style={styles.warningText}>
            Verification and 2-factor authentication is required for payout
          </Text>
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={() => navigation.navigate('PersonaVerify')}
          >
            <Text style={styles.verifyBtnText}>Verify Identity</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={[
            styles.withdrawBtn,
            (currentBalance <= 0 || requesting) && styles.disabledBtn,
          ]}
          onPress={handleWithdraw}
          disabled={currentBalance <= 0 || requesting}
        >
          {requesting ? (
            <ActivityIndicator color={PRIMARY_COLOR} />
          ) : (
            <>
              <MaterialIcons
                name="account-balance-wallet-outlined"
                size={20}
                color={PRIMARY_COLOR}
              />
              <Text style={styles.withdrawBtnText}>Withdraw Funds</Text>
            </>
          )}
        </TouchableOpacity>
      )}
      <Text style={styles.sectionTitleInside}>Payout History</Text>
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
              color={PRIMARY_COLOR}
              size="small"
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
        <View style={styles.emptyStateCard}>
          <MaterialIcons
            name="add-shopping-cart"
            size={45}
            color={PRIMARY_COLOR}
          />
          <Text style={styles.emptyStateTitle}>Start Selling</Text>
          <Text style={styles.emptyStateSub}>
            You haven't uploaded any products yet.
          </Text>
          <TouchableOpacity
            style={styles.addBtnSmall}
            onPress={() => navigation.navigate('CreateProduct')}
          >
            <Text style={styles.addBtnText}>Upload First Product</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.statusRowB}>
            <StatusCardMini
              label="Total Generated Income"
              count={totalIncome}
              color="#FF9800"
              icon="diamond-outlined"
            />
            <StatusCardMini
              label="Available For Payout"
              count={currentBalance}
              color="#4CAF50"
              icon="diamond-outlined"
            />
          </View>
          <View style={styles.graphCard}>
            <View style={styles.graphHeader}>
              <Text style={styles.chartTitle}>Revenue Trend</Text>
              <CurrencyDisplay value={monthlyStats.total} size="medium" />
            </View>
            <View style={styles.dropdownRow}>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Year</Text>
                <RNPickerSelect
                  onValueChange={value => setSelectedYear(value)}
                  items={yearItems}
                  value={selectedYear}
                  style={pickerSelectStyles}
                  useNativeAndroidPickerStyle={false}
                />
              </View>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Month</Text>
                <RNPickerSelect
                  onValueChange={value => setSelectedMonth(value)}
                  items={availableMonths}
                  value={selectedMonth}
                  style={pickerSelectStyles}
                  useNativeAndroidPickerStyle={false}
                />
              </View>
            </View>
            <View style={{ height: 120 }}>
              <LineGraph trend={monthlyStats.trend as 'up' | 'down'} />
            </View>
          </View>
          <Text style={styles.sectionTitle}>Your Top Customers</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.buyerScroll}
          >
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
                  containerStyle={{ marginTop: 8 }}
                />
                <View style={styles.spentText}>
                  <CurrencyDisplay value={buyer.totalSpent} size="medium" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
};
export const ReviewsSection = () => {
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
    numericAvg < 2 ? PRIMARY_COLOR : numericAvg < 3.5 ? '#FF9800' : '#4CAF50';
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshReviews();
    setIsRefreshing(false);
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.subheader}>
          <Text style={styles.title}>Customer Feedback</Text>
          <Text style={styles.count}>{totalReviews} Total Reviews</Text>
        </View>
        <View style={styles.avgContainer}>
          <View style={styles.ratingRow}>
            <Text style={[styles.avgText, { color: ratingColor }]}>
              {avgRating}
            </Text>
            <MaterialIcons name="star" size={20} color={ratingColor} />
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
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
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
    backgroundColor: '#fadccc',
    borderLeftWidth: 1,
    width: '30%',
    padding: 12,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusCount: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  statusLabel: { fontSize: 11, color: '#2222' },
  reviewHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 15,
  },
  ratingTitle: { fontWeight: '600', fontSize: 15, color: '#2222' },
  ratingSub: { fontSize: 12, color: PRIMARY_COLOR, marginTop: 4 },
  ratingValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: { fontWeight: 'bold', color: PRIMARY_COLOR, marginRight: 4 },
  emptyStateCard: {
    backgroundColor: '#fff',
    alignContent: 'center',
    flex: 1,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 15,
    color: PRIMARY_COLOR,
  },
  emptyStateSub: {
    color: PRIMARY_COLOR_TINT,
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
  },
  addBtnSmall: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignContent: 'center',
    borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  newsCard: { backgroundColor: '#fadccc', padding: 15, borderRadius: 12 },
  newsTag: {
    fontWeight: '900',
    color: '#222',
    fontSize: 11,
    marginBottom: 5,
    textAlign: 'center',
  },
  newsText: { color: PRIMARY_COLOR, fontSize: 13, lineHeight: 18 },
  statsOverviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 15,
  },
  statBox: {
    backgroundColor: '#fadccc',
    padding: 16,
    borderRadius: 12,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#2222',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: PRIMARY_COLOR,
  },
  gridContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
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
    padding: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  ratingMiniBox: {
    flex: 0.6,
    padding: 12,
    elevation: 2,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  impressionsTallBox: {
    flex: 1,
    backgroundColor: '#fadccc',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  graphHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniLabel: {
    fontSize: 11,
    color: '#222',
    fontFamily: 'Inter-Medium',
  },
  statusIconContainer: {
    marginBottom: 10,
    padding: 5,
    alignContent: 'center',
  },
  incomeCurrency: {
    flex: 1,
  },
  emptyContainer: { flex: 1, alignContent: 'center', backgroundColor: '#fff' },
  emptyText: { color: PRIMARY_COLOR, fontSize: 15, marginTop: 15 },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
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
    color: '#333',
  },
  count: {
    fontSize: 13,
    color: PRIMARY_COLOR,
  },
  avgContainer: {
    alignContent: 'center',
    flexDirection: 'row',
    padding: 15,
    borderWidth: 1,
    borderRadius: 15,
    backgroundColor: '#fadccc',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avgText: {
    fontSize: 22,
    fontWeight: '800',
    marginRight: 4,
  },
  performanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginLeft: 6,
  },
  graphCard: {
    margin: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#fadccc',
    elevation: 5,
  },
  chartTitle: { color: '#222', fontSize: 16 },
  buyerScroll: { paddingLeft: 16, paddingVertical: 15, marginVertical: 15 },
  buyerCard: {
    width: 140,
    backgroundColor: '#fadccc',
    borderRadius: 15,
    padding: 15,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  spentText: {
    marginTop: 6,
  },
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 15,
  },
  pickerContainer: {
    width: '48%', // Leaves a small gap in the middle
  },
  pickerLabel: {
    fontSize: 12,
    color: PRIMARY_COLOR_TINT,
    marginBottom: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
    alignSelf: 'flex-end',
  },
  countText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addBtn: {
    flexDirection: 'row',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  imageContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  typeBadge: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    backgroundColor: '#fff',
  },
  typeText: {
    fontSize: 9,
    fontWeight: '900',
    color: PRIMARY_COLOR,
  },

  infoContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  category: {
    fontSize: 12,
    color: PRIMARY_COLOR_TINT,
    marginTop: -2,
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fadccc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#555',
    fontWeight: '500',
  },
  statsFooter: {
    flexDirection: 'row',
    borderTopWidth: 0.8,
    borderTopColor: PRIMARY_COLOR_TINT,
    marginTop: 10,
    paddingTop: 8,
    gap: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    backgroundColor: '#F8F9FB', // Light gray background
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: '#fadccc',
    borderBottomRightRadius: 24,
    borderBottomLeftRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 8,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  balanceLabel: {
    color: '#222',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  withdrawBtn: {
    backgroundColor: PRIMARY_COLOR,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  withdrawBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    marginLeft: 8,
  },
  verifyBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 15,
    alignContent: 'center',
  },
  verifyBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  warningText: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 15,
    paddingHorizontal: 20,
    lineHeight: 18,
    opacity: 0.9,
  },
  // History Items
  sectionTitleInside: {
    alignSelf: 'flex-start',
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 30,
  },
  historyCard: {
    backgroundColor: '#fadccc',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  historyInfo: {
    flex: 1,
  },
  historyMethod: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  historyDate: {
    fontSize: 12,
    color: '#2222',
    marginTop: 4,
  },
  refText: {
    fontSize: 9,
    color: PRIMARY_COLOR,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2222',
    marginTop: 6,
    overflow: 'hidden',
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
    color: PRIMARY_COLOR,
    backgroundColor: '#fadccc',
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    color: PRIMARY_COLOR,
    backgroundColor: '#fadccc',
    paddingRight: 30,
  },
};
