import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import type {
  User,
  Posts,
  Comment,
  Product,
  CartItem,
  MarketplaceOrder,
  ProductSale,
  Review,
  SupportTicket,
} from '../types/firebase';
import Toast from 'react-native-toast-message';
import { baseUrl } from '../components/HomeScreenComponents';
import {
  recordPostImpressionAPI,
  castPollVoteAPI,
  toggleBookmarkAPI,
  updateCartAPI,
  toggleFavoriteAPI,
} from '../api/localPatchApis';
import {
  clearCartAPI,
  clearFavoritesAPI,
  deletePostApi,
} from '../api/localDeleteApis';
import { db, deleteProductFromLocalDb } from '../hooks/useSQLiteDb';
import { Transaction } from 'react-native-quick-sqlite';
import {
  fetchPostByIdAPI,
  fetchAllProductsAPI,
  fetchSellerSalesAPI,
  fetchPendingOrdersAPI,
  fetchUserReviewsAPI,
  fetchTicketsAPI,
} from '../api/localGetApis';
import { useSellerProducts } from '../hooks/useSQLiteDb.ts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addCommentAPI,
  toggleLikeAPI,
  createRepostAPI,
  bulkAddToCartApi,
  toggleCommentLikeAPI,
  cancelOrderAPI,
} from '../api/localPostApis';
import { setUser } from './UserSlice';
import { useDispatch } from 'react-redux';
interface AppDataContextType {
  posts: Posts[];
  pendingOrders: MarketplaceOrder[];
  isOrdersLoading: boolean;
  setPosts: React.Dispatch<React.SetStateAction<Posts[]>>;
  toggleLike: (postId: string) => Promise<void>;
  currentUser: User;
  sellerSales: ProductSale[];
  fetchSellerSales: () => Promise<void>;
  allReviews: any[];
  syncCatalogToDatabase: () => Promise<void>;
  deleteProductLocal: (productId: string) => Promise<void>;
  emailSupportTickets: SupportTicket[];
  setAllReviews: React.Dispatch<React.SetStateAction<any[]>>;
  refreshReviews: () => Promise<void>;
  handleDeletePost: (postId: string) => Promise<void>;
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
  handleCartItemToggle: (
    product: Product,
    selectedSize?: string,
    selectedColor?: string,
  ) => Promise<void>;
  handleToggleFavorite: (productId: string) => Promise<void>;
  isFetchingMoreOrders: boolean;
  incrementImpression: (postId: string) => Promise<void>;
  toggleBookmark: (postId: string) => Promise<void>;
  incrementShareCount: (postId: string) => Promise<void>;
  fetchPostById: (postId: string) => Promise<Posts | null>;
  handleClearCart: () => Promise<void>;
  handleDeleteAllFavorites: () => Promise<void>;
  handleAddAllFavoritesToCart: () => Promise<void>;
  fetchPendingOrders: (loadMore?: boolean) => Promise<void>;
  handleCancelOrder: (orderId: string, reason: string) => Promise<void>;
  unreadEmailSupportCount: number;
  isEmailSupportLoading: boolean;
  isFetchingMore: boolean;
  nextCursor: string | null;
  fetchEmailSupportTickets: (cursor?: string, limit?: number) => Promise<void>;
}

interface AppDataProviderProps {
  user: User;
  children: ReactNode;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);
const CATALOG_CACHE_KEY = 'local_catalog_cache';

export const useAppDataContext = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppDataContext must be used within an AppDataProvider');
  }
  return context;
};

