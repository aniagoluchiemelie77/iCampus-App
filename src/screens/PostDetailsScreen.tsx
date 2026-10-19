import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PostCard } from '../components/PostCard';
import { CommentComposer, CommentItem } from '../components/CommentSection';
import { useAppDataContext } from '../context/EventContext';
import { Posts, PostComment } from '../types/firebase';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { usePostComments } from '../hooks/usePostComments';
import { getPostId } from '../utils/postHelpers';
import { formatCount } from '../utils/followCountFormatter';

export const PostDetailScreen = ({ route }: any) => {
  const { colors } = useTheme();
  const { post: initialPost, postId: routePostId, focusComment } = route.params ?? {};
  const postId: string = routePostId || getPostId(initialPost);
  const { posts, fetchPostById, currentUser } = useAppDataContext();

  // Prefer the shared feed copy so likes/reposts stay in sync both ways.
  const feedCopy = useMemo(
    () => posts.find(p => getPostId(p) === postId),
    [posts, postId],
  );
  const [fetched, setFetched] = useState<Posts | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>(
    initialPost || feedCopy ? 'ready' : 'loading',
  );
  const post = feedCopy || fetched || initialPost || null;

  const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<PostComment>>(null);

  // Always refetch: the snapshot passed in may be stale, and a post can have
  // been deleted or be outside this user's audience.
  useEffect(() => {
    let active = true;
    if (!postId) {
      setStatus('missing');
      return;
    }
    fetchPostById(postId).then(fresh => {
      if (!active) return;
      if (fresh) {
        setFetched(fresh);
        setStatus('ready');
      } else if (!initialPost && !feedCopy) {
        setStatus('missing');
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const updateFetchedCount = useCallback(
    (count: number) => setFetched(p => (p ? { ...p, commentsCount: count } : p)),
    [],
  );
  const {
    comments,
    loading,
    loadingMore,
    refreshing,
    error,
    hasMore,
    replyState,
    loadMore,
    refresh,
    reload,
    loadReplies,
    send,
    retry,
    discardFailed,
    toggleLike,
  } = usePostComments(postId, updateFetchedCount);

  const focusComposer = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 250);
  }, []);
  useEffect(() => {
    if (focusComment && status === 'ready') focusComposer();
  }, [focusComment, status, focusComposer]);

  const startReply = useCallback(
    (comment: PostComment) => {
      // Threads are one level deep; replying to a reply targets its parent.
      setReplyingTo(comment);
      focusComposer();
    },
    [focusComposer],
  );

  const sendText = async (text: string) => {
    const ok = await send({ type: 'text', text, parentId: replyingTo?.parentId || replyingTo?.commentId || null });
    if (ok) {
      if (!replyingTo) listRef.current?.scrollToOffset({ offset: 0, animated: true });
      setReplyingTo(null);
    }
    return ok;
  };
  const sendMedia = (type: 'gif' | 'sticker', media: any) => {
    send({ type, media, parentId: replyingTo?.parentId || replyingTo?.commentId || null });
    setReplyingTo(null);
  };

  if (status === 'loading' && !post) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
        <PageHeader title="Post" />
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }
  if (status === 'missing' || !post) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
        <PageHeader title="Post" />
        <EmptyState
          iconName="hide-source"
          title="This post isn't available"
          subtitle="It may have been deleted, or it's only visible to members of a school."
        />
      </SafeAreaView>
    );
  }

  const commentCount = post.commentsCount ?? comments.length;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <PageHeader title="Post" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <FlatList
          ref={listRef}
          data={comments}
          keyExtractor={item => item.commentId}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <PostCard post={post} isVisible variant="detail" onCommentPress={focusComposer} />
              <View style={styles.commentsHeader}>
                <Text style={[styles.commentsTitle, { color: colors.textDarker }]}>Comments</Text>
                {commentCount > 0 && (
                  <View style={[styles.countPill, { backgroundColor: colors.primary + '18' }]}>
                    <Text style={[styles.countPillText, { color: colors.primary }]}>{formatCount(commentCount)}</Text>
                  </View>
                )}
              </View>
            </>
          }
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              currentUserId={currentUser?.uid}
              onLike={toggleLike}
              onReply={startReply}
              onRetry={retry}
              onDiscard={discardFailed}
              onLoadReplies={loadReplies}
              repliesLoading={replyState[item.commentId]?.loading}
              repliesComplete={replyState[item.commentId]?.loadedAll}
            />
          )}
          onEndReached={() => hasMore && loadMore()}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                refresh();
                fetchPostById(postId).then(fresh => fresh && setFetched(fresh));
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={{ marginVertical: 24 }} color={colors.primary} />
            ) : error ? (
              <View style={styles.inlineState}>
                <Text style={[styles.inlineStateText, { color: colors.text }]}>{error}</Text>
                <TouchableOpacity onPress={reload} style={[styles.retryButton, { borderColor: colors.primary }]}>
                  <Text style={[styles.retryText, { color: colors.primary }]}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.inlineState} onPress={focusComposer} activeOpacity={0.7}>
                <MaterialIcons name="chat-bubble-outline" size={28} color={colors.primary} />
                <Text style={[styles.inlineStateTitle, { color: colors.textDarker }]}>No comments yet</Text>
                <Text style={[styles.inlineStateText, { color: colors.text }]}>Start the conversation.</Text>
              </TouchableOpacity>
            )
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} /> : null
          }
        />
        <CommentComposer
          ref={inputRef}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          onSendText={sendText}
          onSendMedia={sendMedia}
          currentUser={currentUser}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingHorizontal: 14, paddingBottom: 24 },
  commentsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 4, paddingHorizontal: 4 },
  commentsTitle: { fontSize: 16, fontWeight: '800' },
  countPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countPillText: { fontSize: 12, fontWeight: '800' },
  inlineState: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  inlineStateTitle: { fontSize: 15, fontWeight: '700' },
  inlineStateText: { fontSize: 13.5, textAlign: 'center' },
  retryButton: { marginTop: 6, borderWidth: 1.2, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  retryText: { fontSize: 13, fontWeight: '700' },
});
export default PostDetailScreen;
