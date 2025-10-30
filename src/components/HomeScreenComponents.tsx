import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
  TouchableOpacity,
  Image,
  TextInput,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
//import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/Ionicons';
import { homeStyles } from '../assets/styles/colors'; // Adjust path as needed
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDataContext } from './EventContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from './hooks';
import { SwipeListView } from 'react-native-swipe-list-view';
import type {
  ProductCategoryList,
  CalendarEvent,
  Product,
} from '../types/firebase';
import { HomeScreenComponentStyles } from '../assets/styles/colors';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import toastConfig from './ToastConfig';
import { useSelector } from 'react-redux';
import { RootState } from '../components/store';
import { useDispatch } from 'react-redux';
import {
  addToCart,
  removeFromCart,
  incrementQuantity,
  decrementQuantity,
  selectCartProductIds,
} from '../components/CartProductsSlice';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;
type NavigationPropProductDetails = StackNavigationProp<
  RootStackParamList,
  'ProductDetails'
>;
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const CalenderPopup = () => {
  const { events, errorMessage, fetchEvents } = useAppDataContext();
  const navigation = useNavigation<NavigationProp>();
  const [visible, setVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const [showBackToToday, setShowBackToToday] = useState(false);
  const [cardHeights, setCardHeights] = useState<number[]>([]);

  const openPopup = () => {
    setVisible(true);
    fetchEvents();
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };
  const closePopup = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();

    // Add ordinal suffix
    const getOrdinal = (n: number) => {
      if (n > 3 && n < 21) return 'th';
      switch (n % 10) {
        case 1:
          return 'st';
        case 2:
          return 'nd';
        case 3:
          return 'rd';
        default:
          return 'th';
      }
    };

    const dayWithSuffix = `${day}${getOrdinal(day)}`;

    const formatted = new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);

    return `${dayWithSuffix} ${formatted}`;
  };
  const isToday = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();

    return (
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear()
    );
  };
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    setShowBackToToday(yOffset > 50); // Show button after scrolling 100px
  };
  const getTodayIndex = () => {
    const today = new Date();
    return sortedEvents.findIndex(event => {
      const eventDate = new Date(event.startDate);
      return (
        eventDate.getDate() === today.getDate() &&
        eventDate.getMonth() === today.getMonth() &&
        eventDate.getFullYear() === today.getFullYear()
      );
    });
  };
  const scrollToToday = () => {
    const index = getTodayIndex();
    if (index !== -1 && scrollRef.current) {
      const yOffset = cardHeights
        .slice(0, index)
        .reduce((sum, h) => sum + h, 0);
      scrollRef.current.scrollTo({ y: yOffset, animated: true });
    }
  };

  const brightColors = [
    '#6abd0cff',
    '#d11755ff',
    '#0496a9ff',
    '#c4440dff',
    '#b54607ff',
  ];
  const titleColorMap: { [title: string]: string } = {};
  const getColorForTitle = (title: string) => {
    if (!titleColorMap[title]) {
      const index = Object.keys(titleColorMap).length % brightColors.length;
      titleColorMap[title] = brightColors[index];
    }
    return titleColorMap[title];
  };
  const today = new Date();
  const sortedEvents = [...events]
    .filter(event => new Date(event.startDate) > today)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

  return (
    <View style={HomeScreenComponentStyles.container}>
      <TouchableOpacity
        style={[
          homeStyles.iconItem,
          HomeScreenComponentStyles.activityIcons,
          HomeScreenComponentStyles.activityIcons2,
        ]}
        onPress={openPopup}
      >
        <Icon name="calendar-number-outline" size={30} color="#f54b02" />
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade">
        {errorMessage && (
          <Text style={{ color: 'gray', textAlign: 'center' }}>
            {errorMessage}
          </Text>
        )}
        <View style={HomeScreenComponentStyles.overlay}>
          <TouchableWithoutFeedback onPress={closePopup}>
            <View style={HomeScreenComponentStyles.backdrop} />
          </TouchableWithoutFeedback>

          {/* Modal content stays interactive and scrollable */}
          <View style={HomeScreenComponentStyles.popup}>
            <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
              <View style={HomeScreenComponentStyles.topHeader2}>
                <Text style={HomeScreenComponentStyles.welcomeText2}>
                  Events
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
            </Animated.View>

            <View style={HomeScreenComponentStyles.eventsContainer}>
              <ScrollView
                ref={scrollRef}
                onScroll={handleScroll} // ✅ This uses the function
                scrollEventThrottle={16}
                contentContainerStyle={HomeScreenComponentStyles.eventsDiv}
              >
                {sortedEvents.map((event, index) => (
                  <View
                    key={event._id}
                    onLayout={e => {
                      const { height } = e.nativeEvent.layout;
                      setCardHeights(prev => {
                        const updated = [...prev];
                        updated[index] = height;
                        return updated;
                      });
                    }}
                    style={HomeScreenComponentStyles.eventCard}
                  >
                    <View style={HomeScreenComponentStyles.eventVisibilityDiv2}>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={[
                          HomeScreenComponentStyles.eventTitle,
                          { backgroundColor: getColorForTitle(event.title) },
                        ]}
                      >
                        {event.title}
                      </Text>
                      {isToday(event.startDate) && (
                        <Icon name="hourglass" size={18} color="#f54b02" />
                      )}
                    </View>
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={HomeScreenComponentStyles.eventDescription2}
                    >
                      {event.description}
                    </Text>
                    <View style={HomeScreenComponentStyles.eventLocationDiv}>
                      <Icon name="location-outline" size={18} color="#f54b02" />
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={HomeScreenComponentStyles.eventLocation}
                      >
                        {event.location}
                      </Text>
                    </View>
                    <View style={HomeScreenComponentStyles.eventCardFooter}>
                      <Text style={HomeScreenComponentStyles.eventDate}>
                        {new Date(event.startDate).toLocaleDateString() ===
                        new Date(event.endDate).toLocaleDateString()
                          ? formatDate(event.startDate)
                          : `${formatDate(event.startDate)} - ${formatDate(
                              event.endDate,
                            )}`}
                      </Text>
                      <View
                        style={HomeScreenComponentStyles.eventVisibilityDiv}
                      >
                        <Icon
                          name="bookmarks-outline"
                          size={18}
                          color="#f54b02"
                        />
                        <Text
                          style={HomeScreenComponentStyles.eventVisibilityText}
                        >
                          {event.visibility.charAt(0).toUpperCase() +
                            event.visibility.slice(1)}
                        </Text>
                      </View>
                      {event.eventType === 'Lectures' &&
                        event.lectureType === 'online' && (
                          <Text style={HomeScreenComponentStyles.lectureType}>
                            Online
                          </Text>
                        )}
                    </View>
                  </View>
                ))}
              </ScrollView>
              {showBackToToday && (
                <TouchableOpacity
                  onPress={scrollToToday}
                  style={[
                    HomeScreenComponentStyles.backToTodayButton,
                    homeStyles.iconItem,
                    HomeScreenComponentStyles.activityIcons,
                    HomeScreenComponentStyles.activityIcons2,
                  ]}
                >
                  <Icon name="arrow-up-outline" size={18} color="#f54b02" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('Calender')}
              style={[
                homeStyles.iconItem,
                HomeScreenComponentStyles.activityIcons,
                HomeScreenComponentStyles.activityIcons2,
                HomeScreenComponentStyles.CaddIcon,
              ]}
            >
              <Icon name="add-outline" size={32} color="#f54b02" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
const SettingsPopup = () => {
  const [visible, setVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const openPopup = () => {
    setVisible(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };
  const closePopup = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  return (
    <View style={HomeScreenComponentStyles.container}>
      <TouchableOpacity
        style={[
          homeStyles.iconItem,
          HomeScreenComponentStyles.activityIcons,
          HomeScreenComponentStyles.activityIcons2,
        ]}
        onPress={openPopup}
      >
        <Icon name="settings-outline" size={28} color="#f54b02" />
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade">
        <TouchableWithoutFeedback onPress={closePopup}>
          <View style={HomeScreenComponentStyles.overlayRight}>
            <Animated.View
              style={[
                HomeScreenComponentStyles.popupRight,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <View style={HomeScreenComponentStyles.topHeader2}>
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
                <Text style={HomeScreenComponentStyles.welcomeText2}>
                  Settings
                </Text>
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};
//Home screen
export function Home() {
  const user = useAppSelector(state => state.user);
  const unreadCount = useSelector(
    (state: RootState) => state.notifications.unreadCount,
  );
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const [showActivities, setShowActivities] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const fetchEvents = useCallback(async () => {
    const uid = user.uid ?? '';
    const department = user.department ?? '';
    const level = user.current_level ?? '';
    const url = `http://192.168.1.98:5000/user/events?userId=${uid}&department=${department}&level=${level}`;
    console.log('Fetching events from:', url);
    try {
      const response = await fetch(url);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, [user.uid, user.department, user.current_level]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [fetchEvents]);

  //Fetch Events
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    // Run once on mount
    fetchEvents();
    // Set up hourly interval
    intervalId = setInterval(() => {
      fetchEvents();
    }, REFRESH_INTERVAL_MS);
    // Cleanup on unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchEvents]);
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();

    // Add ordinal suffix
    const getOrdinal = (n: number) => {
      if (n > 3 && n < 21) return 'th';
      switch (n % 10) {
        case 1:
          return 'st';
        case 2:
          return 'nd';
        case 3:
          return 'rd';
        default:
          return 'th';
      }
    };
    const dayWithSuffix = `${day}${getOrdinal(day)}`;
    const formatted = new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
    return `${dayWithSuffix} ${formatted}`;
  };
  const isToday = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();

    return (
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear()
    );
  };
  const today = new Date();
  const sortedEvents = [...events]
    .filter(event => new Date(event.startDate) > today)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
  const latestEvents = sortedEvents.slice(0, 7);

  return (
    <LinearGradient
      style={HomeScreenComponentStyles.bckg}
      colors={['#eee', '#edccbdff']}
    >
      <View style={HomeScreenComponentStyles.topHeader}>
        <CalenderPopup />
        <View style={HomeScreenComponentStyles.iconSubdiv}>
          <TouchableOpacity
            style={[
              homeStyles.iconItem,
              HomeScreenComponentStyles.activityIcons,
              HomeScreenComponentStyles.activityIcons2,
            ]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Icon name="notifications-outline" size={28} color="#f54b02" />
            {unreadCount > 0 && (
              <View style={HomeScreenComponentStyles.badge}>
                <Text style={HomeScreenComponentStyles.badgeText}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <SettingsPopup />
        </View>
      </View>
      <View style={HomeScreenComponentStyles.welcomeHeader}>
        <TouchableOpacity
          style={[homeStyles.iconItem, HomeScreenComponentStyles.activityIcons]}
          onPress={() => navigation.navigate('Profile')}
        >
          {user?.profilePic ? (
            <Image
              source={{ uri: user.profilePic }}
              style={HomeScreenComponentStyles.avatar}
            />
          ) : (
            <Icon name="person-circle-outline" size={35} color="#000" />
          )}
        </TouchableOpacity>
        <Text style={HomeScreenComponentStyles.welcomeText}>
          {getGreeting()}, {user.firstname}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={HomeScreenComponentStyles.activityDivContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={HomeScreenComponentStyles.activityDiv}>
          <View style={HomeScreenComponentStyles.activityDivHeader}>
            <Text style={HomeScreenComponentStyles.activityDivHeaderText}>
              Activities
            </Text>
            <TouchableOpacity
              style={[
                homeStyles.iconItem,
                HomeScreenComponentStyles.activityIcons,
              ]}
              onPress={() => setShowActivities(prev => !prev)}
            >
              <Icon
                name={
                  showActivities ? 'chevron-up-outline' : 'chevron-down-outline'
                }
                size={30}
                color="#000"
              />
            </TouchableOpacity>
          </View>
          {showActivities && (
            <View style={HomeScreenComponentStyles.activityIconsDiv}>
              <TouchableOpacity
                style={[
                  homeStyles.iconItem,
                  HomeScreenComponentStyles.activityIcons,
                ]}
              >
                <Icon name="people-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>Communities</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  homeStyles.iconItem,
                  HomeScreenComponentStyles.activityIcons,
                ]}
              >
                <Icon name="bar-chart-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>Create Poll</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  homeStyles.iconItem,
                  HomeScreenComponentStyles.activityIcons,
                ]}
              >
                <Icon name="bulb-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>Smart Help</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  homeStyles.iconItem,
                  HomeScreenComponentStyles.activityIcons,
                ]}
              >
                <Icon name="calculator-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>Get GPA</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  homeStyles.iconItem,
                  HomeScreenComponentStyles.activityIcons,
                ]}
              >
                <Icon name="book-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>Browse Materials</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  homeStyles.iconItem,
                  HomeScreenComponentStyles.activityIcons,
                ]}
              >
                <Icon name="receipt-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>Spend Wise</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  homeStyles.iconItem,
                  HomeScreenComponentStyles.activityIcons,
                ]}
              >
                <Icon name="wallet-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>My Wallet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Calender')}
                style={[
                  homeStyles.iconItem,
                  HomeScreenComponentStyles.activityIcons,
                ]}
              >
                <Icon
                  name="calendar-number-outline"
                  size={30}
                  color="#f54b02"
                />
                <Text style={homeStyles.iconLabel}>Go Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  homeStyles.iconItem,
                  HomeScreenComponentStyles.activityIcons,
                ]}
              >
                <Icon name="library-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>eLibrary</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={HomeScreenComponentStyles.eventsContainer2}>
          {latestEvents.map(event => (
            <View
              key={event._id}
              style={[
                HomeScreenComponentStyles.eventCardOuterWidth,
                isToday(event.startDate) &&
                  HomeScreenComponentStyles.todayBorderHighlight,
              ]}
            >
              <View style={HomeScreenComponentStyles.eventVisibilityDiv2}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={HomeScreenComponentStyles.eventDescription}
                >
                  {event.description}
                </Text>
                {isToday(event.startDate) && (
                  <View style={HomeScreenComponentStyles.todayIndicator}>
                    <Text style={HomeScreenComponentStyles.todayIndicatorText}>
                      Today
                    </Text>
                  </View>
                )}
              </View>
              <View style={HomeScreenComponentStyles.eventVisibilityDiv2}>
                <View style={HomeScreenComponentStyles.eventMetaRow}>
                  <Icon name="location-outline" size={16} color="#f54b02" />
                  <Text style={HomeScreenComponentStyles.eventMetaText}>
                    {event.location}
                  </Text>
                </View>
                <View style={HomeScreenComponentStyles.eventMetaRow}>
                  <Icon name="bookmarks-outline" size={16} color="#f54b02" />
                  <Text style={HomeScreenComponentStyles.eventMetaText}>
                    {(event.visibility ?? 'unspecified')
                      .charAt(0)
                      .toUpperCase() +
                      (event.visibility ?? 'unspecified').slice(1)}
                  </Text>
                </View>
                {event.eventType === 'Lectures' &&
                  event.lectureType === 'online' && (
                    <Text style={HomeScreenComponentStyles.lectureType}>
                      Online
                    </Text>
                  )}
              </View>
              <Text style={HomeScreenComponentStyles.eventDate2}>
                {new Date(event.startDate).toLocaleDateString() ===
                new Date(event.endDate).toLocaleDateString()
                  ? formatDate(event.startDate)
                  : `${formatDate(event.startDate)} - ${formatDate(
                      event.endDate,
                    )}`}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

// ClassroomScreen.js
export function ClassroomScreen() {
  return <Text>Welcome to Classroom</Text>;
}

// StoreScreen.js
export function StoreScreen() {
  const user = useAppSelector(state => state.user);
  const { fetchFavorites, fetchCartItems, toggleFavorite, favoriteProducts } =
    useAppDataContext();
  const navigation = useNavigation<NavigationPropProductDetails>();
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
  const [quantities, setQuantities] = useState<{ [productId: string]: number }>(
    {},
  );
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
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowCart(false);
      setShowFavorites(false);
    });
  };
  const handleAddToCart = async (product: Product) => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const res = await fetch('http://192.168.1.98:5000/store/cart', {
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
          text1: 'Product successfully added to cart',
          position: 'bottom',
          bottomOffset: 10,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to add to cart',
          position: 'bottom',
          bottomOffset: 10,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to add to cart',
        position: 'bottom',
        bottomOffset: 10,
      });
    }
  };
  const increment = async (productId: string) => {
    const token = await AsyncStorage.getItem('authToken');
    await fetch(`http://192.168.1.98:5000/store/cart/increment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId }),
    });

    setQuantities(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
    dispatch(incrementQuantity({ productId }));
  };

  const decrement = async (productId: string) => {
    const currentQty = quantities[productId] || 1;
    if (currentQty <= 1) return; // ✅ prevent decrement below 1

    const token = await AsyncStorage.getItem('authToken');
    await fetch(`http://192.168.1.98:5000/store/cart/decrement`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId }),
    });

    setQuantities(prev => ({
      ...prev,
      [productId]: currentQty - 1,
    }));
    dispatch(decrementQuantity({ productId }));
    fetchCartItems();
  };

  const deleteItem = async (productId: string) => {
    console.log('Removing Product');
    const token = await AsyncStorage.getItem('authToken');
    try {
      const res = await fetch(`http://192.168.1.98:5000/store/cart/remove`, {
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
          text1: "Error, couldn't delete cart item. Please retry.",
          position: 'bottom',
          bottomOffset: 10,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: "Error, couldn't delete cart item. Please retry.",
        position: 'bottom',
        bottomOffset: 10,
      });
    }
  };
  const removeFavorite = async (productId: string) => {
    console.log('Removing Favorite');
    const token = await AsyncStorage.getItem('authToken');
    try {
      await fetch(`http://192.168.1.98:5000/store/favorites/remove`, {
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
        text1: "Error, couldn't remove item from favorites, please retry.",
        position: 'bottom',
        bottomOffset: 10,
      });
    }
  };
  const totalPoints = useSelector((state: RootState) =>
    state.cart.items.reduce(
      (sum, item) => sum + item.priceInPoints * item.quantity,
      0,
    ),
  );
  const cartProducts = useSelector((state: RootState) => state.cart.items);
  const cartQuantities = useSelector((state: RootState) =>
    state.cart.items.reduce((acc, item) => {
      acc[item.productId] = item.quantity;
      return acc;
    }, {} as Record<string, number>),
  );

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
          `http://192.168.1.98:5000/store/search?${params.toString()}`,
        );
        const data = await response.json();
        console.log('Query Results:', data.products);
        setProducts(data.products);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: "Error, couldn't fetch cart items.",
          position: 'bottom',
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

    fetch(
      `http://192.168.1.98:5000/store/categories?schoolName=${encodedSchool}`,
    )
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error('Error fetching categories:', err));
  }, [user?.schoolName]);

  // Fetch products
  useEffect(() => {
    if (!user?.schoolName) return;
    setLoading(true);

    const encodedSchool = encodeURIComponent(user.schoolName);
    const categoryParam =
      selectedCategory === 'all'
        ? ''
        : `&category=${encodeURIComponent(selectedCategory)}`;
    const offset = page * limit;

    fetch(
      `http://192.168.1.98:5000/store/products?schoolName=${encodedSchool}${categoryParam}&limit=${limit}&offset=${offset}`,
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
  }, [selectedCategory, page, user?.schoolName]);

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

  useEffect(() => {
    if (!Array.isArray(cartProducts)) return;

    const initialQuantities: { [productId: string]: number } = {};
    cartProducts.forEach(item => {
      initialQuantities[item.productId] = 1;
    });
    setQuantities(initialQuantities);
  }, [cartProducts]);

  const cartProductIds = useSelector(selectCartProductIds);

  return (
    <LinearGradient
      style={HomeScreenComponentStyles.bckg}
      colors={['#eee', '#edccbdff']}
    >
      <View style={HomeScreenComponentStyles.searchContainer}>
        <Text style={HomeScreenComponentStyles.storeHeaderText}>
          Shop with iCampus
        </Text>
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
              const categoryName =
                typeof cat === 'string' ? cat : cat.categoryName;
              const categoryId =
                typeof cat === 'string'
                  ? cat.toLowerCase()
                  : String(cat.categoryName).trim().toLowerCase();
              const isActive = selectedCategory === categoryId;

              return (
                <TouchableOpacity
                  key={categoryId}
                  style={[
                    HomeScreenComponentStyles.tabItem,
                    isActive && HomeScreenComponentStyles.activeTab,
                  ]}
                  onPress={() => {
                    setSelectedCategory(categoryId);
                    setPage(0);
                  }}
                >
                  <Text style={HomeScreenComponentStyles.tabLabel}>
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
      <Modal transparent animationType="fade" visible={showCart}>
        <View style={HomeScreenComponentStyles.overlay2}>
          <TouchableWithoutFeedback onPress={closePopup}>
            <View style={HomeScreenComponentStyles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={HomeScreenComponentStyles.popupBottom}>
            <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
              <View style={HomeScreenComponentStyles.topHeader2}>
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
            </Animated.View>

            <View style={HomeScreenComponentStyles.popupContent2}>
              <SwipeListView
                data={cartProducts}
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

                      <View style={HomeScreenComponentStyles.cartItemRightDiv}>
                        <View
                          style={
                            HomeScreenComponentStyles.cartItemRightDivSubdiv
                          }
                        >
                          <View
                            style={
                              HomeScreenComponentStyles.cartItemRightDivSubdiv2
                            }
                          >
                            <TouchableOpacity
                              onPress={() => increment(item.productId)}
                            >
                              <MaterialIcons
                                name="add"
                                size={18}
                                color="#f54b02"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => decrement(item.productId)}
                            >
                              <MaterialIcons
                                name="remove"
                                size={18}
                                color="#f54b02"
                              />
                            </TouchableOpacity>
                          </View>
                          <Text
                            style={
                              HomeScreenComponentStyles.cartItemRightDivText
                            }
                          >
                            Qty: {cartQuantities[item.productId] || 1}
                          </Text>
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
                  <View
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 17, color: '#888' }}>
                      Cart is empty
                    </Text>
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
                    size={24}
                    color="#000"
                    style={HomeScreenComponentStyles.totalPriceSign}
                  />
                  <Text style={HomeScreenComponentStyles.totalPriceValue}>
                    {totalPoints}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  HomeScreenComponentStyles.checkoutBtn,
                  totalPoints > user.pointsBalance && {
                    backgroundColor: '#fb966bff',
                  },
                ]}
                disabled={totalPoints > user.pointsBalance}
                //onPress={handleCheckout}
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
      <Modal transparent animationType="fade" visible={showFavorites}>
        <View style={HomeScreenComponentStyles.overlay2}>
          <TouchableWithoutFeedback onPress={closePopup}>
            <View style={HomeScreenComponentStyles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={HomeScreenComponentStyles.popupBottom}>
            <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
              <View style={HomeScreenComponentStyles.topHeader2}>
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
            </Animated.View>

            <View style={HomeScreenComponentStyles.popupContent2}>
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
                  <View
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 17, color: '#888' }}>
                      No product marked as Favorite.
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

// ProfileScreen.js
export function ProfileScreen() {
  const user = useAppSelector(state => state.user);
  return (
    <ScrollView contentContainerStyle={HomeScreenComponentStyles.bckg}>
      <View style={HomeScreenComponentStyles.profileImgDiv}>
        <Image
          source={{ uri: user.profilePic }}
          style={HomeScreenComponentStyles.avatarProfile}
        />
        <View>
          <Text style={HomeScreenComponentStyles.profileImgDivText}>
            {user.firstname} {user.lastname}
          </Text>
        </View>
      </View>
      <Text>Welcome to Profile</Text>
    </ScrollView>
  );
}
