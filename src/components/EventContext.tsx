import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
} from 'react';

import type { User, Posts, Comment } from '../types/firebase';
import Toast from 'react-native-toast-message';
import { baseUrl } from './HomeScreenComponents';
import {
  recordPostImpressionAPI,
  castPollVoteAPI,
  toggleBookmarkAPI,
  updateCartAPI,
  toggleFavoriteAPI,
} from '../api/localPatchApis';
import { fetchPostByIdAPI } from '../api/localGetApis';
import {
  addCommentAPI,
  toggleLikeAPI,
  createRepostAPI,
  toggleCommentLikeAPI,
} from '../api/localPostApis';
interface AppDataContextType {
  posts: Posts[];
  setPosts: React.Dispatch<React.SetStateAction<Posts[]>>;
  toggleLike: (postId: string) => Promise<void>;
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  handleRepost: (
    originalPostId: string,
    quoteContent?: string,
  ) => Promise<void>;
  addComment: (
    postId: string,
    text: string,
    parentId?: string | null,
  ) => Promise<void>;
  toggleCommentLike: (postId: string, commentId: string) => Promise<void>;
  handleVote: (postId: string, optionId: string) => Promise<void>;
  handleCartItemToggle: (productId: string) => Promise<void>;
  handleToggleFavorite: (productId: string) => Promise<void>;
  incrementImpression: (postId: string) => Promise<void>;
  toggleBookmark: (postId: string) => Promise<void>;
  incrementShareCount: (postId: string) => Promise<void>;
  fetchPostById: (postId: string) => Promise<Posts | null>;
}

interface AppDataProviderProps {
  user: User;
  children: ReactNode;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const useAppDataContext = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppDataContext must be used within an AppDataProvider');
  }
  return context;
};

