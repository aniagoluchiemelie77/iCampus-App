import React, {
  useState,
  useEffect,
  createContext,
  ReactNode,
  useContext,
  useRef,
} from 'react';
import PagerView from 'react-native-pager-view';
import { useDispatch } from 'react-redux';
import { clearUser } from '../context/UserSlice';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { io, Socket } from 'socket.io-client';
import { Home } from '../components/HomeScreenComponents';
import { StoreScreen } from '../components/Storescreen';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../hooks/hooks';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { AppDataProvider } from '../context/EventContext';
import Toast from 'react-native-toast-message';
import { playNotificationSound } from '../services/notificationSound';
import { getMessaging, onMessage } from '@react-native-firebase/messaging';
import { baseUrl } from '../components/HomeScreenComponents';
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
export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}
interface SocketProviderProps {
  children: ReactNode;
  userUid: string;
}
export const SocketContext = createContext<SocketContextType | null>(null);
export const SocketProvider = ({ children, userUid }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(`${baseUrl}`, {
      transports: ['websocket'],
      query: { userId: userUid },
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_room', userUid);
      console.log('Socket connected for user:', userUid);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, [userUid]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
const TabBarItem = React.memo(
  ({
    label,
    icon,
    active,
    onPress,
  }: {
    label: string;
    icon: string;
    active: boolean;
    onPress: () => void;
  }) => {
    const { colors } = useTheme();
    return (
      <TouchableOpacity onPress={onPress} style={styles.iconItem}>
        <MaterialIcons
          name={active ? icon : `${icon}`}
          size={active ? 24 : 22}
          color={active ? colors.primary : colors.textDarker}
        />
        {active && <Text style={styles.activeIconLabel}>{label}</Text>}
      </TouchableOpacity>
    );
  },
);
const HomeScreen = () => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user) || {};
  const pagerRef = useRef<PagerView>(null);
  const route = useRoute<RouteProp<RootStackParamList, 'Home'>>();
  const [activeIcon, setActiveIcon] = useState<string>('home');
  const userType = user?.usertype;
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp>();
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;
  const rawRole = user?.usertype || 'student';
  const [ongoingLecture, setOngoingLecture] = useState<Lecture | null>(null);
  const screens = ['home', 'classroom', 'search', 'store', 'ranking'];
  const handlePageSelected = (e: any) => {
    const index = e.nativeEvent.position;
    setActiveIcon(screens[index]);
  };
  const messagingInstance = getMessaging();
  const isTokenExpired = (createdAt: number) => {
    const now = Date.now();
    return now - createdAt > 1000 * 60 * 60 * 24;
  };
  const isClassroomAllowed =
    userType === 'student' ||
    userType === 'lecturer' ||
    userType === 'otherUser';

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
            <Home />
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
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <TabBarItem
            label="Home"
            icon="home"
            active={activeIcon === 'home'}
            onPress={() => setActiveIcon('home')}
          />
          {isClassroomAllowed && (
            <TabBarItem
              label="Courses"
              icon="groups"
              active={activeIcon === 'classroom'}
              onPress={() => setActiveIcon('classroom')}
            />
          )}
          <TabBarItem
            label="Search"
            icon="search"
            active={activeIcon === 'search'}
            onPress={() => setActiveIcon('search')}
          />
          <TabBarItem
            label="Store"
            icon="shopping-cart"
            active={activeIcon === 'store'}
            onPress={() => setActiveIcon('store')}
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
    paddingHorizontal: 15,
  },
  centerContent: {
    flex: 1,
    paddingBottom: 90,
  },
  iconBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    height: 40,
    backgroundColor: 'rgba(250, 220, 204, 0.85)',
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderRadius: 25,
    borderWidth: 1,
    zIndex: 90,
    width: '100%',
  },
  iconItem: {
    alignItems: 'center',
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
