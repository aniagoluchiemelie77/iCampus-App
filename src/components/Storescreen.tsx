import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList,TouchableOpacity, ScrollView, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { debounce } from 'lodash';
import { ProductCard } from './ProductCard';
import { fetchProductsAPI } from '../api/localGetApis';
import { completeOrderDelivery } from '../api/localPostApis';
import { Product } from '../types/firebase';
import { useAppDataContext } from './EventContext';
import { EmptyState } from './EmptyFlatlistComponent';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from '../components/hooks';
import { PageHeader } from './PageHeader';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { OrderScannerModal } from './OrderQRScannerModal';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContext';
import ExpandableFAB from './ExpandableFAB.tsx';
import { homeStyles } from '../assets/styles/colors';

interface IconButtonProps {
  onPress: () => void;
  count?: number;
  icon: string;
  badgeColor?: string;
  colors: any;
}

const CATEGORIES = [
  'Electronics',
  'Courses',
  'Documents',
  'Fashion',
  'Stationery',
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
    <MaterialIcons name={icon} size={28} color={PRIMARY_COLOR} />
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
  const currentUser = useAppSelector(state => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
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
      <HeaderActionButton
        icon="shopping-cart-outlined"
        count={currentUser?.cart?.length || 0}
        onPress={() => navigation.navigate('CartScreen')}
        colors={colors}
      />
      <HeaderActionButton
        icon="favorite"
        colors={colors}
        count={currentUser?.favorites?.length || 0}
        onPress={() => navigation.navigate('FavoritesScreen')}
      />
    </View>
  );

  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string, category: string) => {
        setLoading(true);
        const result = await fetchProductsAPI({
          q: query,
          category: category.toLowerCase(),
          limit: 10,
        });
        if (result.success) {
          setProducts(result.data);
          setCursor(result.nextCursor);
        }
        setLoading(false);
      }, 500),
    [],
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % CATEGORIES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    setCursor(null);
    debouncedSearch(searchQuery, selectedTab);
    return () => debouncedSearch.cancel();
  }, [searchQuery, selectedTab, debouncedSearch]);
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
        subtitle="Marketplace"
        showBackButton={false}
        rightElement={headerRightElement}
      />
      <View
        style={[
          styles.searchBarContainer,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <MaterialIcons
          name="search"
          size={20}
          color={colors.inputTextHolder}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={`Search for ${CATEGORIES[placeholderIndex]}...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={() => debouncedSearch(searchQuery, selectedTab)}
          placeholderTextColor={colors.inputTextHolder}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: colors.backgroundSecondary }}
        contentContainerStyle={styles.tabsContainer}
      >
        {STORE_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={[
              styles.tabItem,
              selectedTab === tab && styles.activeTabItem,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab
                  ? { color: colors.primary }
                  : { color: colors.text },
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading && !isFetchingMore ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.productId}
          numColumns={2}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() =>
                navigation.navigate('ProductDetails', {
                  productId: item.productId,
                })
              }
            />
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
          style={homeStyles.fab}
          onPress={() => setFabMenuVisible(true)}
        >
          <MaterialIcons name="widgets-outlined" size={28} color="#fff" />
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
  container: { flex: 1 },
  searchBarContainer: {
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.8,
    borderRadius: 15,
    marginHorizontal: 10,
    padding: 10,
  },
  searchIcon: {
    marginRight: 3,
  },
  searchInput: {
    fontSize: 14,
    padding: 10,
    flex: 1,
  },
  tabsContainer: {
    paddingHorizontal: 10,
  },
  tabItem: {
    padding: 8,
    marginRight: 10,
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
  },
  activeTabItem: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
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
    alignContent: 'center',
    zIndex: 10,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
});