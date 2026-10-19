import { useCallback, useEffect, useRef, useState } from 'react';
import { Share } from 'react-native';
import Toast from 'react-native-toast-message';
import { Posts, PostReposter } from '../types/firebase';
import { useAppDataContext } from '../context/EventContext';
import { toggleLikeAPI, createRepostAPI } from '../api/localPostApis';
import { toggleBookmarkAPI, castPollVoteAPI } from '../api/localPatchApis';
import { getPostId, toArray } from '../utils/postHelpers';

/**
 * Like / bookmark / repost / vote / share for one post card.
 *
 * Every change is applied optimistically to this card AND to the shared feed
 * list (so the post stays in sync wherever else it's shown), reconciled with
 * the server's answer, and rolled back if the request fails. Works for posts
 * that aren't in the feed list too (search, profile, notifications).
 */
export const usePostInteractions = (post: Posts) => {
  const { currentUser, patchPost, incrementShareCount } = useAppDataContext();
  const [live, setLive] = useState<Posts>(post);
  const liveRef = useRef(live);
  liveRef.current = live;
  const inFlight = useRef<Record<string, boolean>>({});
  const postId = getPostId(post);
  const uid = currentUser?.uid;

  // New data from the parent (refetch, feed refresh) replaces local state.
  useEffect(() => {
    setLive(post);
  }, [post]);

  const apply = useCallback(
    (updater: (p: Posts) => Posts) => {
      setLive(prev => updater(prev));
      patchPost(postId, updater);
    },
    [patchPost, postId],
  );

  const guard = (key: string, signedOutMessage: string) => {
    if (!uid) {
      Toast.show({ type: 'info', text1: signedOutMessage });
      return false;
    }
    if (!postId || inFlight.current[key]) return false;
    inFlight.current[key] = true;
    return true;
  };
  const release = (key: string) => {
    inFlight.current[key] = false;
  };

  const likes = toArray<string>(live.likes);
  const bookmarks = toArray<string>(live.bookmarks);
  const reposters = toArray<PostReposter>(live.repostersDetails);
  const isLiked = !!uid && likes.includes(uid);
  const isBookmarked = !!uid && bookmarks.includes(uid);
  const isReposted = !!uid && reposters.some(r => r.uid === uid);
  const hasVoted =
    !!uid &&
    toArray<any>(live.poll?.options).some(o => toArray(o?.votes).includes(uid));

  const toggleLike = useCallback(async () => {
    if (!guard('like', 'Sign in to like posts')) return;
    const before = toArray<string>(liveRef.current.likes);
    const wasLiked = before.includes(uid!);
    apply(p => ({
      ...p,
      likes: wasLiked ? before.filter(id => id !== uid) : [...before, uid!],
    }));
    const res = await toggleLikeAPI(postId);
    if (!res.success) {
      apply(p => ({ ...p, likes: before }));
      Toast.show({ type: 'error', text1: 'Could not update like', text2: res.message });
    } else if (Array.isArray(res.likes)) {
      apply(p => ({ ...p, likes: res.likes! }));
    }
    release('like');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apply, postId, uid]);

  const toggleBookmark = useCallback(async () => {
    if (!guard('bookmark', 'Sign in to save posts')) return;
    const before = toArray<string>(liveRef.current.bookmarks);
    const wasSaved = before.includes(uid!);
    apply(p => ({
      ...p,
      bookmarks: wasSaved ? before.filter(id => id !== uid) : [...before, uid!],
    }));
    const res = await toggleBookmarkAPI(postId);
    if (!res.success) {
      apply(p => ({ ...p, bookmarks: before }));
      Toast.show({ type: 'error', text1: 'Could not update bookmark', text2: res.message });
    } else {
      if (Array.isArray(res.bookmarks)) apply(p => ({ ...p, bookmarks: res.bookmarks! }));
      Toast.show({ type: 'success', text2: res.bookmarked ? 'Saved to your bookmarks' : 'Removed from bookmarks' });
    }
    release('bookmark');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apply, postId, uid]);

  const toggleRepost = useCallback(async () => {
    if (!guard('repost', 'Sign in to repost')) return;
    const snapshot = liveRef.current;
    const before = toArray<PostReposter>(snapshot.repostersDetails);
    const wasReposted = before.some(r => r.uid === uid);
    const me: PostReposter = {
      uid: uid!,
      firstname: currentUser?.firstname || '',
      lastname: currentUser?.lastname || '',
      username: currentUser?.username || '',
      tier: currentUser?.tier || 'free',
      organizationName: currentUser?.organizationName || null,
      profilePic: toArray<string>(currentUser?.profilePic),
      repostedAt: new Date().toISOString(),
    };
    const nextReposters = wasReposted
      ? before.filter(r => r.uid !== uid)
      : [me, ...before];
    apply(p => ({
      ...p,
      repostersDetails: nextReposters,
      repostsCount: nextReposters.length,
      featuredReposter: wasReposted
        ? p.featuredReposter?.uid === uid
          ? nextReposters[0] || null
          : p.featuredReposter
        : p.featuredReposter || me,
    }));
    const res = await createRepostAPI(postId);
    if (!res.success) {
      apply(p => ({
        ...p,
        repostersDetails: before,
        repostsCount: before.length,
        featuredReposter: snapshot.featuredReposter,
      }));
      Toast.show({ type: 'error', text1: 'Could not repost', text2: res.message });
    } else {
      Toast.show({
        type: 'success',
        text2: res.reposted ? 'Reposted to your profile' : 'Repost removed',
      });
    }
    release('repost');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apply, postId, uid, currentUser]);

  const vote = useCallback(
    async (optionId: string) => {
      if (hasVoted || !guard('vote', 'Sign in to vote')) return;
      const beforePoll = liveRef.current.poll;
      if (!beforePoll) return release('vote');
      apply(p => ({
        ...p,
        poll: p.poll && {
          ...p.poll,
          totalVotes: (p.poll.totalVotes || 0) + 1,
          options: p.poll.options.map(o =>
            o.optionId === optionId
              ? { ...o, votes: [...toArray<string>(o.votes), uid!] }
              : o,
          ),
        },
      }));
      const res = await castPollVoteAPI(postId, optionId);
      if (!res.success) {
        apply(p => ({ ...p, poll: beforePoll }));
        Toast.show({ type: 'error', text1: 'Vote not counted', text2: res.message });
      } else if (res.poll) {
        apply(p => ({ ...p, poll: res.poll }));
      }
      release('vote');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apply, hasVoted, postId, uid],
  );

  const share = useCallback(async () => {
    const url = `https://useicampus.io/post/${postId}`;
    try {
      const result = await Share.share({
        message: `${(liveRef.current.content || 'Check out this post on iCampus!').slice(0, 200)}\n\n${url}`,
        url,
      });
      if (result.action === Share.sharedAction) {
        incrementShareCount(postId);
        apply(p => ({ ...p, sharesCount: (p.sharesCount || 0) + 1 }));
      }
    } catch (error) {
      Toast.show({ type: 'error', text2: 'Could not open the share sheet' });
    }
  }, [apply, incrementShareCount, postId]);

  return {
    post: live,
    postId,
    isLiked,
    isBookmarked,
    isReposted,
    hasVoted,
    likesCount: likes.length,
    bookmarksCount: bookmarks.length,
    repostsCount: reposters.length,
    toggleLike,
    toggleBookmark,
    toggleRepost,
    vote,
    share,
  };
};