export const AppDataProvider = ({ user, children }: AppDataProviderProps) => {
  const [posts, setPosts] = useState<Posts[]>([]);
  const dispatch = useDispatch();
  const [cursor, setCursor] = useState<string | null>(null);
  const [isFetchingMoreOrders, setIsFetchingMoreOrders] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const { sellerProducts, refreshProducts } = useSellerProducts(
    currentUser?.uid,
  );
  const [pendingOrders, setPendingOrders] = useState<MarketplaceOrder[]>([]);
  const [sellerSales, setSellerSales] = useState<ProductSale[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [emailSupportTickets, setEmailSupportTickets] = useState<
    SupportTicket[]
  >([]);
  const [isEmailSupportLoading, setIsEmailSupportLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

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
              ? {
                  ...post,
                  repostsCount: (post.repostersDetails.length ?? 0) + 1,
                }
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
    setPosts(currentPosts =>
      currentPosts.map(post =>
        post.postId === postId
          ? { ...post, sharesCount: (post.sharesCount ?? 0) + 1 }
          : post,
      ),
    );
    try {
      await fetch(`${baseUrl}posts/${postId}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
  const handleCartItemToggle = async (
    product: Product,
    selectedSize?: string,
    selectedColor?: string,
  ) => {
    const previousCart = currentUser?.cart ?? [];
    const existingItem = previousCart.find(
      item => item.productId === product.productId,
    );
    const isAlreadyInCart = !!existingItem;
    const action = isAlreadyInCart ? 'remove' : 'add';
    let newCart;

    if (action === 'add') {
      const newItem: CartItem = {
        productId: product.productId,
        quantity: 1,
        selectedSize: selectedSize || product.physicalDetails?.sizes?.[0],
        selectedColor: selectedColor || product.physicalDetails?.colors?.[0],
      };
      newCart = [...previousCart, newItem];
    } else {
      newCart = previousCart.filter(
        item => item.productId !== product.productId,
      );
    }

    const updatedUser = { ...currentUser, cart: newCart };
    setCurrentUser(updatedUser);
    dispatch(setUser(updatedUser));
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

    const result = await updateCartAPI(product.productId, action, {
      selectedSize: selectedSize,
      selectedColor: selectedColor,
      quantity: 1,
    });

    if (!result.success) {
      const rollbackUser = { ...currentUser, cart: previousCart };
      setCurrentUser(rollbackUser);
      dispatch(setUser(rollbackUser));
      await AsyncStorage.setItem('user', JSON.stringify(rollbackUser));

      Toast.show({
        type: 'error',
        text2: 'Could not update cart, please retry.',
      });
    }
  };
  const handleClearCart = async () => {
    const previousCart = currentUser?.cart ?? [];
    const updatedUser = { ...currentUser, cart: [] };

    setCurrentUser(updatedUser);

    dispatch(setUser(updatedUser));
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

    const result = await clearCartAPI();
    if (!result.success) {
      const rollbackUser = { ...currentUser, cart: previousCart };
      setCurrentUser(rollbackUser);
      dispatch(setUser(rollbackUser));
      await AsyncStorage.setItem('user', JSON.stringify(rollbackUser));

      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: result.message || 'Could not clear cart.',
      });
    } else {
      Toast.show({
        type: 'success',
        text1: 'Cart Cleared',
        text2: 'All items have been removed.',
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

    const updatedUser = { ...currentUser, favorites: newFavorites };

    // 1. Optimistic update across local state, Redux, and AsyncStorage
    setCurrentUser(updatedUser);
    dispatch(setUser(updatedUser));
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

    const result = await toggleFavoriteAPI(productId);
    if (!result.success) {
      // 2. Rollback across all states if API fails
      const rollbackUser = { ...currentUser, favorites: previousFavorites };
      setCurrentUser(rollbackUser);
      dispatch(setUser(rollbackUser));
      await AsyncStorage.setItem('user', JSON.stringify(rollbackUser));

      Toast.show({
        type: 'error',
        text2: 'Could not update favorites, please retry.',
      });
    }
  };
  const handleAddAllFavoritesToCart = async () => {
    const favoriteIds = currentUser?.favorites ?? [];
    if (favoriteIds.length === 0) return;

    const itemsToAdd: CartItem[] = favoriteIds.map(id => {
      const product = sellerProducts.find(p => p.productId === id);
      return {
        productId: id,
        quantity: 1,
        selectedColor: product?.physicalDetails?.colors?.[0],
        selectedSize: product?.physicalDetails?.sizes?.[0],
      };
    });

    const existingCart = currentUser?.cart ?? [];
    const updatedCart = [...existingCart];

    itemsToAdd.forEach(newItem => {
      const exists = updatedCart.some(
        item => item.productId === newItem.productId,
      );
      if (!exists) {
        updatedCart.push(newItem);
      }
    });

    const updatedUser = { ...currentUser, cart: updatedCart };
    setCurrentUser(updatedUser);
    dispatch(setUser(updatedUser));
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

    try {
      const result = await bulkAddToCartApi(itemsToAdd);
      if (!result.success) throw new Error();

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'All favorites moved to cart!',
      });
    } catch (error) {
      const rollbackUser = { ...currentUser, cart: existingCart };
      setCurrentUser(rollbackUser);
      dispatch(setUser(rollbackUser));
      await AsyncStorage.setItem('user', JSON.stringify(rollbackUser));

      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not move favorites to cart.',
      });
    }
  };
  const fetchPendingOrders = useCallback(
    async (loadMore = false) => {
      if (loadMore && (!cursor || isFetchingMoreOrders)) return;

      if (loadMore) {
        setIsFetchingMoreOrders(true);
      } else {
        setIsOrdersLoading(true);
      }

      try {
        const result = await fetchPendingOrdersAPI(
          loadMore ? (cursor ?? undefined) : undefined,
        );
        if (result.success) {
          setPendingOrders(prev =>
            loadMore ? [...prev, ...result.data] : result.data,
          );
          setCursor(result.nextCursor);
        } else if (!loadMore) {
          Toast.show({
            type: 'error',
            text1: 'Fetch Error',
            text2: result.message,
          });
        }
      } catch (error) {
        console.error('Failed to fetch pending orders:', error);
      } finally {
        setIsOrdersLoading(false);
        setIsFetchingMoreOrders(false);
      }
    },
    [cursor, isFetchingMoreOrders],
  );
  const handleDeleteAllFavorites = async () => {
    const previousFavorites = currentUser?.favorites ?? [];
    const updatedUser = { ...currentUser, favorites: [] };
    setCurrentUser(updatedUser);
    dispatch(setUser(updatedUser));
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

    const result = await clearFavoritesAPI();

    if (!result.success) {
      const rollbackUser = { ...currentUser, favorites: previousFavorites };
      setCurrentUser(rollbackUser);
      dispatch(setUser(rollbackUser));
      await AsyncStorage.setItem('user', JSON.stringify(rollbackUser));

      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not clear favorites, please retry.',
      });
    } else {
      Toast.show({
        type: 'success',
        text1: 'Favorites Cleared',
        text2: 'All items have been removed.',
      });
    }
  };
  const handleCancelOrder = async (orderId: string, reason: string) => {
    const result = await cancelOrderAPI(orderId, reason);
    if (result.success) {
      setPendingOrders(prev => prev.filter(o => o.orderId !== orderId));
      Toast.show({
        type: 'success',
        text2: 'Your order has been cancelled and funds refunded',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Cancel Error',
        text2: result.message,
      });
    }
  };
  const syncCatalogToDatabase = async () => {
    try {
      const now = Date.now();
      const lastSync = await AsyncStorage.getItem('CATALOG_SYNC_TIME');
      const thirtyMinutes = 30 * 60 * 1000;
      if (!lastSync || now - parseInt(lastSync, 10) > thirtyMinutes) {
        const result = await fetchAllProductsAPI();

        if (result.success && result.data) {
          db.transaction((tx: Transaction) => {
            for (const product of result.data) {
              tx.execute(
                `INSERT OR REPLACE INTO products (productId, title, description, priceInPoints, sellerId, type, amountInStock, mediaUrls, physicalDetails) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                  product.productId,
                  product.title,
                  product.description,
                  product.priceInPoints,
                  product.sellerId,
                  product.type,
                  product.amountInStock,
                  JSON.stringify(product.mediaUrls),
                  JSON.stringify(product.physicalDetails),
                ],
              );
            }
          });

          await AsyncStorage.setItem('CATALOG_SYNC_TIME', now.toString());
        }
      }
    } catch (error) {
      console.error('Database sync failed:', error);
    }
  };
  const fetchSellerSales = async () => {
    try {
      const response = await fetchSellerSalesAPI();
      if (response.success) {
        setSellerSales(response.data);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Fetch Error',
          text2: response.message || 'An unexpected error occurred',
        });
      }
    } catch (error: any) {
      console.error('Error fetching sales:', error);
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: error.message || 'Check your connection',
      });
    }
  };
  const fetchReviews = async () => {
    try {
      const response = await fetchUserReviewsAPI();
      if (response.success) {
        setAllReviews(response.data);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Fetch Error',
          text2: response.message || 'An unexpected error occurred',
        });
      }
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
    }
  };
  const deleteProductLocal = async (productId: string) => {
    try {
      deleteProductFromLocalDb(productId);
      refreshProducts();
    } catch (error) {
      console.error('Failed local product deletion pipeline:', error);
    }
  };
  const handleDeletePost = async (postId: string): Promise<void> => {
    try {
      const response = await deletePostApi(postId);
      if (response && response.success) {
        setPosts(currentPosts =>
          currentPosts.filter(post => post.postId !== postId),
        );
        Toast.show({ type: 'success', text2: 'Post deleted successfully' });
      } else {
        Toast.show({ type: 'error', text2: 'Failed to delete post' });
      }
    } catch (error) {
      console.error('Context Delete Post Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Delete Error',
        text2: 'Could not delete your post. Please try again.',
      });
      throw error;
    }
  };
  const fetchEmailSupportTickets = async (
    cursor: string = '',
    limit: number = 15,
  ) => {
    if (cursor) {
      setIsFetchingMore(true);
    } else {
      setIsEmailSupportLoading(true);
    }

    const result = await fetchTicketsAPI({ limit, cursor });

    if (result.success) {
      const externalInquiries = result.tickets.filter(
        (ticket: any) => ticket.source === 'email' || ticket.guestEmail,
      );

      setEmailSupportTickets(prevTickets => {
        return cursor
          ? [...prevTickets, ...externalInquiries]
          : externalInquiries;
      });
      setNextCursor(result.nextCursor);
    }

    setIsEmailSupportLoading(false);
    setIsFetchingMore(false);
  };
  const unreadEmailSupportCount = emailSupportTickets.filter(
    (ticket: any) => ticket.status === 'open',
  ).length;

  useEffect(() => {
    fetchReviews();
    syncCatalogToDatabase();
  }, []);
  return (
    <AppDataContext.Provider
      value={{
        handleDeletePost,
        deleteProductLocal,
        syncCatalogToDatabase,
        currentUser,
        allReviews,
        setAllReviews,
        refreshReviews: fetchReviews,
        sellerSales,
        fetchSellerSales,
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
        handleClearCart,
        handleDeleteAllFavorites,
        handleAddAllFavoritesToCart,
        pendingOrders,
        fetchPendingOrders,
        isOrdersLoading,
        handleCancelOrder,
        emailSupportTickets,
        unreadEmailSupportCount,
        isEmailSupportLoading,
        fetchEmailSupportTickets,
        nextCursor,
        isFetchingMore,
        isFetchingMoreOrders,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