export const AppDataProvider = ({ user, children }: AppDataProviderProps) => {
  const [posts, setPosts] = useState<Posts[]>([]);
  const [currentUser, setCurrentUser] = useState(user);

  const toggleLike = async (postId: string) => {
    const userId = currentUser.uid;
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post.postId === postId) {
          const currentLikes = post.likes ?? [];
          const alreadyLiked = currentLikes.includes(userId);
          return {
            ...post,
            likes: alreadyLiked
              ? currentLikes.filter(id => id !== userId)
              : [...currentLikes, userId],
          };
        }
        return post;
      }),
    );
    try {
      const result = await toggleLikeAPI(postId);
      if (!result.success) {
        console.error(result.message);
        Toast.show({
          type: 'error',
          text1: 'Update Error',
          text2: result.message,
        });
      }
    } catch (error) {
      console.error('Failed to sync like:', error);
    }
  };
  const toggleBookmark = async (postId: string) => {
    const userId = currentUser.uid;

    setPosts(currentPosts =>
      currentPosts.map(post => {
        if (post.postId === postId) {
          // Guard against undefined with ?? []
          const currentBookmarks = post.bookmarks ?? [];
          const isBookmarked = currentBookmarks.includes(userId);

          return {
            ...post,
            bookmarks: isBookmarked
              ? currentBookmarks.filter(id => id !== userId)
              : [...currentBookmarks, userId],
          };
        }
        return post;
      }),
    );

    try {
      const result = await toggleBookmarkAPI(postId);
      if (!result.success) {
        console.error(result.message);
        Toast.show({
          type: 'error',
          text1: 'Update Error',
          text2: result.message,
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Bookmark sync failed, please retry.',
      });
      console.error('Bookmark sync failed', err);
    }
  };
  const viewedPosts = useRef(new Set<string>());

  const incrementImpression = async (postId: string) => {
    if (viewedPosts.current.has(postId)) return;
    viewedPosts.current.add(postId);
    // Local update
    setPosts(currentPosts =>
      currentPosts.map(post =>
        post.postId === postId
          ? { ...post, impressions: (post.impressions || 0) + 1 }
          : post,
      ),
    );

    try {
      await recordPostImpressionAPI(postId);
    } catch (err) {
      console.log('Impression update failed', err);
      Toast.show({
        type: 'error',
        text1: 'Impression update failed, please retry.',
      });
    }
  };
  const handleRepost = async (originalPostId: string) => {
    try {
      const response = await createRepostAPI(originalPostId);
      if (response.success) {
        const newRepost = response.data;
        setPosts(currentPosts => [newRepost, ...currentPosts]);
        setPosts(currentPosts =>
          currentPosts.map(post =>
            post.postId === originalPostId
              ? { ...post, repostsCount: (post.repostsCount ?? 0) + 1 }
              : post,
          ),
        );
        Toast.show({ type: 'success', text2: response.message });
      } else {
        Toast.show({
          type: 'error',
          text2: response.message || 'Failed to repost',
        });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Repost failed, please retry.' });
      console.error('Repost failed', error);
    }
  };
  const incrementShareCount = async (postId: string) => {
    // 1. Optimistic Update
    setPosts(currentPosts =>
      currentPosts.map(post =>
        post.postId === postId
          ? { ...post, sharesCount: (post.sharesCount ?? 0) + 1 }
          : post,
      ),
    );

    // 2. Backend Sync
    try {
      await fetch(`${baseUrl}posts/${postId}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // We don't necessarily need the userId if we're just counting total shares
      });
    } catch (err) {
      console.error('Failed to sync share count:', err);
    }
  };
  const toggleCommentLike = async (postId: string, commentId: string) => {
    if (!currentUser?.uid) return;
    const userId = currentUser.uid;
    const performToggle = (postsArray: any[]) =>
      postsArray.map(post => {
        if (post.postId === postId) {
          const updatedComments = (post.comments ?? []).map((c: Comment) => {
            if (c.commentId === commentId) {
              const currentLikes = c.likes ?? [];
              const isLiked = currentLikes.includes(userId);
              return {
                ...c,
                likes: isLiked
                  ? currentLikes.filter((id: string) => id !== userId)
                  : [...currentLikes, userId],
              };
            }
            return c;
          });
          return { ...post, comments: updatedComments };
        }
        return post;
      });
    setPosts(prev => performToggle(prev));
    const result = await toggleCommentLikeAPI(postId, commentId);
    if (!result.success) {
      setPosts(prev => performToggle(prev));
      Toast.show({
        type: 'error',
        text1: 'Sync failed',
        text2: 'Your like could not be saved.',
      });
    }
  };
  const addComment = async (
    postId: string,
    text: string,
    parentId: string | null = null,
  ) => {
    if (!currentUser) return;
    const optimisticComment = {
      commentId: Math.random().toString(36).slice(2, 11),
      userId: currentUser,
      comment: text,
      parentId: parentId ?? '',
      likes: [],
      createdAt: new Date().toISOString(),
    };
    setPosts((prev: Posts[]) =>
      prev.map(p => {
        if (p.postId === postId) {
          const existingComments = p.comments ?? [];
          const updatedComments = [...existingComments, optimisticComment];
          return {
            ...p,
            comments: updatedComments,
            commentsCount: (p.commentsCount ?? (p.comments?.length || 0)) + 1,
          } as any as Posts;
        }
        return p;
      }),
    );
    try {
      const response = await addCommentAPI(postId, text, parentId);
      if (!response.success) {
        setPosts((prev: any[]) =>
          prev.map(p => {
            if (p.postId === postId) {
              return {
                ...p,
                comments: p.comments.filter(
                  (c: any) => c.commentId !== optimisticComment.commentId,
                ),
                commentsCount: Math.max(0, p.commentsCount - 1),
              };
            }
            return p;
          }),
        );
        Toast.show({ type: 'error', text1: 'Could not save comment' });
      } else {
        setPosts((prev: any[]) =>
          prev.map(p => {
            if (p.postId === postId) {
              return {
                ...p,
                comments: p.comments.map((c: any) =>
                  c.commentId === optimisticComment.commentId
                    ? { ...c, commentId: response.data.commentId } // result.data comes from API utility
                    : c,
                ),
              };
            }
            return p;
          }),
        );
      }
    } catch (error) {
      console.error('Sync failed:', error);
      // Rollback logic would go here if you wanted to be fancy
    }
  };
  const handleVote = async (postId: string, optionId: string) => {
    if (!currentUser) return;
    try {
      const response = await castPollVoteAPI(postId, optionId, currentUser.uid);
      if (!response.success) {
        Toast.show({
          type: 'error',
          text1: 'Failed to register vote, please retry.',
        });
      }
      // 2. Update local state
      setPosts((prevPosts: Posts[]) => {
        return prevPosts.map((post): Posts => {
          // 1. Check if this is the post we want AND that it actually has a poll
          if (post.postId === postId && post.poll) {
            const updatedOptions = post.poll.options.map((opt: any) => {
              if (opt.optionId === optionId) {
                return {
                  ...opt,
                  votes: [...(opt.votes || []), currentUser.uid],
                };
              }
              return opt;
            });

            return {
              ...post,
              poll: {
                ...post.poll, // Now safe because of the check above
                options: updatedOptions,
                totalVotes: (post.poll.totalVotes || 0) + 1,
              },
            };
          }
          return post;
        });
      });
    } catch (error) {
      console.error('Error voting:', error);
      Toast.show({
        type: 'error',
        text1: 'Could not register your vote, please retry.',
      });
    }
  };
  const fetchPostById = async (postId: string): Promise<Posts | null> => {
    const localPost = posts.find((p: Posts) => p.postId === postId);
    if (localPost) return localPost;
    try {
      const response = await fetchPostByIdAPI(postId);
      if (!response.success) {
        Toast.show({
          type: 'error',
          text1: 'Fetch Error',
          text2: response.message || 'Post not found on server, please retry',
        });
      }
      setPosts(prev => {
        const exists = prev.find(p => p.postId === response.data.postId);
        if (exists) {
          return prev.map(p =>
            p.postId === response.data.postId ? response.data : p,
          );
        } else {
          return [response.data, ...prev];
        }
      });
      return response.data as Posts;
    } catch (error) {
      console.error('Error fetching post from MongoDB:', error);
      return null;
    }
  };
  const handleCartItemToggle = async (productId: string) => {
    const isAlreadyInCart = currentUser?.cart?.includes(productId) ?? false;
    const action = isAlreadyInCart ? 'remove' : 'add';

    const previousCart = currentUser?.cart ?? [];
    const newCart =
      action === 'add'
        ? [...previousCart, productId]
        : previousCart.filter(id => id !== productId);

    setCurrentUser({ ...currentUser, cart: newCart });
    const result = await updateCartAPI(productId, action);
    if (!result.success) {
      setCurrentUser({ ...currentUser, cart: previousCart });
      Toast.show({
        type: 'error',
        text2: 'Could not update cart, please retry.',
      });
    }
  };
  const handleToggleFavorite = async (productId: string) => {
    if (!currentUser) return;

    const previousFavorites = currentUser?.favorites ?? [];
    const isFavorited = previousFavorites.includes(productId);
    const newFavorites = isFavorited
      ? previousFavorites.filter(id => id !== productId)
      : [...previousFavorites, productId];

    setCurrentUser({ ...currentUser, favorites: newFavorites });
    const result = await toggleFavoriteAPI(productId);
    if (!result.success) {
      setCurrentUser({ ...currentUser, favorites: previousFavorites });
      Toast.show({
        type: 'error',
        text2: 'Could not update favorites, please retry.',
      });
    }
  };

  return (
    <AppDataContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        posts,
        setPosts,
        toggleLike,
        incrementImpression,
        toggleBookmark,
        handleRepost,
        incrementShareCount,
        toggleCommentLike,
        addComment,
        handleVote,
        handleCartItemToggle,
        handleToggleFavorite,
        fetchPostById,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

