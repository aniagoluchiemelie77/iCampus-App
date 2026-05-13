import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { EnrichedCourseProduct } from '../types/firebase';
import { getUserDownloads } from '../api/localGetApis';
import { DownloadItemCard } from '../components/DownloadItemCard';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'DownloadsScreen'
>;

export const DownloadsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [products, setProducts] = useState<EnrichedCourseProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetchDownloads = useCallback(async () => {
    const result = await getUserDownloads();
    if (result.success) {
      setProducts(result.data);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);
  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);
  const onRefresh = () => {
    setIsRefreshing(true);
    fetchDownloads();
  };
  return (
    <View style={styles.container}>
      <PageHeader
        title="My Downloads"
        subtitle={
          products.length > 0 ? `${products.length} Items` : 'My Library'
        }
      />
      <FlatList
        data={products}
        keyExtractor={item => item.productId}
        renderItem={({ item }) => <DownloadItemCard product={item} />}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              iconName="cloud-download-outlined"
              title="Your library is empty"
              subtitle="Purchased courses and files will appear here for offline access."
              buttonText="Explore Marketplace"
              onPress={() =>
                navigation.navigate('Home', { activeTab: 'store' })
              }
            />
          ) : null
        }
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});