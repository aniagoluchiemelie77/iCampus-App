import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { homeStyles } from '../screens/HomeScreen'; // Adjust path as needed
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from './hooks';
import type { ProductCategory, CalendarEvent } from '../types/firebase';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const CalenderPopup = () => {
  const user = useAppSelector(state => state.user);
  const navigation = useNavigation<NavigationProp>();
  const [visible, setVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const fetchEvents = async () => {
    try {
      const response = await fetch(
        `http://192.168.1.98:5000/user/events?userId=${user.uid}`,
      );
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

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
    const aDate = new Date(a.startDate + 'T' + (a.eventStartTime || '00:00'));
    const bDate = new Date(b.startDate + 'T' + (b.eventStartTime || '00:00'));
    return aDate.getTime() - bDate.getTime();
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          homeStyles.iconItem,
          styles.activityIcons,
          styles.activityIcons2,
        ]}
        onPress={openPopup}
      >
        <Icon name="calendar-number-outline" size={30} color="#f54b02" />
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.overlay}>
          {/* Touchable area only covers the background */}
          <TouchableWithoutFeedback onPress={closePopup}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          {/* Modal content stays interactive and scrollable */}
          <View style={styles.popup}>
            <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.topHeader2}>
                <Text style={styles.welcomeText2}>Events</Text>
                <TouchableOpacity
                  onPress={closePopup}
                  style={[
                    homeStyles.iconItem,
                    styles.activityIcons,
                    styles.activityIcons2,
                    styles.cancelIcon,
                  ]}
                >
                  <Icon name="close-outline" size={28} color="#f54b02" />
                </TouchableOpacity>
              </View>
            </Animated.View>

            <View style={styles.eventsContainer}>
              <ScrollView contentContainerStyle={styles.eventsDiv}>
                {sortedEvents.map(event => (
                  <View key={event._id} style={styles.eventCard}>
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[
                        styles.eventTitle,
                        { backgroundColor: getColorForTitle(event.title) },
                      ]}
                    >
                      {event.title}
                    </Text>
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={styles.eventDescription}
                    >
                      {event.description}
                    </Text>
                    <View style={styles.eventLocationDiv}>
                      <Icon name="location-outline" size={18} color="#f54b02" />
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={styles.eventLocation}
                      >
                        {event.location}
                      </Text>
                    </View>
                    <View style={styles.eventCardFooter}>
                      <Text style={styles.eventDate}>
                        {new Date(event.startDate).toLocaleDateString() ===
                        new Date(event.endDate).toLocaleDateString()
                          ? formatDate(event.startDate)
                          : `${formatDate(event.startDate)} - ${formatDate(
                              event.endDate,
                            )}`}
                      </Text>
                      {event.eventType === 'Lectures' &&
                        event.lectureType === 'online' && (
                          <Text style={styles.lectureType}>Online</Text>
                        )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('Calender')}
              style={[
                homeStyles.iconItem,
                styles.activityIcons,
                styles.activityIcons2,
                styles.CaddIcon,
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
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          homeStyles.iconItem,
          styles.activityIcons,
          styles.activityIcons2,
        ]}
        onPress={openPopup}
      >
        <Icon name="settings-outline" size={28} color="#f54b02" />
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade">
        <TouchableWithoutFeedback onPress={closePopup}>
          <View style={styles.overlayRight}>
            <Animated.View
              style={[styles.popupRight, { transform: [{ scale: scaleAnim }] }]}
            >
              <View style={styles.topHeader2}>
                <TouchableOpacity
                  onPress={closePopup}
                  style={[
                    homeStyles.iconItem,
                    styles.activityIcons,
                    styles.activityIcons2,
                    styles.cancelIcon,
                  ]}
                >
                  <Icon name="close-outline" size={28} color="#f54b02" />
                </TouchableOpacity>
                <Text style={styles.welcomeText2}>Settings</Text>
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
  const navigation = useNavigation<NavigationProp>();
  const [showActivities, setShowActivities] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const fetchEvents = async () => {
    try {
      const response = await fetch(
        `http://192.168.1.98:5000/user/events?userId=${user.uid}`,
      );
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
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
  const sortedEvents = [...events].sort((a, b) => {
    const aDate = new Date(a.startDate + 'T' + (a.eventStartTime || '00:00'));
    const bDate = new Date(b.startDate + 'T' + (b.eventStartTime || '00:00'));
    return aDate.getTime() - bDate.getTime();
  });
  const latestEvents = [...sortedEvents].reverse().slice(0, 7);
  useEffect(() => {
    fetchEvents();
  });

  return (
    <View style={styles.bckg}>
      <View style={styles.topHeader}>
        <CalenderPopup />
        <View style={styles.iconSubdiv}>
          <TouchableOpacity
            style={[
              homeStyles.iconItem,
              styles.activityIcons,
              styles.activityIcons2,
            ]}
          >
            <Icon name="notifications-outline" size={28} color="#f54b02" />
          </TouchableOpacity>
          <SettingsPopup />
        </View>
      </View>
      <View style={styles.welcomeHeader}>
        <TouchableOpacity
          style={[homeStyles.iconItem, styles.activityIcons]}
          onPress={() => navigation.navigate('Profile')}
        >
          {user?.profilePic ? (
            <Image source={{ uri: user.profilePic }} style={styles.avatar} />
          ) : (
            <Icon name="person-circle-outline" size={35} color="#000" />
          )}
        </TouchableOpacity>
        <Text style={styles.welcomeText}>
          {getGreeting()}, {user.firstname}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.activityDivContainer}>
        <View style={styles.activityDiv}>
          <View style={styles.activityDivHeader}>
            <Text style={styles.activityDivHeaderText}>Activities</Text>
            <TouchableOpacity
              style={[homeStyles.iconItem, styles.activityIcons]}
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
            <View style={styles.activityIconsDiv}>
              <TouchableOpacity
                style={[homeStyles.iconItem, styles.activityIcons]}
              >
                <Icon name="people-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>Communities</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[homeStyles.iconItem, styles.activityIcons]}
              >
                <Icon name="bar-chart-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>Create Poll</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[homeStyles.iconItem, styles.activityIcons]}
              >
                <Icon name="bulb-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>Smart Help</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[homeStyles.iconItem, styles.activityIcons]}
              >
                <Icon name="calculator-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>Get GPA</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[homeStyles.iconItem, styles.activityIcons]}
              >
                <Icon name="book-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>Browse Materials</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[homeStyles.iconItem, styles.activityIcons]}
              >
                <Icon name="receipt-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>Spend Wise</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[homeStyles.iconItem, styles.activityIcons]}
              >
                <Icon name="wallet-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>My Wallet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Calender')}
                style={[homeStyles.iconItem, styles.activityIcons]}
              >
                <Icon
                  name="calendar-number-outline"
                  size={30}
                  color="#f54b02"
                />
                <Text style={homeStyles.iconLabel}>Go Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[homeStyles.iconItem, styles.activityIcons]}
              >
                <Icon name="library-outline" size={30} color="#f54b02" />
                <Text style={homeStyles.iconLabel}>Library</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {showActivities && (
          <>
            <View style={styles.eventsContainer2}>
              {latestEvents.map(event => (
                <View key={event._id} style={styles.eventCardOuterWidth}>
                  <View style={styles.eventCardInnerWidth}>
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={styles.eventDescription}
                    >
                      {event.description}
                    </Text>
                    <Text style={styles.eventDate}>
                      {new Date(event.startDate).toLocaleDateString() ===
                      new Date(event.endDate).toLocaleDateString()
                        ? formatDate(event.startDate)
                        : `${formatDate(event.startDate)} - ${formatDate(
                            event.endDate,
                          )}`}
                    </Text>
                    {event.eventType === 'Lectures' &&
                      event.lectureType === 'online' && (
                        <Text style={styles.lectureType}>Online Lecture</Text>
                      )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
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
    <View style={styles.bckg}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#838181ff"
        />
        <TouchableOpacity
          style={[
            homeStyles.iconItem,
            styles.activityIcons,
            styles.activityIcons2,
          ]}
        >
          <Icon name="notifications-outline" size={28} color="#f54b02" />
        </TouchableOpacity>
      </View>
      <View style={styles.activityDiv}>
        <View style={styles.activityDivHeader}>
          <Text style={styles.activityDivHeaderText}>Categories</Text>
        </View>
        <View style={styles.activityIconsDiv}>
          {categories.map(cat => (
            <>
              <TouchableOpacity
                style={[homeStyles.iconItem, styles.activityIcons]}
                key={cat._id}
              >
                <Icon name="people-outline" size={30} color="#000" />
                <Text style={homeStyles.iconLabel}>{cat.categoryName}</Text>
              </TouchableOpacity>
            </>
          ))}
        </View>
      </View>
      <View style={styles.activityDiv}>
        <View style={styles.activityDivHeader}>
          <Text style={styles.activityDivHeaderText}>Popular</Text>
        </View>
        <View style={styles.activityIconsDiv}>
          <TouchableOpacity style={[homeStyles.iconItem, styles.activityIcons]}>
            <Icon name="people-outline" size={30} color="#000" />
            <Text style={homeStyles.iconLabel}>Communities</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[homeStyles.iconItem, styles.activityIcons]}>
            <Icon name="list-outline" size={30} color="#000" />
            <Text style={homeStyles.iconLabel}>Create A Poll</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[homeStyles.iconItem, styles.activityIcons]}>
            <Icon name="chatbubble-ellipses-outline" size={30} color="#000" />
            <Text style={homeStyles.iconLabel}>Smart Help</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[homeStyles.iconItem, styles.activityIcons]}>
            <Icon name="calculator-outline" size={30} color="#000" />
            <Text style={homeStyles.iconLabel}>Get GPA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[homeStyles.iconItem, styles.activityIcons]}>
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
    <ScrollView contentContainerStyle={styles.bckg}>
      <View style={styles.profileImgDiv}>
        <Image source={{ uri: user.profilePic }} style={styles.avatarProfile} />
        <View>
          <Text style={styles.profileImgDivText}>
            {user.firstname} {user.lastname}
          </Text>
        </View>
      </View>
      <Text>Welcome to Profile</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bckg: {
    flex: 1,
    backgroundColor: '#eee',
    width: '100%',
    alignItems: 'center',
  },
  topHeader: {
    backgroundColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  topHeader2: {
    backgroundColor: 'inherit',
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  welcomeHeader: {
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  welcomeText: {
    marginLeft: 5,
    fontSize: 19,
    fontWeight: 800,
  },
  welcomeText2: {
    fontSize: 19,
    fontWeight: 800,
  },
  avatar: {
    height: 60,
    width: 60,
    borderRadius: 30,
    borderColor: '#f54b02', // Your preferred border color
    backgroundColor: '#fff',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  activityDiv: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    width: '90%',
    borderRadius: 15,
    margin: 7,
  },
  activityDivHeader: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1, // thickness of the border
    borderBottomColor: '#222',
  },
  activityDivHeaderText: {
    fontSize: 17,
    fontWeight: 800,
  },
  activityIconsDiv: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
    width: '100%',
    flexWrap: 'wrap',
  },
  iconSubdiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIcons: {
    padding: 10,
    margin: 4,
  },
  activityIcons2: {
    borderRadius: '50%',
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  searchInput: {
    padding: 10,
    backgroundColor: 'inherit',
    borderRadius: 15,
    paddingHorizontal: 12,
    borderWidth: 1,
    width: '82%',
    borderColor: '#838181ff',
    color: '#000',
  },
  container: {
    width: 'auto',
  },
  activityDivContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  searchIcon: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  iconText: {
    fontSize: 24,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // blurred effect
    justifyContent: 'flex-start',
  },
  overlayRight: {
    backgroundColor: 'rgba(0,0,0,0.6)', // blurred effect
    justifyContent: 'flex-end',
    position: 'relative',
    top: 0,
    right: 0,
  },
  popup: {
    top: 0,
    left: 0,
    width: '85%',
    minHeight: '100%',
    padding: 15,
    backgroundColor: '#eee',
    borderRadius: 12,
    elevation: 5,
    alignItems: 'center',
    position: 'relative',
  },
  popupRight: {
    top: 0,
    right: 0,
    width: '85%',
    minHeight: '100%',
    padding: 15,
    backgroundColor: '#eee',
    borderRadius: 12,
    elevation: 5,
    alignItems: 'center',
    position: 'absolute',
  },
  cancelIcon: {
    alignSelf: 'flex-end',
    width: 'auto',
  },
  CaddIcon: {
    bottom: 20,
    right: 15,
    position: 'absolute',
  },
  avatarProfile: {
    width: '100%', // spans full width of parent
    height: '100%', // adjust as needed
    resizeMode: 'contain',
  },
  profileImgDiv: {
    minWidth: '100%', // spans full width of parent
    height: 280,
    position: 'relative',
  },
  profileImgDivText: {
    bottom: 10, // spans full width of parent
    left: 10,
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    position: 'absolute', // adjust as neede
  },
  eventsContainer: {
    width: '100%',
    paddingVertical: 5,
    alignItems: 'flex-start',
  },
  eventCardOuterWidth: {
    width: '100%',
    backgroundColor: '#f54b02',
    height: 60,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCardInnerWidth: {
    width: '80%',
    backgroundColor: '#fff',
    height: '100%',
    alignItems: 'center',
    padding: 5,
    elevation: 2, // for Android shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventsContainer2: {
    width: '100%',
    paddingVertical: 5,
    alignItems: 'center',
  },
  eventsDiv: {
    justifyContent: 'center',
  },
  eventCard: {
    borderBottomWidth: 1,
    borderColor: '#a6a5a5ff',
    paddingVertical: 5,
    marginBottom: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  eventTitle: {
    color: '#fff',
    padding: 5,
    fontSize: 12,
    alignSelf: 'flex-start',
    borderRadius: 5,
    fontWeight: '600',
  },
  eventDate: {
    fontSize: 11,
    color: 'gray',
  },
  eventLocationDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    width: '100%',
  },
  eventLocation: {
    marginLeft: 2,
    alignSelf: 'flex-start',
  },
  eventDescription: {
    color: 'black',
    fontWeight: '700',
    paddingVertical: 4,
  },
  eventCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 3,
  },
  lectureType: {
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: '#f54b02',
    color: '#fff',
    padding: 3,
    borderRadius: 5,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
