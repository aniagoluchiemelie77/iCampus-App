import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
  TouchableOpacity,
  Image,
  TextInput,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  ViewToken,
} from 'react-native';
import { PostCard } from './PostCard';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDataContext } from './EventContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from './hooks';
import { SwipeListView } from 'react-native-swipe-list-view';
import type {
  ProductCategoryList,
  Product,
  User,
  Posts,
} from '../types/firebase';
import {
  HomeScreenComponentStyles,
  NotificationPageStyles,
  PRIMARY_COLOR,
  homeStyles,
  modalStyles,
} from '../assets/styles/colors';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import toastConfig from './ToastConfig';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import {
  addToCart,
  removeFromCart,
  selectCartProductIds,
  selectCartItems,
  clearCart,
  selectTotalPoints,
} from './CartProductsSlice';
import Logo from '../assets/images/Logo.tsx';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import ExpandableFAB from './ExpandableFAB.tsx';
import { useSocket } from './socketContext.ts';
import { UserIdentity } from './UserIdentity.tsx';
export const baseUrl = 'http://192.168.1.98:5000/';
interface Props {
  navigation: StackNavigationProp<any>; // Replace 'any' with your ParamList if you have one
  initialCount?: number;
  uid?: string;
}
const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: User; // Ideally use your User type here
  navigation: any;
}
const ProfileModal = ({
  visible,
  onClose,
  currentUser,
  navigation,
}: ProfileModalProps) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    {/* Dark Overlay to close the modal */}
    <TouchableOpacity
      activeOpacity={1}
      style={modalStyles.overlay}
      onPress={onClose}
    />

    <View style={modalStyles.drawer}>
      <TouchableOpacity
        style={modalStyles.userInfo}
        onPress={() =>
          navigation.navigate('ProfileScreen', { identifier: currentUser?.uid })
        }
      >
        <Image
          source={{
            uri:
              currentUser?.profilePic?.at(-1) ||
              'https://via.placeholder.com/40',
          }}
          style={modalStyles.largeAvatar}
        />
        <UserIdentity
          firstname={currentUser.firstname!}
          lastname={currentUser.lastname!}
          username={currentUser.username}
          tier={currentUser?.tier || 'free'}
          isVerified={currentUser?.isVerified}
          size="medium"
          isOrganization={currentUser?.usertype === 'enterprise'}
          organizationName={currentUser?.organizationName}
        />
        {currentUser.headline && (
          <Text style={modalStyles.userSubtext}>{currentUser.headline}</Text>
        )}
      </TouchableOpacity>

      {/* 1. PERSONAL SECTION */}
      <TouchableOpacity
        style={modalStyles.item}
        onPress={() => {
          navigation.navigate('ICashDashboard', {
            refresh: true,
          });
        }}
      >
        <MaterialIcons
          name="account-balance-wallet-oulined"
          size={24}
          color="#333"
        />
        <Text style={modalStyles.itemText}>iCash</Text>
      </TouchableOpacity>

      {/* 2. SETTINGS SECTION */}
      <View style={modalStyles.separator} />

      <TouchableOpacity
        style={modalStyles.item}
        onPress={() => {
          onClose();
          //navigation.navigate('Subscription');
        }}
      >
        <MaterialIcons
          name="verified-outlined"
          size={24}
          color={PRIMARY_COLOR}
        />
        <Text style={modalStyles.itemText}>Manage Subscription</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={modalStyles.item}
        onPress={() => {
          onClose();
          navigation.navigate('Settings');
        }}
      >
        <MaterialIcons name="settings-outlined" size={24} color="#333" />
        <Text style={modalStyles.itemText}>Settings</Text>
      </TouchableOpacity>
    </View>
  </Modal>
);
export const NotificationBell: React.FC<Props> = ({
  navigation,
  initialCount = 0,
}) => {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const socketContext = useSocket();
  const socket = socketContext?.socket;

  useEffect(() => {
    if (!socket) return;
    const handleNotification = (_data: any) => {
      setUnreadCount(prev => prev + 1);
    };
    // Listen for new notifications to bump the count
    socket.on('new_notification', handleNotification);

    return () => {
      socket.off('new_notification', handleNotification);
    };
  }, [socket]);

  return (
    <TouchableOpacity
      onPress={() => {
        setUnreadCount(0);
        navigation.navigate('Notifications');
      }}
      style={[
        homeStyles.iconItem,
        HomeScreenComponentStyles.activityIcons,
        HomeScreenComponentStyles.activityIcons2,
        HomeScreenComponentStyles.notificationContainer,
      ]}
    >
      <MaterialIcons
        name="notifications-outlined"
        size={23}
        color={PRIMARY_COLOR}
      />

      {unreadCount > 0 && (
        <View style={HomeScreenComponentStyles.badge}>
          <Text style={HomeScreenComponentStyles.badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
export const MessageBell: React.FC<Props> = ({
  navigation,
  initialCount = 0,
  uid,
}) => {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  useEffect(() => {
    if (!socket) return;
    const handleNewMsg = (data: any) => {
      if (data.senderId !== uid) {
        setUnreadCount(prev => prev + 1);
      }
    };
    socket.on('receive_message', handleNewMsg);
    return () => {
      socket.off('receive_message', handleNewMsg);
    };
  }, [socket, uid]);

  return (
    <TouchableOpacity
      onPress={() => {
        setUnreadCount(0);
        navigation.navigate('MessagesList');
      }}
      style={[
        homeStyles.iconItem,
        HomeScreenComponentStyles.activityIcons,
        HomeScreenComponentStyles.activityIcons2,
        HomeScreenComponentStyles.notificationContainer,
        { marginLeft: 3 },
      ]}
    >
      <MaterialIcons name="chat-outlined" size={23} color={PRIMARY_COLOR} />
      {unreadCount > 0 && (
        <View style={HomeScreenComponentStyles.badge}>
          <Text style={HomeScreenComponentStyles.badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export function Home() {
  const { posts, setPosts, incrementImpression, currentUser } =
    useAppDataContext();
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFabMenuVisible, setFabMenuVisible] = useState(false);
  const [isProfilePopupVisible, setProfilePopupVisible] = useState(false);
  const navigation = useNavigation<any>();
  const toggleFab = () => setFabMenuVisible(!isFabMenuVisible);
  const loadPosts = useCallback(
    async (isRefreshing = false) => {
      if (loadingMore || (refreshing && !isRefreshing)) return;
      // If refreshing, reset cursor. If loading more, use existing cursor.
      const currentCursor = isRefreshing ? '' : cursor || '';

      // Stop if we have no cursor and it's not a fresh load
      if (!isRefreshing && cursor === null && posts.length > 0) return;

      if (isRefreshing) setRefreshing(true);
      else setLoadingMore(true);

      try {
        const response = await fetch(
          `${baseUrl}posts/fetchPosts?limit=10&cursor=${currentCursor}`,
        );
        const data = await response.json();

        // data.posts and data.nextCursor come from your updated backend logic
        setPosts(prev =>
          isRefreshing ? data.posts : [...prev, ...data.posts],
        );
        setCursor(data.nextCursor);
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [cursor, loadingMore, refreshing, posts.length, setPosts],
  );
  useEffect(() => {
    loadPosts(true); // Initial load
  }, [loadPosts]);
  useEffect(() => {
    socket?.on('new_post', (newPost: Posts) => {
      setPosts(prevPosts => {
        if (prevPosts.find(p => p.postId === newPost.postId)) return prevPosts;
        return [newPost, ...prevPosts];
      });
    });

    // B. Listen for STAT updates (Likes, Reposts, Bookmarks, Impressions)
    socket?.on('post_stats_updated', (data: { postId: string; stats: any }) => {
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.postId === data.postId) {
            // --- HAPTIC LOGIC ---
            // 1. Check if this is a "Like" increase
            const isNewLike =
              data.stats.likes?.length > (post.likes?.length || 0);

            // 2. Check if the logged-in user is the author of this post
            const isMyPost = post.userId.uid === currentUser.uid;

            if (isNewLike && isMyPost) {
              // Trigger a "Impact Light" thump
              ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
            }
            // --------------------
            return {
              ...post,
              ...data.stats,
            };
          }
          return post;
        }),
      );
    });

    // C. CLEANUP: Very important to prevent memory leaks and duplicate listeners
    return () => {
      socket?.off('new_post');
      socket?.off('post_stats_updated');
    };
  }, [setPosts, currentUser.uid, socket]);

  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
      changed,
    }: {
      viewableItems: ViewToken[];
      changed: ViewToken[];
    }) => {
      changed.forEach((viewToken: ViewToken) => {
        // Type defined here
        if (viewToken.isViewable && viewToken.item) {
          incrementImpression(viewToken.item.postId);
        }
      });

      if (viewableItems.length > 0 && viewableItems[0].item) {
        setActivePostId(viewableItems[0].item.postId);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  return (
    <View style={homeStyles.mainWrapper}>
      <View style={homeStyles.headerContainer}>
        <TouchableOpacity onPress={() => setProfilePopupVisible(true)}>
          <Image
            source={{
              uri:
                currentUser?.profilePic?.at(-1) ||
                'https://via.placeholder.com/40',
            }}
            style={homeStyles.headerProfilePic}
          />
        </TouchableOpacity>
        <Logo />
        <View style={homeStyles.headerContainerDiv}>
          <NotificationBell navigation={navigation} initialCount={0} />
          <MessageBell
            navigation={navigation}
            initialCount={0}
            uid={currentUser.uid}
          />
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item.postId}
        renderItem={({ item }) => (
          <PostCard post={item} isVisible={item.postId === activePostId} />
        )}
        // Interaction Props
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        // Pagination Props
        onEndReached={() => loadPosts(false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ margin: 20 }} /> : null
        }
        // Refresh Props
        refreshing={refreshing}
        onRefresh={() => loadPosts(true)}
        // Performance Optimization
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
      {/* 3. UPDATED FAB LOGIC */}
      {!isFabMenuVisible && (
        <TouchableOpacity
          style={homeStyles.fab}
          onPress={() => setFabMenuVisible(true)}
        >
          <MaterialIcons name="widgets-outlined" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* 4. EXPANDABLE MENU MODAL */}
      <ExpandableFAB
        isVisible={isFabMenuVisible}
        onClose={toggleFab}
        userRole={currentUser.usertype as 'student' | 'lecturer' | 'otherUser'}
        actions={['iCash', 'Create Post', 'Create Poll', 'iAssistant']}
      />

      {/* 4. PROFILE POPUP (LinkedIn Style Modal) */}
      <ProfileModal
        visible={isProfilePopupVisible}
        onClose={() => setProfilePopupVisible(false)}
        currentUser={currentUser}
        navigation={navigation}
      />
    </View>
  );
}

// StoreScreen.js
export function StoreScreen() {
  const user = useAppSelector(state => state.user);
  const { fetchFavorites, fetchCartItems, toggleFavorite, favoriteProducts } =
    useAppDataContext();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategoryList[]>([]);
  const [page, setPage] = useState(0);
  const [imageIndexes, setImageIndexes] = useState<{ [key: string]: number }>(
    {},
  );

  const [fadeAnims, setFadeAnims] = useState<{
    [key: string]: Animated.Value;
  }>({});
  const [loading, setLoading] = useState(false);
  const limit = 10;

  const [pressed, setPressed] = useState<{ [key: string]: boolean }>({});

  const [showCart, setShowCart] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState('');

  const openFavoritesPopup = () => {
    setShowFavorites(true);
    fetchFavorites();
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };
  const openCartItemsPopup = () => {
    setShowCart(true);
    fetchCartItems();
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };
  const closePopup = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 50,
      useNativeDriver: true,
    }).start(() => {
      setShowCart(false);
      setShowFavorites(false);
    });
  };
  const handleAddToCart = async (product: Product) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');

      const res = await fetch(`${baseUrl}store/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: product.productId }), // or product._id
      });

      if (res.ok) {
        setPressed(prev => ({
          ...prev,
          [product.productId]: true, // ✅ must match item.productId
        }));
        await fetchCartItems();
        dispatch(
          addToCart({
            ...product,
            quantity: 1,
          }),
        );
        Toast.show({
          type: 'success',
          text2: 'Product successfully added to cart',
        });
      } else {
        Toast.show({
          type: 'error',
          text2: 'Failed to add to cart',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text2: 'Failed to add to cart',
      });
    }
  };
  const handleClearCart = async () => {
    console.log('Clear cart btn clicked');
    try {
      const token = await AsyncStorage.getItem('accessToken');

      const res = await fetch(`${baseUrl}store/cart`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        dispatch(clearCart()); // Optional: clear Redux cart state
        await fetchCartItems(); // Refresh cart view
        Toast.show({
          type: 'success',
          text2: 'Cart cleared successfully',
        });
      } else {
        Toast.show({
          type: 'error',
          text2: 'Failed to clear cart',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text2: 'Failed to clear cart',
      });
    }
  };
  const handleClearFavorites = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');

      const res = await fetch(`${baseUrl}store/favorites`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        await fetchFavorites(); // Refresh cart view
        Toast.show({
          type: 'success',
          text2: 'Favorites cleared successfully',
        });
      } else {
        Toast.show({
          type: 'error',
          text2: 'Failed to clear favorites',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text2: 'Failed to clear favorites',
      });
    }
  };
  const deleteItem = async (productId: string) => {
    console.log('Removing Product');
    const token = await AsyncStorage.getItem('accessToken');
    try {
      const res = await fetch(`${baseUrl}store/cart/remove`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        dispatch(removeFromCart({ productId }));
        fetchCartItems();
      } else {
        Toast.show({
          type: 'error',
          text2: "Error, couldn't delete cart item. Please retry.",
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text2: "Error, couldn't delete cart item. Please retry.",
      });
    }
  };
  const removeFavorite = async (productId: string) => {
    console.log('Removing Favorite');
    const token = await AsyncStorage.getItem('accessToken');
    try {
      await fetch(`${baseUrl}store/favorites/remove`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });
      fetchFavorites();
    } catch (error) {
      Toast.show({
        type: 'error',
        text2: "Error, couldn't remove item from favorites, please retry.",
      });
    }
  };
  const totalPoints = useSelector(selectTotalPoints);
  const cartProducts = useSelector(selectCartItems);

  //Seach Query Functionality
  useEffect(() => {
    const fetchResults = async () => {
      if (!user?.schoolName || searchQuery.trim() === '') return;

      try {
        const params = new URLSearchParams({
          schoolName: user.schoolName,
          search: searchQuery,
          limit: '10',
          offset: '0',
        });

        const response = await fetch(
          `${baseUrl}store/search?${params.toString()}`,
        );
        const data = await response.json();
        console.log('Query Results:', data.products);
        setProducts(data.products);
      } catch (error) {
        Toast.show({
          type: 'error',
          text2: "Error, couldn't fetch cart items.",

          bottomOffset: 5,
        });
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchResults();
    }, 300); // debounce delay

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, user?.schoolName]);

  // Fetch categories
  useEffect(() => {
    if (!user?.schoolName) return;
    const encodedSchool = encodeURIComponent(user.schoolName);

    fetch(`${baseUrl}store/categories?schoolName=${encodedSchool}`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error('Error fetching categories:', err));
  }, [user?.schoolName]);

  // Fetch products
  useEffect(() => {
    if (!user?.schoolName || !user?.uid) return;
    setLoading(true);

    const encodedSchool = encodeURIComponent(user.schoolName);
    const encodedUserId = encodeURIComponent(user.uid);
    const categoryParam =
      selectedCategory === 'all'
        ? ''
        : `&category=${encodeURIComponent(selectedCategory)}`;
    const offset = page * limit;

    fetch(
      `${baseUrl}store/products?schoolName=${encodedSchool}&userId=${encodedUserId}${categoryParam}&limit=${limit}&offset=${offset}`,
    )
      .then(res => res.json())
      .then(data => {
        setProducts(data.products);
        const anims: { [key: string]: Animated.Value } = {};
        (data.products as Product[]).forEach((p: Product) => {
          anims[p.productId] = new Animated.Value(1);
        });
        setFadeAnims(anims);
      })
      .catch(err => console.error('Error fetching products:', err))
      .finally(() => setLoading(false));
  }, [selectedCategory, page, user?.schoolName, user?.uid]);

  // Image switching every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndexes(prev => {
        const updated = { ...prev };

        products.forEach(product => {
          const urls = product.mediaUrls;
          if (urls.length > 1) {
            const currentIndex = prev[product.productId] || 0;
            const nextIndex = (currentIndex + 1) % urls.length;

            Animated.sequence([
              Animated.timing(fadeAnims[product.productId], {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(fadeAnims[product.productId], {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }),
            ]).start();

            updated[product.productId] = nextIndex;
          }
        });

        return updated;
      });
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [products, fadeAnims]);
  const cartProductIds = useSelector(selectCartProductIds);

  return (
    <LinearGradient
      style={HomeScreenComponentStyles.bckg}
      colors={['#eee', '#edccbdff']}
    >
      <View style={HomeScreenComponentStyles.searchContainer}>
        <Logo />
        <View style={HomeScreenComponentStyles.iconSubdiv2}>
          {user.hasSubscribed && (
            <TouchableOpacity
              //onPress={openFavoritesPopup}
              style={[
                homeStyles.iconItem,
                HomeScreenComponentStyles.activityIcons,
                HomeScreenComponentStyles.activityIcons2,
              ]}
            >
              <MaterialIcons name="manage-accounts" size={25} color="#f54b02" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={openFavoritesPopup}
            style={[
              homeStyles.iconItem,
              HomeScreenComponentStyles.activityIcons,
              HomeScreenComponentStyles.activityIcons2,
            ]}
          >
            <MaterialIcons name="favorite-border" size={25} color="#f54b02" />
            {favoriteProducts.length > 0 && (
              <View style={HomeScreenComponentStyles.badge}>
                <Text style={HomeScreenComponentStyles.badgeText}>
                  {favoriteProducts.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openCartItemsPopup}
            style={[
              homeStyles.iconItem,
              HomeScreenComponentStyles.activityIcons,
              HomeScreenComponentStyles.activityIcons2,
            ]}
          >
            <MaterialIcons name="shopping-cart" size={25} color="#f54b02" />
            {cartProducts.length > 0 && (
              <View style={HomeScreenComponentStyles.badge}>
                <Text style={HomeScreenComponentStyles.badgeText}>
                  {cartProducts.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={HomeScreenComponentStyles.activityDiv}>
        <View style={HomeScreenComponentStyles.inputContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color="#838181"
            style={HomeScreenComponentStyles.icon}
          />
          <TextInput
            style={HomeScreenComponentStyles.input}
            placeholder="Search..."
            placeholderTextColor="#838181"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={HomeScreenComponentStyles.storeCategoriesDiv}
          horizontal
        >
          <View style={HomeScreenComponentStyles.storeCategoriesDivSubdiv}>
            {['All', 'Popular', ...categories].map(cat => {
              const isString = typeof cat === 'string';
              const categoryName = isString ? cat : cat.categoryName;
              const categoryId = isString
                ? cat.toLowerCase()
                : String(cat.categoryName).trim().toLowerCase();
              const isActive = selectedCategory === categoryId;
              const categoryIcon = isString ? null : cat.icon; // assuming icon is defined in category object

              return (
                <TouchableOpacity
                  key={categoryId}
                  style={[
                    HomeScreenComponentStyles.tabItem2,
                    isActive && HomeScreenComponentStyles.activeTab,
                  ]}
                  onPress={() => {
                    setSelectedCategory(categoryId);
                    setPage(0);
                  }}
                >
                  {!isString && categoryIcon && (
                    <MaterialCommunityIcons
                      color="#333"
                      name={categoryIcon}
                      size={15}
                    />
                  )}
                  <Text style={HomeScreenComponentStyles.tabLabel2}>
                    {categoryName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color="#f54b02" />
        ) : (
          <FlatList
            data={products}
            keyExtractor={item => item.productId}
            numColumns={2}
            contentContainerStyle={HomeScreenComponentStyles.productList}
            renderItem={({ item }) => {
              const imageUrl =
                item.mediaUrls.length > 1
                  ? item.mediaUrls[imageIndexes[item.productId] || 0]
                  : item.mediaUrls[0];

              const isFavorite = favoriteProducts.some(
                p => p.productId === item.productId,
              );
              const inCart = cartProductIds.includes(item.productId);

              return (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('ProductDetails', { product: item })
                  }
                  style={HomeScreenComponentStyles.productCard}
                >
                  <View style={HomeScreenComponentStyles.productImageDiv}>
                    <Animated.View
                      style={{ opacity: fadeAnims[item.productId] }}
                    >
                      <Image
                        source={{ uri: imageUrl }}
                        style={HomeScreenComponentStyles.productImage}
                        resizeMode="cover"
                      />
                    </Animated.View>
                    <View style={HomeScreenComponentStyles.productPriceDiv}>
                      <MaterialIcons name="diamond" size={18} color="#eee" />
                      <Text style={HomeScreenComponentStyles.productPrice}>
                        {item.priceInPoints}
                      </Text>
                    </View>
                  </View>
                  {/* Favorite Button */}
                  <TouchableOpacity
                    onPress={() => toggleFavorite(item.productId ?? '')}
                    style={[
                      homeStyles.iconItem,
                      HomeScreenComponentStyles.activityIcons3,
                      HomeScreenComponentStyles.activityIcons2,
                      HomeScreenComponentStyles.favoriteIcon,
                    ]}
                  >
                    <MaterialIcons
                      name={isFavorite ? 'favorite' : 'favorite-border'}
                      size={19}
                      color={pressed ? '#f54b02' : '#f54b02'}
                    />
                  </TouchableOpacity>
                  {/* Title */}
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={HomeScreenComponentStyles.productTitle}
                  >
                    {item.title}
                  </Text>
                  {/* Add to Cart Button */}
                  <TouchableOpacity
                    style={[
                      HomeScreenComponentStyles.Add2CartBtn,
                      inCart
                        ? { backgroundColor: '#fff' }
                        : { backgroundColor: '#f54b02' },
                    ]}
                    onPress={() => handleAddToCart(item)}
                  >
                    <Text
                      style={[
                        HomeScreenComponentStyles.Add2CartBtnText,
                        inCart ? { color: '#f54b02' } : { color: '#eee' },
                      ]}
                    >
                      {inCart ? 'In Cart' : 'Add to Cart'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text>No products found.</Text>}
          />
        )}

        <View style={HomeScreenComponentStyles.pagination}>
          <TouchableOpacity onPress={() => setPage(p => Math.max(p - 1, 0))}>
            <MaterialIcons
              name="navigate-before"
              size={28}
              color="#000"
              style={HomeScreenComponentStyles.paginationText}
            />
          </TouchableOpacity>
          <Text style={HomeScreenComponentStyles.paginationMainText}>
            {' '}
            {page + 1}
          </Text>
          <TouchableOpacity onPress={() => setPage(p => p + 1)}>
            <MaterialIcons
              name="navigate-next"
              size={28}
              color="#000"
              style={HomeScreenComponentStyles.paginationText}
            />
          </TouchableOpacity>
        </View>
      </View>
      <Toast config={toastConfig} />
      {/*Cart Modal */}
      <Modal transparent visible={showCart}>
        <View style={HomeScreenComponentStyles.overlay2}>
          <TouchableWithoutFeedback onPress={closePopup}>
            <View style={HomeScreenComponentStyles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={HomeScreenComponentStyles.popupBottom}>
            <View style={HomeScreenComponentStyles.topHeader3}>
              <Text style={HomeScreenComponentStyles.welcomeText2}>
                Cart Items ({cartProducts.length})
              </Text>
              <TouchableOpacity
                onPress={closePopup}
                style={[
                  homeStyles.iconItem,
                  HomeScreenComponentStyles.activityIcons,
                  HomeScreenComponentStyles.activityIcons2,
                  HomeScreenComponentStyles.cancelIcon,
                ]}
              >
                <Icon name="close-outline" size={28} color="#f54b02" />
              </TouchableOpacity>
            </View>

            <View style={HomeScreenComponentStyles.popupContent2}>
              {cartProducts.length > 0 && (
                <View style={HomeScreenComponentStyles.clearCartDiv}>
                  <TouchableOpacity
                    onPress={handleClearCart}
                    style={HomeScreenComponentStyles.clearCartBtn}
                  >
                    <Text style={HomeScreenComponentStyles.clearCartText}>
                      Clear Cart
                    </Text>
                    <Icon name="trash-outline" size={20} color="#eee" />
                  </TouchableOpacity>
                </View>
              )}

              <SwipeListView
                data={cartProducts}
                keyExtractor={item => item.productId}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                rightOpenValue={-45} // negative value for right swipe
                disableRightSwipe={true}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      dispatch(
                        addToCart({
                          ...item,
                          selectedQuantity: '1', // default as string
                        }),
                      );
                      navigation.navigate('ProductDetails', { product: item }); // navigate with product as param
                    }}
                  >
                    <View style={HomeScreenComponentStyles.cartItem}>
                      <View style={HomeScreenComponentStyles.cartItemLeftDiv}>
                        <View style={HomeScreenComponentStyles.imageDiv}>
                          <Image
                            source={{ uri: item.mediaUrls[0] }}
                            style={HomeScreenComponentStyles.productImage}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={HomeScreenComponentStyles.notImageDiv}>
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={HomeScreenComponentStyles.eventDescription2}
                          >
                            {item.title}
                          </Text>
                          <View
                            style={HomeScreenComponentStyles.productPriceDiv2}
                          >
                            <MaterialIcons
                              name="diamond"
                              size={18}
                              color="#000"
                            />
                            <Text
                              style={HomeScreenComponentStyles.productPrice2}
                            >
                              {item.priceInPoints}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                renderHiddenItem={({ item }) => (
                  <View style={HomeScreenComponentStyles.hiddenRow}>
                    <TouchableOpacity
                      onPress={() => deleteItem(item.productId)}
                    >
                      <Icon name="trash-outline" size={18} color="#eee" />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={NotificationPageStyles.notificationsDiv}>
                    <View style={NotificationPageStyles.emptyNotifications}>
                      <Icon
                        name="alert-circle-outline"
                        size={20}
                        color="#807f7fff"
                      />
                      <Text
                        style={NotificationPageStyles.emptyNotificationsText}
                      >
                        Cart is empty.
                      </Text>
                    </View>
                  </View>
                }
              />
            </View>
            <View style={HomeScreenComponentStyles.totalSection}>
              <View style={HomeScreenComponentStyles.totalSectionD1}>
                <Text style={HomeScreenComponentStyles.totalLabel}>Total:</Text>
                <View style={HomeScreenComponentStyles.totalPrice}>
                  <MaterialIcons
                    name="diamond"
                    size={22}
                    color="#000"
                    style={HomeScreenComponentStyles.totalPriceSign}
                  />
                  <Text style={HomeScreenComponentStyles.totalPriceValue}>
                    <Text style={HomeScreenComponentStyles.largeText}>
                      {Math.floor(totalPoints).toLocaleString()}
                    </Text>
                    <Text style={HomeScreenComponentStyles.smallText}>
                      .{(totalPoints % 1).toFixed(2).split('.')[1]}
                    </Text>
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  HomeScreenComponentStyles.checkoutBtn,
                  totalPoints > user.pointsBalance &&
                    HomeScreenComponentStyles.disabledButton,
                ]}
                disabled={totalPoints > user.pointsBalance}
                onPress={() => navigation.navigate('Checkout')}
              >
                <Text style={HomeScreenComponentStyles.checkoutText}>
                  {totalPoints > user.pointsBalance
                    ? 'Insufficient Points Balance'
                    : 'Checkout'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Favorites Modal */}
      <Modal transparent visible={showFavorites}>
        <View style={HomeScreenComponentStyles.overlay2}>
          <TouchableWithoutFeedback onPress={closePopup}>
            <View style={HomeScreenComponentStyles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={HomeScreenComponentStyles.popupBottom}>
            <View style={HomeScreenComponentStyles.topHeader3}>
              <Text style={HomeScreenComponentStyles.welcomeText2}>
                Favorites ({favoriteProducts.length})
              </Text>
              <TouchableOpacity
                onPress={closePopup}
                style={[
                  homeStyles.iconItem,
                  HomeScreenComponentStyles.activityIcons,
                  HomeScreenComponentStyles.activityIcons2,
                  HomeScreenComponentStyles.cancelIcon,
                ]}
              >
                <Icon name="close-outline" size={28} color="#f54b02" />
              </TouchableOpacity>
            </View>

            <View style={HomeScreenComponentStyles.popupContent2}>
              {favoriteProducts.length > 0 && (
                <View style={HomeScreenComponentStyles.clearCartDiv}>
                  <TouchableOpacity
                    onPress={handleClearFavorites}
                    style={HomeScreenComponentStyles.clearCartBtn}
                  >
                    <Text style={HomeScreenComponentStyles.clearCartText}>
                      Clear Favorites
                    </Text>
                    <Icon name="trash-outline" size={20} color="#eee" />
                  </TouchableOpacity>
                </View>
              )}
              <SwipeListView
                data={favoriteProducts}
                keyExtractor={item => item.productId}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                rightOpenValue={-45} // negative value for right swipe
                disableRightSwipe={true}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('ProductDetails', {
                        product: item,
                      })
                    }
                  >
                    <View style={HomeScreenComponentStyles.cartItem}>
                      <View style={HomeScreenComponentStyles.cartItemLeftDiv}>
                        <View style={HomeScreenComponentStyles.imageDiv}>
                          <Image
                            source={{ uri: item.mediaUrls[0] }}
                            style={HomeScreenComponentStyles.productImage}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={HomeScreenComponentStyles.notImageDiv}>
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={HomeScreenComponentStyles.eventDescription2}
                          >
                            {item.title}
                          </Text>
                          <View
                            style={HomeScreenComponentStyles.productPriceDiv2}
                          >
                            <MaterialIcons
                              name="diamond"
                              size={18}
                              color="#000"
                            />
                            <Text
                              style={HomeScreenComponentStyles.productPrice2}
                            >
                              {item.priceInPoints}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                renderHiddenItem={({ item }) => (
                  <View style={HomeScreenComponentStyles.hiddenRow}>
                    <TouchableOpacity
                      onPress={() => removeFavorite(item.productId)}
                    >
                      <Icon name="trash-outline" size={18} color="#eee" />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={NotificationPageStyles.notificationsDiv}>
                    <View style={NotificationPageStyles.emptyNotifications}>
                      <Icon
                        name="alert-circle-outline"
                        size={20}
                        color="#807f7fff"
                      />
                      <Text
                        style={NotificationPageStyles.emptyNotificationsText}
                      >
                        No favorites found.
                      </Text>
                    </View>
                  </View>
                }
              />
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

