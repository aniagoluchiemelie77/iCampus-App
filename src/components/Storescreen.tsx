import React, { useState } from 'react';
import {
  Dimensions,
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ProductCard } from './ProductCard';
import { fetchProductsAPI } from '../api/localGetApis';
import { completeOrderDelivery } from '../api/localPostApis';
import { Product } from '../types/firebase';
import { useAppDataContext } from '../context/EventContext.tsx';
import { EmptyState } from './EmptyFlatlistComponent';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from '../hooks/hooks.ts';
import { PageHeader } from './PageHeader';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { OrderScannerModal } from './OrderQRScannerModal';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContext';
import ExpandableFAB from './ExpandableFAB.tsx';
import { initialState } from '../context/UserSlice.ts';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface IconButtonProps {
  onPress: () => void;
  count?: number;
  icon: string;
  badgeColor?: string;
  colors: any;
}

const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Stationery',
  'Snacks and Deserts',
  'Food',
  'FootWears',
  'Health and Beauty',
];
const STORE_TABS = ['All', 'Popular', ...CATEGORIES];

const HeaderActionButton = ({
  onPress,
  count,
  icon,
  badgeColor = PRIMARY_COLOR,
  colors,
}: IconButtonProps) => (
  <TouchableOpacity onPress={onPress} style={[styles.actionButtonContainer]}>
    <MaterialIcons name={icon} size={24} color={PRIMARY_COLOR} />
    {count! > 0 && (
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <Text style={[styles.badgeText, { color: colors.btnTextColor }]}>
          {count}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

export const StoreScreen = () => {
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isFabMenuVisible, setFabMenuVisible] = useState(false);
  const { pendingOrders } = useAppDataContext();
  const navigation = useNavigation<any>();
  const currentUser = useAppSelector(state => state.user) || initialState;
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [selectedTab, setSelectedTab] = useState('All');
  const [cursor, setCursor] = useState<string | null>(null);
  const toggleFab = () => setFabMenuVisible(!isFabMenuVisible);
  const headerRightElement = (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <HeaderActionButton
        icon="qr-code-scanner"
        onPress={() => setIsScannerOpen(true)}
        colors={colors}
      />
      <HeaderActionButton
        icon="inventory"
        count={pendingOrders?.length || 0}
        onPress={() => navigation.navigate('PendingOrdersScreen')}
        colors={colors}
      />
    </View>
  );
  const loadMore = async () => {
    if (isFetchingMore || !cursor) return;
    setIsFetchingMore(true);
    const result = await fetchProductsAPI({
      q: searchQuery,
      category: selectedTab.toLowerCase(),
      cursor: cursor,
      limit: 10,
    });
    if (result.success) {
      setProducts((prev: Product[]) => [...prev, ...result.data]);
      setCursor(result.nextCursor);
    }
    setIsFetchingMore(false);
  };
  const handleCompleteOrder = async (orderId: string) => {
    setIsScannerOpen(false);
    setLoading(true);

    try {
      const response = await completeOrderDelivery(orderId);
      if (response.success) {
        Toast.show({
          type: 'success',
          text2:
            response.message ||
            'Transaction completed successfully, funds wil be released immediately.',
        });
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'OrderVerificationSuccess',
              params: {
                orderId: response.orderId,
                amount: response.settlementAmount,
                role: response.role,
                productName: response.productName,
              },
            },
          ],
        });
      } else {
        Toast.show({
          type: 'error',
          text2: response.message || 'Order verification failed, please retry.',
        });
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Verification Error',
        text2: err.message || 'Order verification failed, please retry.',
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <PageHeader
        title="iCampus Store"
        showBackButton={false}
        rightElement={headerRightElement}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarScrollContainer}
        style={[
          styles.tabBarWrapper,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        {STORE_TABS.map(tab => {
          const isActive = selectedTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab)}
              style={[styles.tab, isActive && styles.activeTab]}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive ? { color: colors.primary } : { color: colors.text },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {loading && !isFetchingMore ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.productId}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <ProductCard
                product={item}
                onPress={() =>
                  navigation.navigate('ProductDetails', {
                    productId: item.productId,
                  })
                }
              />
            </View>
          )}
          onEndReached={() => loadMore()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingMore ? (
              <ActivityIndicator color={PRIMARY_COLOR} size="small" />
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title={searchQuery ? 'No Products Found' : 'No Products Listed'}
                subtitle={
                  searchQuery
                    ? `We couldn't find anything for "${searchQuery}" in ${selectedTab}.`
                    : 'Empty product list, please refresh.'
                }
                buttonText={searchQuery ? 'Clear Search' : 'Refresh Store'}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedTab('All');
                }}
              />
            ) : null
          }
        />
      )}
      <OrderScannerModal
        isVisible={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={handleCompleteOrder}
      />
      {!isFabMenuVisible && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setFabMenuVisible(true)}
        >
          <MaterialIcons name="widgets" size={34} color="#fff" />
        </TouchableOpacity>
      )}
      <ExpandableFAB
        isVisible={isFabMenuVisible}
        onClose={toggleFab}
        userRole={currentUser.usertype}
        actions={['iCash', 'Sales Hub', 'View Cart', 'View Favorites']}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  searchInput: {
    fontSize: 14,
    padding: 10,
    flex: 1,
  },
  actionButtonContainer: {
    position: 'relative',
    marginRight: 6,
    padding: 4,
  },
  badge: {
    position: 'absolute',
    right: -2,
    top: -2,
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 15,
  },
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: PRIMARY_COLOR,
    bottom: 80,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },
  tabBarScrollContainer: {
    paddingHorizontal: 10,
    alignItems: 'flex-start',
  },
  tabBarWrapper: {
    marginBottom: 20,
    flexGrow: 0,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginRight: 8,
  },
  activeTab: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
