import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList,TouchableOpacity, ScrollView, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { debounce } from 'lodash';
import { ProductCard } from './ProductCard';
import { fetchProductsAPI } from '../api/localGetApis';
import {Product} from '../types/firebase';
import {EmptyState} from './EmptyFlatlistComponent';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from '../components/hooks';
import {PageHeader} from './PageHeader';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';

interface IconButtonProps {
  onPress: () => void;
  count?: number;
  icon: string;
  badgeColor?: string;
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
}: IconButtonProps) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.actionButtonContainer, { marginRight: 2 }]}
  >
    <MaterialIcons name={icon} size={28} color={PRIMARY_COLOR} />
    {count! > 0 && (
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    )}
  </TouchableOpacity>
);

export const StoreScreen = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const navigation = useNavigation<any>();
  const currentUser = useAppSelector(state => state.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [selectedTab, setSelectedTab] = useState('All');
  const [cursor, setCursor] = useState<string | null>(null);
  const headerRightElement = (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <HeaderActionButton
        icon="shopping-cart"
        count={currentUser?.cart?.length || 0}
        onPress={() => navigation.navigate('CartScreen')}
      />
      <HeaderActionButton
        icon="favorite"
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
  return (
    <View style={styles.container}>
      <PageHeader
        title="iCampus Store"
        subtitle="Marketplace"
        showBackButton={false}
        rightElement={headerRightElement}
      />
      <View style={styles.searchBarContainer}>
        <MaterialIcons
          name="search"
          size={20}
          color={PRIMARY_COLOR_TINT}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search for ${CATEGORIES[placeholderIndex]}...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          onSubmitEditing={() => debouncedSearch(searchQuery, selectedTab)}
          placeholderTextColor={PRIMARY_COLOR_TINT}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={{ paddingRight: 20 }}
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
                selectedTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading && !isFetchingMore ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
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
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchBarContainer: {
    marginVertical: 15,
    backgroundColor: '#fadccc',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.8,
    borderRadius: 10,
    borderColor: PRIMARY_COLOR_TINT,
    padding: 4,
  },
  searchIcon: {
    marginRight: 3,
  },
  searchInput: {
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flex: 1,
  },
  tabsContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fadccc',
  },
  tabItem: {
    padding: 5,
    marginRight: 10,
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
  },
  activeTabItem: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 14,
    color: '#2222',
    fontWeight: '600',
  },
  activeTabText: {
    color: PRIMARY_COLOR,
  },
  actionButtonContainer: {
    position: 'relative',
    marginLeft: 15,
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
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});