import React, { useState, useEffect, ReactNode, useRef } from 'react';
import PagerView from 'react-native-pager-view';
import { useDispatch } from 'react-redux';
import { clearUser } from '../context/UserSlice';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { FeedTab } from '../components/HomeScreenComponents';
import { StoreScreen } from '../components/Storescreen';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../hooks/hooks';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { AppDataProvider } from '../context/EventContext';
import Toast from 'react-native-toast-message';
import { playNotificationSound } from '../services/notificationSound';
import {
  getMessaging,
  onMessage,
  requestPermission,
} from '@react-native-firebase/messaging';
import {
  useSocketConnection,
  SocketContext,
  useSocket,
} from '../hooks/useSocket.ts';
import { initialState } from '../context/UserSlice.ts';
import { OngoingLectureModal } from '../components/OngoingLiveLecturesModal';
import { Lecture } from '../types/firebase';
import { SearchScreen } from '../components/SearchScreen';
import ClassroomScreenComponent from '../components/Classroomcomponent';
import {
  fetchOngoingLecture,
  getCourseDetailsForOngoingLecture,
  getAllExceptionsForOngoingLecture,
} from '../api/localGetApis';
import { useTheme } from '../context/ThemeContext';

type NavigationProp = StackNavigationProp<RootStackParamList>;
interface SocketProviderProps {
  children: ReactNode;
  baseUrl: string;
  userUid?: string | null;
}

