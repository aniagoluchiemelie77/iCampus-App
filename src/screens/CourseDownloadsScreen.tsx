import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { EnrichedCourseProduct } from '../types/firebase';
import { getUserDownloads } from '../api/localGetApis';
import { DownloadItemCard } from '../components/DownloadItemCard';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'DownloadsScreen'
>;

export const DownloadsScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [products, setProducts] = useState<EnrichedCourseProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stable, cached data retrieval function pipeline
  const fetchDownloads = useCallback(async () => {
    try {
      const result = await getUserDownloads();
      if (result.success) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error('Failed to sync downloads library:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  // FIXED: Memoized Pull-To-Refresh Event Handler
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchDownloads();
  }, [fetchDownloads]);

  // FIXED: Memoized Render Handler for FlatList Performance optimization
  const renderItem = useCallback(
    ({ item }: { item: EnrichedCourseProduct }) => (
      <DownloadItemCard
        product={item}
        onPress={() =>
          navigation.navigate('CourseLearningScreen', {
            courseProduct: item,
            userProgress: {
              completedLessons: item.completedLessons || [],
              lastAccessed: item.lastAccessed,
              progress: item.progress,
            },
          })
        }
      />
    ),
    [navigation],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="My Downloads"
        subtitle={
          products.length > 0 ? `${products.length} Items` : 'My Library'
        }
      />
      {isLoading && !isRefreshing ? (
        <View
          style={[
            styles.subContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.productId}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary} // iOS Spinner Color
              colors={[colors.primary]} // Android Spinner Cycle Colors
            />
          }
          ListEmptyComponent={
            <EmptyState
              iconName="cloud-download-outlined"
              title="Your library is empty"
              subtitle="Purchased courses and files will appear here for offline access."
              buttonText="Explore Marketplace"
              onPress={() =>
                navigation.navigate('Home', { activeTab: 'store' })
              }
            />
          }
        />
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  subContainer: {
    padding: 15,
    borderRadius: 15,
  },
});