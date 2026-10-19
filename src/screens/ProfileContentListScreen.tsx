import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/PageHeader';
import { PostCard } from '../components/PostCard.tsx';
import { MediaGridItem } from '../components/ProfileScreenTabbedComponents.tsx';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useProfileTab } from '../hooks/useProfileTab';
import { useLoadMoreOnScroll } from '../hooks/useLoadMoreOnScroll';

const PAGE_SIZE = 12;
const { width } = Dimensions.get('window');

const EMPTY_MESSAGES: Record<string, string> = {
  Posts: 'No posts to show.',
  Reposts: 'No reposts to show.',
  Bookmarks: 'No bookmarks to show.',
  Media: 'No media to show.',
  Jobs: 'No job listings to show.',
  Events: 'No upcoming events to show.',
};

/**
 * Full list for one profile tab, fetched from the server a page at a time
 * (it used to receive every item at once through navigation params).
 */
export const ProfileContentListScreen = () => {
  const route = useRoute<any>();
  const { colors } = useTheme();
  const {
    identifier,
    tab = 'Posts',
    title = tab,
    isMedia = false,
  }: { identifier?: string; tab?: string; title?: string; isMedia?: boolean } = route.params || {};

  const { items, hasMore, loading, error, loadMore, reload } = useProfileTab(
    identifier,
    tab,
    undefined,
    PAGE_SIZE,
  );
  const loadMoreProps = useLoadMoreOnScroll(() => (hasMore && !loading ? loadMore() : undefined));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title={title} showBackButton />
      <FlatList
        key={isMedia ? 'grid' : 'list'}
        data={items}
        keyExtractor={(item, index) => item.postId || index.toString()}
        renderItem={({ item }) =>
          isMedia ? (
            <MediaGridItem post={item} size={(width - 24) / 3 - 2} />
          ) : (
            <PostCard post={item} isVisible />
          )
        }
        numColumns={isMedia ? 3 : 1}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        {...loadMoreProps}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={loading && items.length > 0 && !hasMore}
            onRefresh={reload}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : error ? (
            <TouchableOpacity style={styles.errorState} onPress={reload}>
              <Text style={{ color: colors.text }}>{error}</Text>
              <Text style={[styles.retry, { color: colors.primary }]}>Tap to retry</Text>
            </TouchableOpacity>
          ) : (
            <EmptyState
              iconName={isMedia ? 'perm-media' : 'article'}
              title={EMPTY_MESSAGES[tab] || 'Nothing here yet.'}
            />
          )
        }
        ListFooterComponent={
          loading && items.length > 0 ? (
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
  container: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingBottom: 40, flexGrow: 1 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  errorState: { alignItems: 'center', paddingTop: 40, gap: 6 },
  retry: { fontWeight: '700' },
});
