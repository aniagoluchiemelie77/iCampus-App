import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useRef,
} from 'react';

import type { Product, User, Notification, Posts } from '../types/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from './store';
import { setNotifications2 } from './NotificationSplice';
import { setCartItems } from './CartProductsSlice';
import { baseUrl } from './HomeScreenComponents';
import {
  recordPostImpressionAPI,
  castPollVoteAPI,
  toggleBookmarkAPI,
} from '../api/localPatchApis';
import { fetchPostByIdAPI } from '../api/localGetApis';
import {
  addCommentAPI,
  toggleLikeAPI,
  createRepostAPI,
} from '../api/localPostApis';
interface AppDataContextType {
  events: any[];
  favorites: Product[];
  notification: Notification[];
  cartProducts: Product[];
  favoriteProducts: Product[];
  posts: Posts[];
  setPosts: React.Dispatch<React.SetStateAction<Posts[]>>;
  cart: string[];
  toggleLike: (postId: string) => Promise<void>;
  errorMessage: string | null;
  fetchEvents: () => Promise<void>;
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
  fetchFavorites: () => Promise<void>;
  fetchCartItems: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  toggleFavorite: (productId: string) => Promise<void>;
  handleVote: (postId: string, optionId: string) => Promise<void>;
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
  const [events, setEvents] = useState<any[]>([]);
  const dispatch = useDispatch<AppDispatch>();
  const [favorites] = useState<Product[]>([]);
  const [posts, setPosts] = useState<Posts[]>([]);
  const [cartProducts, setCartProducts] = useState<Product[]>([]);
  const [notification, createNotifications] = useState<Notification[]>([]);
  const [favoriteProducts, setFavoritesProducts] = useState<Product[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cart] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState(user);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch(
        `${baseUrl}user/events?userId=${user.uid}&department=${user.department}&level=${user.current_level}`,
      );
      if (!response.ok) {
        Toast.show({
          type: 'error',
          text1: `Status ${response.status}, couldn't fetch events`,
          position: 'bottom',
          bottomOffset: 5,
        });
      }
      const data = await response.json();
      setEvents(data);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error fetching events:', error);
      Toast.show({
        type: 'error',
        text1: "Error, couldn't fetch events",
        position: 'bottom',
        bottomOffset: 5,
      });
    }
  }, [user.uid, user.department, user.current_level]);

  const fetchFavorites = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}store/favorites`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setFavoritesProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      Toast.show({
        type: 'error',
        text1: "Error, couldn't fetch favorites.",
        position: 'bottom',
        bottomOffset: 5,
      });
    }
  }, []);
  const fetchNotifications = useCallback(async () => {
    const queryParams = new URLSearchParams({
      userId: user.uid,
      limit: '100',
      offset: '0',
      unread: 'true',
    });
    try {
      const res = await fetch(`${baseUrl}users/notifications?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        console.log(data.notifications);
        if (Array.isArray(data.notifications)) {
          dispatch(setNotifications2(data.notifications));
          createNotifications(data.notifications);
        }
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      Toast.show({
        type: 'error',
        text1: "Error, couldn't fetch favorites.",
        position: 'bottom',
        bottomOffset: 5,
      });
    }
  }, [user.uid, dispatch]);

  const fetchCartItems = useCallback(async () => {
    const token = await AsyncStorage.getItem('accessToken');
    console.log('Token:', token);

    try {
      const response = await fetch(`${baseUrl}store/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawData = await response.json();
      console.log('Fetched cart items:', rawData);

      // Normalize each item
      const normalizedItems = rawData.map((item: any) => ({
        ...item,
        quantity: Number(item.cartQuantity) || 1, // ✅ use cartQuantity from backend
        stock: Number(item.quantity) || 0, // ✅ preserve stock separately
      }));

      setCartProducts(normalizedItems);
      dispatch(setCartItems(normalizedItems));
    } catch (error) {
      console.warn(error);
      Toast.show({
        type: 'error',
        text1: "Error, couldn't fetch cart items.",
        position: 'bottom',
        bottomOffset: 5,
      });
    }
  }, [dispatch]);

  const toggleFavorite = async (productId: string) => {
    const token = await AsyncStorage.getItem('accessToken');

    try {
      console.log('Query...');
      const res = await fetch(`${baseUrl}store/toggleFavorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId }),
      });

      if (res.ok) {
        const data = await res.json(); // Get the response body
        Toast.show({
          type: 'success',
          text1: data.message,
          position: 'bottom',
          bottomOffset: 5, // Use server message directly
        });

        // Optional: update local favorites state if returned
        setFavoritesProducts(data.favorites);
      } else {
        const errorData = await res.json();
        Toast.show({
          type: 'error',
          text1: errorData.error || 'Failed to toggle favorite',
          position: 'bottom',
          bottomOffset: 5,
        });
      }
      fetchFavorites(); // Refresh from server
    } catch (error) {
      console.error('Toggle error:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to save product as favorite',
      });
    }
  };
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

    setPosts(prev =>
      prev.map(post => {
        if (post.postId === postId) {
          // 2. Use fallback [] to prevent mapping over undefined
          const currentComments = post.comments ?? [];

          const updatedComments = currentComments.map(c => {
            if (c.commentId === commentId) {
              // 3. Ensure likes array exists before calling .includes
              const currentLikes = c.likes ?? [];
              const isLiked = currentLikes.includes(userId);

              return {
                ...c,
                likes: isLiked
                  ? currentLikes.filter(id => id !== userId)
                  : [...currentLikes, userId],
              };
            }
            return c;
          });

          return { ...post, comments: updatedComments };
        }
        return post;
      }),
    );

    // 4. API Call
    try {
      await fetch(`${baseUrl}posts/${postId}/comments/${commentId}/like`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      console.error('Failed to sync comment like:', error);
      // Optional: Add logic to "roll back" the state if the API fails
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

  useEffect(() => {
    fetchEvents();
    fetchFavorites();
    fetchCartItems();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchEvents();
      fetchFavorites();
      fetchCartItems();
      fetchNotifications();
    }, 2 * 60 * 60 * 1000);
    return () => {
      clearInterval(interval);
    };
  }, [fetchEvents, fetchFavorites, fetchCartItems, fetchNotifications]);

  return (
    <AppDataContext.Provider
      value={{
        events,
        favorites,
        notification,
        cartProducts,
        errorMessage,
        currentUser,
        setCurrentUser,
        cart,
        favoriteProducts,
        posts,
        setPosts,
        fetchEvents,
        fetchFavorites,
        fetchCartItems,
        fetchNotifications,
        toggleFavorite,
        toggleLike,
        incrementImpression,
        toggleBookmark,
        handleRepost,
        incrementShareCount,
        toggleCommentLike,
        addComment,
        handleVote,
        fetchPostById,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

