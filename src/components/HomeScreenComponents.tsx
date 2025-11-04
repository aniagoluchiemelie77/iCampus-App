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
  StyleSheet,
} from 'react-native';
//import { BlurView } from '@react-native-community/blur';
import Swiper from 'react-native-swiper';
import * as ImagePicker from 'expo-image-picker';
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
import {
  HomeScreenComponentStyles,
  NotificationPageStyles,
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
  incrementQuantity,
  decrementQuantity,
  selectCartProductIds,
  selectCartItems,
  clearCart,
  selectTotalPoints,
  selectCartQuantities,
} from '../components/CartProductsSlice';
import { selectUnreadCount } from '../components/NotificationSplice';
import { updateUserImage } from '../components/UserSlice';

import { CLOUDINARY_APICLOUDNAME } from '@env';

export const uploadImageToCloudinary = async (
  imageUri: string,
): Promise<string | null> => {
  const data = new FormData();
  data.append('file', {
    uri: imageUri,
    name: 'profile.jpg',
    type: 'image/jpeg',
  });
  data.append('upload_preset', 'profileImgs');

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_APICLOUDNAME}/image/upload`,
      {
        method: 'POST',
        body: data,
      },
    );

    const result = await res.json();
    return result.secure_url;
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    return null;
  }
};

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
      duration: 50,
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

      <Modal transparent visible={visible}>
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
            <View style={HomeScreenComponentStyles.topHeader2}>
              <Text style={HomeScreenComponentStyles.welcomeText2}>Events</Text>
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
      duration: 50,
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
  const unreadCount = useSelector(selectUnreadCount);
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
          {Array.isArray(user.profilePic) && user.profilePic.length > 0 && (
            <Image source={{ uri: user.profilePic[0] }} style={styles.image} />
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
      duration: 50,
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
  const handleClearCart = async () => {
    console.log('Clear cart btn clicked');
    try {
      const token = await AsyncStorage.getItem('authToken');

      const res = await fetch('http://192.168.1.98:5000/store/cart', {
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
          text1: 'Cart cleared successfully',
          position: 'bottom',
          bottomOffset: 10,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to clear cart',
          position: 'bottom',
          bottomOffset: 10,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to clear cart',
        position: 'bottom',
        bottomOffset: 10,
      });
    }
  };
  const handleClearFavorites = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const res = await fetch('http://192.168.1.98:5000/store/favorites', {
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
          text1: 'Favorites cleared successfully',
          position: 'bottom',
          bottomOffset: 10,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to clear favorites',
          position: 'bottom',
          bottomOffset: 10,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to clear favorites',
        position: 'bottom',
        bottomOffset: 10,
      });
    }
  };

  const increment = async (
    productId: string,
    selectedSize?: string,
    selectedColor?: string,
  ) => {
    const product = cartProducts.find(
      p =>
        p.productId === productId &&
        p.selectedSize === selectedSize &&
        p.selectedColor === selectedColor,
    );

    const stock = product?.stock || 0;
    const currentQty = product?.quantity || 1;

    if (currentQty >= stock) {
      Toast.show({
        type: 'info',
        text1: 'Maximum stock reached',
        position: 'bottom',
        bottomOffset: 5,
      });
      return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(
        `http://192.168.1.98:5000/store/cart/increment`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId, selectedSize, selectedColor }),
        },
      );

      if (!response.ok) {
        console.error('Failed to increment on server');
        return;
      }

      // Optional: parse updated item from server
      // const updatedItem = await response.json();

      // Update local state if needed
      dispatch(incrementQuantity({ productId, selectedSize, selectedColor }));
      setQuantities(prev => ({
        ...prev,
        [productId]: (prev[productId] ?? 1) + 1,
      }));

      console.log('Incrementing Completed');
    } catch (error) {
      console.error('Increment error:', error);
    }
  };

  const decrement = async (productId: string) => {
    const currentQty = quantities[productId] ?? 1;
    if (currentQty <= 1) return;

    try {
      console.log('Decrementing Product');
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(
        `http://192.168.1.98:5000/store/cart/decrement`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId }),
        },
      );

      if (!response.ok) {
        console.error('Failed to decrement on server');
        return;
      }

      // Update local quantity
      setQuantities(prev => ({
        ...prev,
        [productId]: currentQty - 1,
      }));

      dispatch(decrementQuantity({ productId }));
      console.log('Decrementing Completed');

      // Optional: refresh cart from server
      fetchCartItems();
    } catch (error) {
      console.error('Decrement error:', error);
    }
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
  const totalPoints = useSelector(selectTotalPoints);
  const cartProducts = useSelector(selectCartItems);
  const cartQuantities = useSelector(selectCartQuantities);

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

  useEffect(() => {
    console.log('Cart items:', cartProducts);
    console.log('Cart quantities:', cartQuantities);
    console.log('Calculating total points...', totalPoints);
  }, [cartProducts, cartQuantities, totalPoints]);
  const cartProductIds = useSelector(selectCartProductIds);
  console.log(totalPoints);

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

