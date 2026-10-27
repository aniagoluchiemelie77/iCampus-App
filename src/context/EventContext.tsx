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
  Product,
  CartItem,
  MarketplaceOrder,
  ProductSale,
  Review,
} from '../types/firebase';
import Toast from 'react-native-toast-message';
import { baseUrl } from '../components/HomeScreenComponents';
import {
  recordPostImpressionAPI,
  updateCartAPI,
  toggleFavoriteAPI,
} from '../api/localPatchApis';
import {
  clearCartAPI,
  clearFavoritesAPI,
  deletePostApi,
} from '../api/localDeleteApis';
import {
  db,
  deleteProductFromLocalDb,
  fetchProductsByIdsFromLocalDb,
  parseProductRow,
  setupDatabase,
  upsertProductToLocalDb,
} from '../hooks/useSQLiteDb';
import {
  fetchPostByIdAPI,
  fetchAllProductsAPI,
  fetchSellerSalesAPI,
  fetchPendingOrdersAPI,
  fetchUserReviewsAPI,
  fetchAllUsersAPI,
} from '../api/localGetApis';
import { useSellerProducts } from '../hooks/useSQLiteDb.ts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelOrderAPI } from '../api/localPostApis';
import { setUser } from './UserSlice';
import { useDispatch } from 'react-redux';
interface AppDataContextType {
  posts: Posts[];
  pendingOrders: MarketplaceOrder[];
  isOrdersLoading: boolean;
  setPosts: React.Dispatch<React.SetStateAction<Posts[]>>;
  currentUser: User;
  sellerSales: ProductSale[];
  fetchSellerSales: () => Promise<void>;
  allReviews: any[];
  /** Pass `{ force: true }` to bypass the 30-minute throttle (e.g. Inventory). */
  syncCatalogToDatabase: (options?: { force?: boolean }) => Promise<void>;
  syncUsersToDatabase: () => Promise<void>;
  /**
   * Incremented every time the local catalog cache is (re)written.
   * Screens that read products out of SQLite include this in their query
   * dependencies so they refresh once the async sync actually lands.
   */
  catalogSyncVersion: number;
  /** Full local product cache, used by Checkout to resolve cart entries. */
  allProducts: Product[];
  deleteProductLocal: (productId: string) => Promise<void>;
  setAllReviews: React.Dispatch<React.SetStateAction<any[]>>;
  refreshReviews: () => Promise<void>;
  handleDeletePost: (postId: string) => Promise<void>;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  handleCartItemToggle: (
    product: Product,
    selectedSize?: string,
    selectedColor?: string,
  ) => Promise<void>;
  handleToggleFavorite: (productId: string) => Promise<void>;
  isFetchingMoreOrders: boolean;
  incrementImpression: (postId: string) => Promise<void>;
  incrementShareCount: (postId: string) => Promise<void>;
  fetchPostById: (postId: string) => Promise<Posts | null>;
  patchPost: (postId: string, updater: (post: Posts) => Posts) => void;
  upsertPost: (post: Posts) => void;
  handleClearCart: () => Promise<void>;
  handleDeleteAllFavorites: () => Promise<void>;
  fetchPendingOrders: (loadMore?: boolean) => Promise<void>;
  handleCancelOrder: (orderId: string, reason: string) => Promise<void>;
  isDeletingPost: boolean;
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
  const dispatch = useDispatch();
  const [cursor, setCursor] = useState<string | null>(null);
  const [isFetchingMoreOrders, setIsFetchingMoreOrders] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const { refreshProducts } = useSellerProducts(currentUser?.uid);
  const [pendingOrders, setPendingOrders] = useState<MarketplaceOrder[]>([]);
  const [sellerSales, setSellerSales] = useState<ProductSale[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [catalogSyncVersion, setCatalogSyncVersion] = useState(0);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  /** Mirrors the local `products` cache into React state. */
  const loadAllProductsFromCache = useCallback(() => {
    try {
      const result = db.execute('SELECT * FROM products;');
      const rows = result?.rows;
      const rawProducts = Array.isArray(rows)
        ? rows
        : rows && '_array' in rows
          ? rows._array
          : [];
      setAllProducts(rawProducts.map(parseProductRow));
    } catch (error) {
      console.error('Failed to load product cache into state:', error);
    }
  }, []);

  // The provider receives `user` as a prop; useState only reads it once, so
  // without this a fresh login left currentUser empty and every like,
  // bookmark, repost and vote acted as a signed-out user.
  // When the user changes (logout → new login), clear all user-scoped
  // state so data from the previous account never leaks into the new one.
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (prevUserRef.current?.uid !== user?.uid) {
      setPosts([]);
      setCursor(null);
      setPendingOrders([]);
      setCurrentUser(user);
    }
    prevUserRef.current = user;
  }, [user]);

  /** Applies an update to one post in the shared list (no-op if absent). */
  const patchPost = useCallback(
    (postId: string, updater: (post: Posts) => Posts) => {
      setPosts(prev =>
        prev.map(post =>
          (post.postId || post.id) === postId ? updater(post) : post,
        ),
      );
    },
    [],
  );
  /** Replaces a post in the list, or prepends it if it isn't there yet. */
  const upsertPost = useCallback((incoming: Posts) => {
    const id = incoming.postId || incoming.id;
    setPosts(prev => {
      const exists = prev.some(p => (p.postId || p.id) === id);
      return exists
        ? prev.map(p => ((p.postId || p.id) === id ? { ...p, ...incoming } : p))
        : [incoming, ...prev];
    });
  }, []);
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
  /** Always fetches the latest copy (counts, comments, visibility) from the server. */
  const fetchPostById = useCallback(
    async (postId: string): Promise<Posts | null> => {
      try {
        const response = await fetchPostByIdAPI(postId);
        if (!response.success || !response.data) return null;
        const fresh = response.data as Posts;
        patchPost(postId, existing => ({ ...existing, ...fresh }));
        return fresh;
      } catch (error) {
        console.error('Error fetching post:', error);
        return null;
      }
    },
    [patchPost],
  );
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

    const resolvedSize =
      selectedSize || product.physicalDetails?.sizes?.[0] || undefined;
    const resolvedColor =
      selectedColor || product.physicalDetails?.colors?.[0] || undefined;
    console.log('Action: ', action);

    if (action === 'add') {
      const newItem: CartItem = {
        productId: product.productId,
        quantity: 1,
        selectedSize:
          selectedSize || product.physicalDetails?.sizes?.[0] || undefined,
        selectedColor:
          selectedColor || product.physicalDetails?.colors?.[0] || undefined,
      };
      newCart = [...previousCart, newItem];
    } else {
      newCart = previousCart.filter(
        item => item.productId !== product.productId,
      );
    }

    const updatedUser = { ...currentUser, cart: newCart };
    console.log('New cart Item: ', newCart);
    setCurrentUser(updatedUser);
    dispatch(setUser(updatedUser));
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

    const result = await updateCartAPI(product.productId, action, {
      selectedSize: resolvedSize,
      selectedColor: resolvedColor,
      quantity: 1,
    });
    console.log('Toggle cart action result: ', result.data);

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

    console.log(
      'Action: ',
      isFavorited ? 'Remove from Favorites' : 'Add to Favorites',
    );

    const updatedUser = { ...currentUser, favorites: newFavorites };
    setCurrentUser(updatedUser);
    dispatch(setUser(updatedUser));
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

    const result = await toggleFavoriteAPI(productId);
    console.log('Toggle Favorite Result: ', result?.data);
    if (!result.success) {
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
  const catalogSyncInFlightRef = useRef(false);
  const syncCatalogToDatabase = async (options?: { force?: boolean }) => {
    if (catalogSyncInFlightRef.current) return;
    catalogSyncInFlightRef.current = true;
    try {
      const now = Date.now();
      const lastSync = await AsyncStorage.getItem('CATALOG_SYNC_TIME');
      const thirtyMinutes = 30 * 60 * 1000;

      if (
        options?.force ||
        !lastSync ||
        now - parseInt(lastSync, 10) > thirtyMinutes
      ) {
        // Network first. Without `true` this returned the very first catalog
        // ever saved in AsyncStorage forever, so SQLite kept being refilled
        // with stale stock (shown as "Out of Stock"). The AsyncStorage copy
        // is still used as the offline fallback inside fetchAllProductsAPI.
        const result = await fetchAllProductsAPI(true);

        if (result.success && result.data) {
          let syncedCount = 0;
          let failedCount = 0;

          for (const product of result.data) {
            try {
              upsertProductToLocalDb(product);
              syncedCount++;
            } catch (rowError) {
              // One malformed row must never abort the whole catalog sync —
              // that used to leave the cache empty and blank Favorites/Cart.
              failedCount++;
              console.error(
                'Failed to cache product locally:',
                product?.productId,
                rowError,
              );
            }
          }

          console.log(
            `Catalog sync complete: ${syncedCount} cached, ${failedCount} skipped.`,
          );
          await AsyncStorage.setItem('CATALOG_SYNC_TIME', now.toString());
        }
      }
    } catch (error) {
      console.error('Database sync failed:', error);
    } finally {
      catalogSyncInFlightRef.current = false;
      // Always publish, even on failure, so screens stop reading a stale cache.
      loadAllProductsFromCache();
      setCatalogSyncVersion(previous => previous + 1);
    }
  };
  const syncUsersToDatabase = async () => {
    try {
      const now = Date.now();
      const lastSync = await AsyncStorage.getItem('USERS_SYNC_TIME');
      const thirtyMinutes = 30 * 60 * 1000;

      if (!lastSync || now - parseInt(lastSync, 10) > thirtyMinutes) {
        const result = await fetchAllUsersAPI();

        if (result.success && result.data) {
          for (const user of result.data) {
            db.execute(
              `INSERT OR REPLACE INTO users (uid, firstname, lastname, username, organizationName, profilePic) 
             VALUES (?, ?, ?, ?, ?, ?);`,
              [
                user.uid,
                user.firstname || null,
                user.lastname || null,
                user.username || null,
                user.organizationName || null,
                JSON.stringify(user.profilePic || []),
              ],
            );
          }

          await AsyncStorage.setItem('USERS_SYNC_TIME', now.toString());
        }
      }
    } catch (error) {
      console.error('Users database sync failed:', error);
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
      }
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
    }
  };
  const deleteProductLocal = async (productId: string) => {
    try {
      deleteProductFromLocalDb(productId);
      refreshProducts();
      loadAllProductsFromCache();
      setCatalogSyncVersion(previous => previous + 1);
    } catch (error) {
      console.error('Failed local product deletion pipeline:', error);
    }
  };
  const handleDeletePost = async (postId: string): Promise<void> => {
    try {
      setIsDeletingPost(true);
      const response = await deletePostApi(postId);
      if (response && response.success) {
        setIsDeletingPost(false);
        setPosts(currentPosts =>
          currentPosts.filter(post => post.postId !== postId),
        );
        Toast.show({ type: 'success', text2: 'Post deleted successfully' });
      } else {
        setIsDeletingPost(false);
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
  useEffect(() => {
    setupDatabase();
    syncUsersToDatabase();
    fetchReviews();
    syncCatalogToDatabase();
    // Seed the in-memory cache so screens render immediately from whatever is
    // already on disk, before/without waiting for the network sync.
    loadAllProductsFromCache();
  }, []);
  return (
    <AppDataContext.Provider
      value={{
        handleDeletePost,
        deleteProductLocal,
        syncCatalogToDatabase,
        syncUsersToDatabase,
        catalogSyncVersion,
        allProducts,
        currentUser,
        allReviews,
        setAllReviews,
        refreshReviews: fetchReviews,
        sellerSales,
        fetchSellerSales,
        setCurrentUser,
        posts,
        setPosts,
        incrementImpression,
        incrementShareCount,
        handleCartItemToggle,
        handleToggleFavorite,
        fetchPostById,
        patchPost,
        upsertPost,
        handleClearCart,
        handleDeleteAllFavorites,
        pendingOrders,
        fetchPendingOrders,
        isOrdersLoading,
        handleCancelOrder,
        isFetchingMoreOrders,
        isDeletingPost,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};
