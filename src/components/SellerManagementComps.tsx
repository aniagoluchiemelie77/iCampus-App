import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppDataContext } from './EventContext';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { useAppSelector } from './hooks';
import { formatStatNumber } from '../utils/followCountFormatter';
import { ProductSale } from '../types/firebase';
import { CurrencyDisplay } from './CurrencyFormatter';
import { SellerOrderAccordion } from './MyQRCodeSection';
import { EmptyState } from './EmptyFlatlistComponent';
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
export const OrdersList = () => {
  const { pendingOrders } = useAppDataContext();
  const currentUser = useAppSelector(state => state.user);
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
      {!hasProducts && (
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
          <TouchableOpacity style={styles.addBtnSmall}>
            <Text style={styles.addBtnText}>Upload First Product</Text>
          </TouchableOpacity>
        </View>
      )}
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
              <MaterialIcons name="bar-chart" size={16} color={PRIMARY_COLOR} />
            </View>
            <LineGraph
              trend={totalImpressions > 0 ? 'up' : 'down'}
              colorOverride="rgba(255,255,255,0.8)"
            />
            <View style={styles.ratingMiniBox}>
              <View style={styles.graphHeader}>
                <Text style={styles.miniLabel}>Total Income</Text>
                <MaterialIcons name="diamond" size={16} color={PRIMARY_COLOR} />
              </View>
              <CurrencyDisplay
                value={totalIncome}
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
      <View style={styles.reviewHighlight}>
        <View>
          <Text style={styles.ratingTitle}>Customer Satisfaction</Text>
          <Text style={styles.ratingSub}>
            {allRatings.length} {allRatings.length === 1 ? 'review' : 'reviews'}
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
    </ScrollView>
  );
};
export const ProductList = () => {
  return <Text>ProductList</Text>;
};
export const PayoutView = () => {
  return <Text>PayoutView</Text>;
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
    color: PRIMARY_COLOR,
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
    marginBottom: 6,
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
});