// ProfileScreen.js
export function ProfileScreen() {
  const user = useAppSelector(state => state.user);
  const dispatch = useDispatch();
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPoints, setShowPoints] = useState(false);

  const handleImageUpdate = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      // @ts-ignore
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newImage = result.assets[0].uri;

      const imageUrl = await uploadImageToCloudinary(newImage);

      if (imageUrl) {
        console.log('Uploaded to Cloudinary:', imageUrl);
        setSelectedImage(imageUrl); // ✅ Store Cloudinary URL, not local URI
        setShowModal(true);
      }
    }
  };

  const confirmUpload = async () => {
    if (!selectedImage) return;

    try {
      setUploading(true);
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(
        'http://192.168.1.98:5000/users/upload-profile-image',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imageUrl: selectedImage }), // ✅ Send Cloudinary URL
        },
      );

      const result = await response.json();
      if (response.ok && result.imageUrl) {
        dispatch(updateUserImage(result.imageUrl));
      } else {
        Toast.show({
          type: 'error',
          text1: result.message,
          position: 'bottom',
          bottomOffset: 10,
        });
      }
    } catch (err) {
      if (err instanceof Error) {
        Toast.show({
          type: 'error',
          text1: err.message,
          position: 'bottom',
          bottomOffset: 10,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'An unexpected error occurred',
          position: 'bottom',
          bottomOffset: 10,
        });
      }
    } finally {
      setUploading(false);
      setShowModal(false);
      setSelectedImage(null);
    }
  };

  return (
    <LinearGradient style={styles.container} colors={['#eee', '#edccbdff']}>
      <ScrollView>
        {Array.isArray(user.profilePic) && user.profilePic.length > 0 && (
          <View style={styles.imageDiv}>
            <Swiper style={styles.swiper} showsButtons loop={false}>
              {[...user.profilePic].reverse().map((imgUri: string, index) => (
                <Image
                  key={index}
                  source={{ uri: imgUri }}
                  style={styles.image}
                />
              ))}
            </Swiper>
            <TouchableOpacity style={styles.button} onPress={handleImageUpdate}>
              <Text style={styles.buttonText}>
                {uploading ? (
                  <MaterialIcons
                    name="add-a-photo-outlined"
                    size={20}
                    color="#fff"
                  />
                ) : (
                  'Update Profile Image'
                )}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.nameBox}>
          <Text style={styles.name}>
            {user.firstname} {user.lastname}
          </Text>
        </View>
        <View style={styles.nameBox}>
          <View style={styles.rowBox}>
            <MaterialIcons name="email-outlined" size={14} color="#f54b02" />
            <Text style={styles.textRight}>{user.email}</Text>
          </View>
          <View style={styles.rowBox}>
            <MaterialIcons name="call-outlined" size={14} color="#f54b02" />
            <Text style={styles.textRight}>{user.phone_number}</Text>
          </View>
        </View>
        <View style={styles.nameBox2}>
          <View style={styles.rowBox2}>
            <MaterialIcons name="school-outlined" size={14} color="#f54b02" />
            <Text style={styles.textRight}>{user.schoolName}</Text>
          </View>
          <View style={styles.rowBox2}>
            <MaterialIcons name="school-outlined" size={14} color="#f54b02" />
            <Text style={styles.textRight}>{user.department}</Text>
          </View>
          <View style={styles.rowBox2}>
            <MaterialIcons
              name="bookmarks-outlined"
              size={14}
              color="#f54b02"
            />
            <Text style={styles.textRight}>{user.matricNumber}</Text>
          </View>
          <View style={styles.rowBox2}>
            {Array.from({
              length: Math.min(
                parseInt(user.current_level ?? '100', 10) / 100,
                5,
              ),
            }).map((_, index) => (
              <MaterialIcons
                key={index}
                name="star-rate-outlined"
                size={14}
                color="#f54b02"
                style={styles.iconMargin}
              />
            ))}
          </View>
        </View>
        <TouchableOpacity style={styles.nameBox3}>
          <View style={styles.rowBox2a}>
            <View style={styles.rowBox3}>
              <View style={styles.row}>
                <Icon name="diamond" size={19} color="#f54b02" />
                <Text style={styles.name}>
                  {showPoints ? user.pointsBalance : '••••'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPoints(prev => !prev)}
                style={styles.iconMargin}
              >
                <MaterialIcons
                  name={showPoints ? 'visibility' : 'visibility-off'}
                  size={14}
                  color="#000"
                />
              </TouchableOpacity>
            </View>
            <MaterialIcons
              name="chevron-right-outlined"
              size={14}
              color="#838282ff"
            />
          </View>

          <View style={styles.rowBox2}>
            <TouchableOpacity style={styles.equalDiv}>
              <MaterialIcons
                name="shopping-cart-outlined"
                size={14}
                color="#f54b02"
              />
              <Text style={styles.textColored}>Buy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.equalDiv}>
              <MaterialIcons
                name="account-balance-outlined"
                size={14}
                color="#f54b02"
              />
              <Text style={styles.textColored}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.equalDiv}>
              <MaterialIcons name="send-outlined" size={14} color="#f54b02" />
              <Text style={styles.textColored}>Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.equalDiv}>
              <MaterialIcons
                name="send-and-archive-outlined"
                size={14}
                color="#f54b02"
              />
              <Text style={styles.textColored}>Recieve</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        <View>
          <Text style={styles.text}>{user.coursesEnrolled}</Text>
        </View>
      </ScrollView>
      <Modal visible={showModal} transparent animationType="slide">
        <View style={HomeScreenComponentStyles.overlayCenter}>
          <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
            <View style={HomeScreenComponentStyles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={HomeScreenComponentStyles.popupCenter}>
            <View style={HomeScreenComponentStyles.topHeader2}>
              <Text style={HomeScreenComponentStyles.welcomeText2}>
                Confirm Profile Photo
              </Text>
            </View>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.modalImage}
              />
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmUpload}
              >
                <Text style={styles.buttonText}>
                  {uploading ? 'Uploading...' : 'Confirm'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Toast config={toastConfig} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  name: {
    fontSize: 21,
    fontWeight: '700',
  },
  text: {
    fontSize: 14,
    color: '#000',
  },
  textColored: {
    paddingTop: 3,
    fontSize: 14,
    color: '#f54b02',
  },
  textRight: {
    fontSize: 14,
    color: '#000',
    marginLeft: 4,
  },
  swiper: {
    height: '100%',
    width: '100%',
  },
  imageDiv: {
    height: 300,
    width: '100%',
    position: 'relative',
    marginBottom: 5,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#f54b02',
    position: 'absolute',
    bottom: -15,
    right: 0,
    padding: 10,
    borderRadius: 10,
    zIndex: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalImage: {
    width: 300,
    height: 300,
    borderRadius: 10,
    marginBottom: 7,
    alignSelf: 'center',
    resizeMode: 'cover',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmButton: {
    backgroundColor: '#f54b02',
    padding: 10,
    borderRadius: 10,
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f54b02',
    padding: 10,
    borderRadius: 10,
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginVertical: 5,
    padding: 10,
    backgroundColor: '#fff',
    width: '95%',
    borderRadius: 10,
  },
  nameBox2: {
    alignItems: 'flex-start',
    marginVertical: 5,
    padding: 10,
    backgroundColor: '#fff',
    width: '95%',
    borderRadius: 10,
  },
  nameBox3: {
    alignItems: 'flex-start',
    marginVertical: 5,
    padding: 10,
    backgroundColor: '#fff',
    width: '95%',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#f54b02',
  },
  rowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '45%',
  },
  rowBox2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingBottom: 5,
  },
  rowBox2a: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingBottom: 5,
  },
  rowBox3: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '70%',
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  equalDiv: {
    width: '25%',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMargin: {
    marginLeft: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