export const SocketProvider = ({
  children,
  baseUrl,
  userUid,
}: SocketProviderProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useSocketConnection({ baseUrl, userId: userUid });
  const socket = socketRef.current;

  useEffect(() => {
    const currentSocket = socketRef.current;
    if (!currentSocket) {
      setIsConnected(false);
      return;
    }

    const handleConnect = () => {
      setIsConnected(true);
      currentSocket.emit('join_room', String(userUid));
      console.log('Socket connected for user:', userUid);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    currentSocket.on('connect', handleConnect);
    currentSocket.on('disconnect', handleDisconnect);
    if (currentSocket.connected) {
      setIsConnected(true);
    }

    return () => {
      currentSocket.off('connect', handleConnect);
      currentSocket.off('disconnect', handleDisconnect);
    };
  }, [socketRef, userUid]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
const TabBarItem = React.memo(
  ({
    icon,
    active,
    onPress,
  }: {
    icon: string;
    active: boolean;
    onPress: () => void;
  }) => {
    const { colors } = useTheme();
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.iconItem,
          active && { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={29}
          color={active ? colors.primary : colors.textDarker}
        />
      </TouchableOpacity>
    );
  },
);
const HomeScreen = () => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user) || initialState;
  const pagerRef = useRef<PagerView>(null);
  const route = useRoute<RouteProp<RootStackParamList, 'Home'>>();
  const [activeIcon, setActiveIcon] = useState<string>('home');
  const userType = user?.usertype;
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp>();
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const rawRole = user?.usertype || 'student';
  const [ongoingLecture, setOngoingLecture] = useState<Lecture | null>(null);
  const isClassroomAllowed = userType === 'student' || userType === 'lecturer';
  const screens = isClassroomAllowed
    ? ['home', 'classroom', 'search', 'store']
    : ['home', 'search', 'store'];
  const handlePageSelected = (e: any) => {
    const index = e.nativeEvent.position;
    setActiveIcon(screens[index]);
  };
  const handleTabPress = (screenName: string) => {
    setActiveIcon(screenName);
    const index = screens.indexOf(screenName);
    if (index !== -1) {
      pagerRef.current?.setPage(index);
    }
  };
  const messagingInstance = getMessaging();
  const isTokenExpired = (createdAt: number) => {
    const now = Date.now();
    return now - createdAt > 1000 * 60 * 60 * 24;
  };

  useEffect(() => {
    if (user?.tokenCreatedAt) {
      const createdAtTime = new Date(user.tokenCreatedAt).getTime();

      if (isTokenExpired(createdAtTime)) {
        dispatch(clearUser());
        navigation.navigate('Login');
      }
    }
  }, [dispatch, navigation, user?.tokenCreatedAt]);
  useEffect(() => {
    if (route.params?.activeTab) {
      setActiveIcon(route.params.activeTab);
    }
  }, [route.params?.activeTab]);
  useEffect(() => {
    const unsubscribe = onMessage(
      messagingInstance,
      async (remoteMessage: any) => {
        playNotificationSound();
        console.log('A new FCM message arrived!', remoteMessage);
      },
    );

    return unsubscribe;
  }, []);
  useEffect(() => {
    const requestUserPermission = async () => {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        }
      } else if (Platform.OS === 'ios') {
        const messagingInstance = getMessaging();
        const authStatus = await requestPermission(messagingInstance);
        const enabled = authStatus === 1 || authStatus === 2;
        if (enabled) {
          console.log('iOS Authorization status granted:', authStatus);
        }
      }
    };

    requestUserPermission();
  }, []);
  useEffect(() => {
    if (!socket || !user?.uid) return;

    const handleLectureStarted = (lecture: Lecture) => {
      setOngoingLecture(lecture);
    };

    socket.on('lecture_started', handleLectureStarted);

    const checkOngoing = async () => {
      try {
        const data = await fetchOngoingLecture();
        if (data.success && data.ongoing) {
          setOngoingLecture(data.lecture);
        } else {
          setOngoingLecture(null);
        }
      } catch (err) {
        console.error('iCampus: Failed to check ongoing status', err);
      }
    };
    checkOngoing();
    return () => {
      socket.off('lecture_started', handleLectureStarted);
    };
  }, [socket, user?.uid]);

  const handleJoinLecture = async () => {
    if (!ongoingLecture) return;
    if (ongoingLecture.lectureType === 'Online') {
      navigation.navigate('LiveClassSessions', {
        lectureId: ongoingLecture.id,
        courseId: ongoingLecture.courseId,
      });
      setOngoingLecture(null);
      return;
    } else if (ongoingLecture.lectureType === 'Physical') {
      try {
        if (userType === 'lecturer') {
          const [courseResult, exceptionsResult] = await Promise.all([
            getCourseDetailsForOngoingLecture({
              courseId: ongoingLecture.courseId,
            }),
            getAllExceptionsForOngoingLecture({ lectureId: ongoingLecture.id }),
          ]);
          if (courseResult.success && exceptionsResult.success) {
            navigation.navigate('PhysicalAttendanceManager', {
              lecture: ongoingLecture,
              course: courseResult.data!,
              exceptions: exceptionsResult.data!,
            });
          } else {
            const courseError = courseResult.error
              ? `Course Err: ${courseResult.error}`
              : '';
            const exceptionsError = exceptionsResult.error
              ? `Exceptions Err: ${exceptionsResult.error}`
              : '';
            console.error(
              `Data fetch failed. ${courseError} ${exceptionsError}`,
            );
            Toast.show({
              type: 'error',
              text1: 'Fetch Error',
              text2: `Data fetch failed. ${courseError} ${exceptionsError}`,
            });
          }
        } else if (userType === 'student') {
          navigation.navigate('StudentAttendanceScanner', {
            lecture: ongoingLecture,
            onSuccess: () => navigation.navigate('Home', { activeTab: 'home' }),
          });
        }
        setOngoingLecture(null);
      } catch (err) {
        console.error('Failed to fetch attendance requirements', err);
        Toast.show({
          type: 'error',
          text1: 'Connection Error',
          text2: 'Could not load lecture details.',
        });
      }
    }
  };
  return (
    <AppDataProvider user={user}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PagerView
          style={styles.centerContent}
          initialPage={0}
          ref={pagerRef}
          onPageSelected={handlePageSelected}
        >
          <View key="0">
            <FeedTab />
          </View>
          <View key="1">
            <ClassroomScreenComponent
              userRole={rawRole as 'student' | 'lecturer'}
            />
          </View>
          <View key="2">
            <SearchScreen />
          </View>
          <View key="3">
            <StoreScreen />
          </View>
        </PagerView>

        <View
          style={[
            styles.iconBar,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
        >
          <TabBarItem
            icon="home"
            active={activeIcon === 'home'}
            onPress={() => handleTabPress('home')}
          />
          {isClassroomAllowed && (
            <TabBarItem
              icon="groups"
              active={activeIcon === 'classroom'}
              onPress={() => handleTabPress('classroom')}
            />
          )}
          <TabBarItem
            icon="search"
            active={activeIcon === 'search'}
            onPress={() => handleTabPress('search')}
          />
          <TabBarItem
            icon="shopping-cart"
            active={activeIcon === 'store'}
            onPress={() => handleTabPress('store')}
          />
        </View>
      </View>
      <OngoingLectureModal
        visible={!!ongoingLecture}
        lecture={ongoingLecture}
        onJoin={handleJoinLecture}
        onDismiss={() => setOngoingLecture(null)}
      />
    </AppDataProvider>
  );
};
const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    paddingHorizontal: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: -15,
    marginBottom: 15,
  },
  postsDiv: {
    position: 'relative',
  },
  headerContainerDiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerProfilePic: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  fab: {
    position: 'absolute',
    bottom: 75,
    right: 20,
    backgroundColor: PRIMARY_COLOR,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },
  fabLower: {
    position: 'static',
    bottom: 20,
    right: 20,
    backgroundColor: PRIMARY_COLOR,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },
  container: {
    flex: 1,
    position: 'relative',
    width: '100%',
  },
  centerContent: {
    flex: 1,
    paddingBottom: 90,
  },
  iconBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    position: 'absolute',
    bottom: 8,
    left: 18,
    right: 18,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderRadius: 25,
    borderWidth: 1,
    zIndex: 90,
    padding: 2,
  },
  iconItem: {
    alignItems: 'center',
    flex: 1,
    borderRadius: 25,
  },
  activeIconLabel: {
    fontWeight: 'bold',
    fontSize: 11,
    color: PRIMARY_COLOR,
    marginTop: 4,
  },
  header: {
    marginTop: 5,
    fontSize: 35,
    fontWeight: 700,
    color: '#222',
  },
  newPostsBanner: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 100,
    elevation: 5,
  },
  newPostsText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
export default HomeScreen;
