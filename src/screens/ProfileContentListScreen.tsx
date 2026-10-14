import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/PageHeader';
import { PostCard } from '../components/PostCard.tsx';
import { MediaGridItem } from '../components/ProfileScreenTabbedComponents.tsx';
import { EmptyState } from '../components/EmptyFlatlistComponent';

// How many items are rendered per page while scrolling through the list.
const PAGE_SIZE = 10;

const EMPTY_MESSAGES: Record<string, string> = {
  Posts: 'No posts to show.',
  Reposts: 'No reposts to show.',
  Bookmarks: 'No bookmarks to show.',
  Media: 'No media to show.',
  Jobs: 'No job listings to show.',
  Events: 'No upcoming events to show.',
};

/**
 * Full, paginated view of a profile tab's content (Posts, Reposts,
 * Bookmarks, Media, Jobs, Events). The profile screen only renders a short
 * preview; this screen receives the already-fetched items via route params
 * and reveals them PAGE_SIZE at a time so large profiles stay performant.
 */
export const ProfileContentListScreen = () => {
  const route = useRoute<any>();
  const { colors } = useTheme();

  const {
    items = [],
    tab = 'Posts',
    title = tab,
    isMedia = false,
  }: {
    items?: any[];
    tab?: string;
    title?: string;
    isMedia?: boolean;
  } = route.params || {};

  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const loadMoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = items.length;
  const hasMore = visibleCount < total;
  const data = items.slice(0, visibleCount);

  // Clear any pending "load more" timer when the screen unmounts.
  useEffect(() => {
    return () => {
      if (loadMoreTimer.current) {
        clearTimeout(loadMoreTimer.current);
      }
    };
  }, []);

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMore) {
      return;
    }
    setIsLoadingMore(true);
    // Brief pause so the footer spinner paints before the next batch mounts.
    loadMoreTimer.current = setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + PAGE_SIZE, total));
      setIsLoadingMore(false);
    }, 150);
  };

  const renderItem = ({ item }: { item: any }) =>
    isMedia ? (
      <MediaGridItem post={item} />
    ) : (
      <PostCard post={item} isVisible={true} />
    );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={title}
        subtitle={total > 0 ? `${total} items` : undefined}
        showBackButton={true}
      />
      <FlatList
        data={data}
        keyExtractor={(item, index) => item.postId || index.toString()}
        renderItem={renderItem}
        numColumns={isMedia ? 3 : 1}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={PAGE_SIZE}
        maxToRenderPerBatch={PAGE_SIZE}
        windowSize={7}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <EmptyState
            iconName={isMedia ? 'perm-media' : 'article-outlined'}
            title={EMPTY_MESSAGES[tab] || 'Nothing here yet.'}
          />
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
