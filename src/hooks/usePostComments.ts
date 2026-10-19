import { useCallback, useEffect, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import { CommentMedia, PostComment } from '../types/firebase';
import { fetchPostCommentsAPI } from '../api/localGetApis';
import { addCommentAPI, toggleCommentLikeAPI } from '../api/localPostApis';
import { useAppDataContext } from '../context/EventContext';
import { toArray } from '../utils/postHelpers';

const PAGE_SIZE = 15;

export interface NewCommentInput {
  type: 'text' | 'gif' | 'sticker';
  text?: string;
  media?: CommentMedia | null;
  parentId?: string | null;
}

type ReplyState = { nextCursor: string | null; loading: boolean; loadedAll: boolean };

/** Updates one comment wherever it sits (top level or inside replies). */
const mapComment = (
  list: PostComment[],
  commentId: string,
  fn: (c: PostComment) => PostComment,
): PostComment[] =>
  list.map(c =>
    c.commentId === commentId
      ? fn(c)
      : c.replies?.length
        ? { ...c, replies: mapComment(c.replies, commentId, fn) }
        : c,
  );

/**
 * Paged comments for one post: top-level comments newest first, replies
 * oldest first under their parent, optimistic posting and likes.
 */
export const usePostComments = (postId: string, onCountChange?: (count: number) => void) => {
  const { currentUser, patchPost } = useAppDataContext();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyState, setReplyState] = useState<Record<string, ReplyState>>({});
  const loadingMoreRef = useRef(false);
  const likeInFlight = useRef<Record<string, boolean>>({});

  const setCount = useCallback(
    (count: number) => {
      patchPost(postId, p => ({ ...p, commentsCount: count }));
      onCountChange?.(count);
    },
    [patchPost, postId, onCountChange],
  );

  const loadFirstPage = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!postId) return;
      mode === 'refresh' ? setRefreshing(true) : setLoading(true);
      setError(null);
      const res = await fetchPostCommentsAPI({ postId, limit: PAGE_SIZE });
      if (res.success) {
        setComments(res.comments);
        setNextCursor(res.nextCursor);
        setReplyState({});
        if (typeof res.total === 'number') setCount(res.total);
      } else {
        setError(res.message || 'Could not load comments');
      }
      setLoading(false);
      setRefreshing(false);
    },
    [postId, setCount],
  );

  useEffect(() => {
    loadFirstPage('initial');
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const res = await fetchPostCommentsAPI({ postId, cursor: nextCursor, limit: PAGE_SIZE });
    if (res.success) {
      setComments(prev => {
        const seen = new Set(prev.map(c => c.commentId));
        return [...prev, ...res.comments.filter(c => !seen.has(c.commentId))];
      });
      setNextCursor(res.nextCursor);
    }
    setLoadingMore(false);
    loadingMoreRef.current = false;
  }, [nextCursor, postId]);

  /** Loads (more) replies for a top-level comment. */
  const loadReplies = useCallback(
    async (rootId: string) => {
      const state = replyState[rootId];
      if (state?.loading || state?.loadedAll) return;
      setReplyState(s => ({ ...s, [rootId]: { nextCursor: state?.nextCursor ?? null, loading: true, loadedAll: false } }));
      const res = await fetchPostCommentsAPI({
        postId,
        parentId: rootId,
        cursor: state?.nextCursor,
        limit: 20,
      });
      if (res.success) {
        const isFirstPage = !state?.nextCursor;
        setComments(prev =>
          prev.map(c => {
            if (c.commentId !== rootId) return c;
            const current = c.replies || [];
            // First page: swap the 2-reply preview for the real list, keeping
            // any of this user's replies that are still sending or failed.
            const base = isFirstPage ? current.filter(r => r.pending || r.failed) : current;
            const byId = new Map<string, PostComment>();
            // Replies read oldest-first, so a later page goes after what's shown.
            (isFirstPage ? [...res.comments, ...base] : [...base, ...res.comments]).forEach(r =>
              byId.set(r.commentId, r),
            );
            return { ...c, replies: [...byId.values()] };
          }),
        );
      }
      setReplyState(s => ({
        ...s,
        [rootId]: {
          nextCursor: res.nextCursor,
          loading: false,
          loadedAll: res.success ? !res.nextCursor : false,
        },
      }));
    },
    [postId, replyState],
  );

  const send = useCallback(
    async (input: NewCommentInput, retryOf?: PostComment) => {
      if (!currentUser?.uid) {
        Toast.show({ type: 'info', text1: 'Sign in to comment' });
        return false;
      }
      const tempId = retryOf?.commentId || `temp-${Date.now()}`;
      const optimistic: PostComment = {
        commentId: tempId,
        postId,
        parentId: input.parentId || null,
        type: input.type,
        text: input.text || '',
        media: input.media || null,
        likes: [],
        likesCount: 0,
        createdAt: new Date().toISOString(),
        author: {
          uid: currentUser.uid,
          firstname: currentUser.firstname || '',
          lastname: currentUser.lastname || '',
          username: currentUser.username || '',
          tier: currentUser.tier || 'free',
          organizationName: currentUser.organizationName || null,
          profilePic: toArray<string>(currentUser.profilePic),
          isVerified: !!currentUser.isVerified,
        },
        replyCount: 0,
        replies: [],
        pending: true,
      };
      const place = (list: PostComment[]) => {
        if (retryOf) return mapComment(list, tempId, () => optimistic);
        if (!input.parentId) return [optimistic, ...list];
        return list.map(c =>
          c.commentId === input.parentId
            ? { ...c, replyCount: c.replyCount + 1, replies: [...(c.replies || []), optimistic] }
            : c,
        );
      };
      setComments(place);

      const res = await addCommentAPI(postId, input);
      if (res.success && res.comment) {
        setComments(list => mapComment(list, tempId, () => ({ ...res.comment!, replies: [] })));
        if (typeof res.commentsCount === 'number') setCount(res.commentsCount);
        return true;
      }
      setComments(list => mapComment(list, tempId, c => ({ ...c, pending: false, failed: true })));
      Toast.show({ type: 'error', text1: 'Comment not sent', text2: res.message || 'Tap it to try again.' });
      return false;
    },
    [currentUser, postId, setCount],
  );

  const retry = useCallback(
    (comment: PostComment) =>
      send(
        { type: comment.type, text: comment.text, media: comment.media, parentId: comment.parentId },
        comment,
      ),
    [send],
  );

  const discardFailed = useCallback((comment: PostComment) => {
    setComments(list =>
      list
        .filter(c => c.commentId !== comment.commentId)
        .map(c =>
          c.replies?.some(r => r.commentId === comment.commentId)
            ? {
                ...c,
                replyCount: Math.max(0, c.replyCount - 1),
                replies: c.replies.filter(r => r.commentId !== comment.commentId),
              }
            : c,
        ),
    );
  }, []);

  const toggleLike = useCallback(
    async (comment: PostComment) => {
      const uid = currentUser?.uid;
      if (!uid) {
        Toast.show({ type: 'info', text1: 'Sign in to like comments' });
        return;
      }
      if (comment.pending || comment.failed || likeInFlight.current[comment.commentId]) return;
      likeInFlight.current[comment.commentId] = true;
      const before = comment.likes || [];
      const liked = before.includes(uid);
      const optimisticLikes = liked ? before.filter(id => id !== uid) : [...before, uid];
      setComments(list =>
        mapComment(list, comment.commentId, c => ({ ...c, likes: optimisticLikes, likesCount: optimisticLikes.length })),
      );
      const res = await toggleCommentLikeAPI(postId, comment.commentId);
      const finalLikes = res.success && Array.isArray(res.likes) ? res.likes : res.success ? optimisticLikes : before;
      setComments(list =>
        mapComment(list, comment.commentId, c => ({ ...c, likes: finalLikes, likesCount: finalLikes.length })),
      );
      if (!res.success) Toast.show({ type: 'error', text1: 'Could not like comment', text2: res.message });
      likeInFlight.current[comment.commentId] = false;
    },
    [currentUser?.uid, postId],
  );

  return {
    comments,
    loading,
    loadingMore,
    refreshing,
    error,
    hasMore: !!nextCursor,
    replyState,
    loadMore,
    refresh: () => loadFirstPage('refresh'),
    reload: () => loadFirstPage('initial'),
    loadReplies,
    send,
    retry,
    discardFailed,
    toggleLike,
  };
};
