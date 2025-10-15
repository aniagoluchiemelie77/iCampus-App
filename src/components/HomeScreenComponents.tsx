import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
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
import Icon from 'react-native-vector-icons/Ionicons';
import { homeStyles } from '../assets/styles/colors'; // Adjust path as needed
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { EventProvider } from './EventContext';
import { useAppSelector } from './hooks';
import type { ProductCategory, CalendarEvent } from '../types/firebase';
import { HomeScreenComponentStyles } from '../assets/styles/colors';
import { useEventContext } from './EventContext';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const CalenderPopup = () => {
  const { events, errorMessage, fetchEvents } = useEventContext();
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
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

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
          {/* Touchable area only covers the background */}
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
                      style={HomeScreenComponentStyles.eventDescription}
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
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });
  const latestEvents = sortedEvents.slice(0, 7);

  return (
    <EventProvider user={user}>
      <View style={HomeScreenComponentStyles.bckg}>
        <View style={HomeScreenComponentStyles.topHeader}>
          <CalenderPopup />
          <View style={HomeScreenComponentStyles.iconSubdiv}>
            <TouchableOpacity
              style={[
                homeStyles.iconItem,
                HomeScreenComponentStyles.activityIcons,
                HomeScreenComponentStyles.activityIcons2,
              ]}
            >
              <Icon name="notifications-outline" size={28} color="#f54b02" />
            </TouchableOpacity>
            <SettingsPopup />
          </View>
        </View>
        <View style={HomeScreenComponentStyles.welcomeHeader}>
          <TouchableOpacity
            style={[
              homeStyles.iconItem,
              HomeScreenComponentStyles.activityIcons,
            ]}
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
                    showActivities
                      ? 'chevron-up-outline'
                      : 'chevron-down-outline'
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
                  <Text style={homeStyles.iconLabel}>Library</Text>
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
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    style={HomeScreenComponentStyles.eventDescription}
                  >
                    {event.description}
                  </Text>
                  {isToday(event.startDate) && (
                    <View style={HomeScreenComponentStyles.todayIndicator}>
                      <Text
                        style={HomeScreenComponentStyles.todayIndicatorText}
                      >
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
      </View>
    </EventProvider>
  );
}

// ClassroomScreen.js
export function ClassroomScreen() {
  return <Text>Welcome to Classroom</Text>;
}

// StoreScreen.js
export function StoreScreen() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  useEffect(() => {
    fetch('http://192.168.1.98:5000/store/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error('Error fetching categories:', err));
  }, []);
  return (
    <View style={HomeScreenComponentStyles.bckg}>
      <View style={HomeScreenComponentStyles.searchContainer}>
        <TextInput
          style={HomeScreenComponentStyles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#838181ff"
        />
        <TouchableOpacity
          style={[
            homeStyles.iconItem,
            HomeScreenComponentStyles.activityIcons,
            HomeScreenComponentStyles.activityIcons2,
          ]}
        >
          <Icon name="notifications-outline" size={28} color="#f54b02" />
        </TouchableOpacity>
      </View>
      <View style={HomeScreenComponentStyles.activityDiv}>
        <View style={HomeScreenComponentStyles.activityDivHeader}>
          <Text style={HomeScreenComponentStyles.activityDivHeaderText}>
            Categories
          </Text>
        </View>
        <View style={HomeScreenComponentStyles.activityIconsDiv}>
          {categories.map(cat => (
            <>
              <TouchableOpacity
                style={[
                  homeStyles.iconItem,
                  HomeScreenComponentStyles.activityIcons,
                ]}
                key={cat._id}
              >
                <Icon name="people-outline" size={30} color="#000" />
                <Text style={homeStyles.iconLabel}>{cat.categoryName}</Text>
              </TouchableOpacity>
            </>
          ))}
        </View>
      </View>
      <View style={HomeScreenComponentStyles.activityDiv}>
        <View style={HomeScreenComponentStyles.activityDivHeader}>
          <Text style={HomeScreenComponentStyles.activityDivHeaderText}>
            Popular
          </Text>
        </View>
        <View style={HomeScreenComponentStyles.activityIconsDiv}>
          <TouchableOpacity
            style={[
              homeStyles.iconItem,
              HomeScreenComponentStyles.activityIcons,
            ]}
          >
            <Icon name="people-outline" size={30} color="#000" />
            <Text style={homeStyles.iconLabel}>Communities</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              homeStyles.iconItem,
              HomeScreenComponentStyles.activityIcons,
            ]}
          >
            <Icon name="list-outline" size={30} color="#000" />
            <Text style={homeStyles.iconLabel}>Create A Poll</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              homeStyles.iconItem,
              HomeScreenComponentStyles.activityIcons,
            ]}
          >
            <Icon name="chatbubble-ellipses-outline" size={30} color="#000" />
            <Text style={homeStyles.iconLabel}>Smart Help</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              homeStyles.iconItem,
              HomeScreenComponentStyles.activityIcons,
            ]}
          >
            <Icon name="calculator-outline" size={30} color="#000" />
            <Text style={homeStyles.iconLabel}>Get GPA</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              homeStyles.iconItem,
              HomeScreenComponentStyles.activityIcons,
            ]}
          >
            <Icon name="book-outline" size={30} color="#000" />
            <Text style={homeStyles.iconLabel}>Browse Materials</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

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
