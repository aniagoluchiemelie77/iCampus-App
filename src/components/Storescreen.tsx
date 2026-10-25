import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Text,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ProductCard } from './ProductCard';
import { fetchProductsAPI } from '../api/localGetApis';
import { Product } from '../types/firebase';
import { EmptyState } from './EmptyFlatlistComponent';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { useAppDataContext } from '../context/EventContext';
import { useProductUpload } from '../context/ProductUploadContext';

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

// Backend (fetchStoreProducts) does an exact, case-sensitive match:
//   where("niche", "==", category)
// so each tab must map to the exact niche value used when products are
// created (see CreateProductScreen nicheItems). 'popular' is a special
// backend value (lowercase) for the favCount-sorted feed; 'All' sends ''
// so no category filter is applied.
const TAB_TO_API_CATEGORY: Record<string, string> = {
  All: '',
  Popular: 'popular',
  Electronics: 'Electronics',
  Fashion: 'Fashion',
  Stationery: 'Stationery',
  'Snacks and Deserts': 'Snacks and Deserts',
  Food: 'Food',
  FootWears: 'Footwears',
  'Health and Beauty': 'Health & Beauty',
};

const getCategoryParam = (tab: string): string =>
  TAB_TO_API_CATEGORY[tab] ?? '';

export const HeaderActionButton = ({
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
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const productColumns = width >= 768 ? 4 : 2;
  const { pendingProduct, publishedVersion } = useProductUpload();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [selectedTab, setSelectedTab] = useState('All');
  const { syncCatalogToDatabase, syncUsersToDatabase } = useAppDataContext();

  const [tabData, setTabData] = useState<
    Record<
      string,
      { products: Product[]; cursor: string | null; hasMore: boolean }
    >
  >({
    All: { products: [], cursor: null, hasMore: true },
    Popular: { products: [], cursor: null, hasMore: true },
    Electronics: { products: [], cursor: null, hasMore: true },
    Fashion: { products: [], cursor: null, hasMore: true },
    Stationery: { products: [], cursor: null, hasMore: true },
    'Snacks and Deserts': { products: [], cursor: null, hasMore: true },
    Food: { products: [], cursor: null, hasMore: true },
    FootWears: { products: [], cursor: null, hasMore: true },
    'Health and Beauty': { products: [], cursor: null, hasMore: true },
  });
  const currentTabData = tabData[selectedTab] || {
    products: [],
    cursor: null,
    hasMore: true,
  };

  const fetchProducts = async (
    tab: string,
    query: string,
    isRefresh = false,
  ) => {
    if (!isRefresh && query === '' && tabData[tab]?.products.length > 0) {
      return;
    }

    setLoading(true);
    try {
      const currentCursor = isRefresh
        ? undefined
        : (tabData[tab]?.cursor ?? undefined);
      const result = await fetchProductsAPI({
        q: query,
        category: getCategoryParam(tab),
        cursor: currentCursor,
        limit: 10,
      });

      if (result.success) {
        setTabData(prev => ({
          ...prev,
          [tab]: {
            products: isRefresh
              ? result.data
              : [...(prev[tab]?.products || []), ...result.data],
            cursor: result.nextCursor,
            hasMore: !!result.nextCursor,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(selectedTab, searchQuery, searchQuery !== '');
  }, [selectedTab, searchQuery]);
  useEffect(() => {
    if (publishedVersion > 0) {
      fetchProducts(selectedTab, searchQuery, true);
    }
    // Refresh the active store tab when the background publish completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishedVersion]);

  const pendingMatchesTab =
    pendingProduct &&
    (selectedTab === 'All' ||
      selectedTab === 'Popular' ||
      pendingProduct.niche === getCategoryParam(selectedTab));
  const pendingMatchesSearch =
    pendingProduct &&
    (!searchQuery ||
      `${pendingProduct.title} ${pendingProduct.description || ''}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()));
  const visibleProducts =
    pendingMatchesTab &&
    pendingMatchesSearch &&
    !currentTabData.products.some(
      product => product.productId === pendingProduct.productId,
    )
      ? [pendingProduct, ...currentTabData.products]
      : currentTabData.products;

  const loadMore = async () => {
    if (isFetchingMore || !currentTabData.hasMore || !currentTabData.cursor)
      return;

    setIsFetchingMore(true);
    try {
      const result = await fetchProductsAPI({
        q: searchQuery,
        category: getCategoryParam(selectedTab),
        cursor: currentTabData.cursor,
        limit: 10,
      });

      if (result.success) {
        setTabData(prev => ({
          ...prev,
          [selectedTab]: {
            products: [...prev[selectedTab].products, ...result.data],
            cursor: result.nextCursor,
            hasMore: !!result.nextCursor,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to load more products:', error);
    } finally {
      setIsFetchingMore(false);
    }
  };
  useFocusEffect(
    React.useCallback(() => {
      syncCatalogToDatabase();
      syncUsersToDatabase();
    }, []),
  );

  return (
    <View style={styles.container}>
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
      {loading && !isFetchingMore && visibleProducts.length === 0 ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          key={productColumns}
          data={visibleProducts}
          keyExtractor={(item, index) => `${item.productId}-${index}`}
          numColumns={productColumns}
          renderItem={({ item }) => (
            <View
              style={[
                styles.cardWrapper,
                { width: `${100 / productColumns}%` },
              ]}
            >
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
          onEndReached={loadMore}
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
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: 15,
  },
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
    width: '25%',
    maxWidth: 300,
    paddingHorizontal: 6,
    marginBottom: 15,
  },
  tabBarScrollContainer: {
    paddingHorizontal: 10,
    alignItems: 'center',
    paddingVertical: 0,
  },
  tabBarWrapper: {
    marginVertical: 10,
    flexGrow: 0,
    height: 52,
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
