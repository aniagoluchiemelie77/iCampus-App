import React, {
  useState,
  useEffect,
  createContext,
  ReactNode,
  useContext,
  useMemo,
} from 'react';
import { useDispatch } from 'react-redux';
import { clearUser } from '../context/UserSlice';
import { View, TouchableOpacity, Text } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { io, Socket } from 'socket.io-client';
import { Home } from '../components/HomeScreenComponents';
import { StoreScreen } from '../components/Storescreen';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../hooks/hooks';
import { homeStyles } from '../assets/styles/colors';
import { AppDataProvider } from '../context/EventContext';
import Toast from 'react-native-toast-message';
import { playNotificationSound } from '../services/notificationSound';
import messaging from '@react-native-firebase/messaging';
import { baseUrl } from '../components/HomeScreenComponents';
import { OngoingLectureModal } from '../components/OngoingLiveLecturesModal';
import { Lecture } from '../types/firebase';
import { RankingScreen } from '../components/RankingScreen';
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
      <TouchableOpacity onPress={onPress} style={homeStyles.iconItem}>
        <MaterialIcons
          name={active ? icon : `${icon}-outlined`}
          size={active ? 24 : 23}
          color={active ? colors.primary : colors.textDarker}
        />
        {active && <Text style={homeStyles.activeIconLabel}>{label}</Text>}
      </TouchableOpacity>
    );
  },
);
const HomeScreen = () => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user);
  const route = useRoute<RouteProp<RootStackParamList, 'Home'>>();
  const [activeIcon, setActiveIcon] = useState<string>('home');
  const userType = user?.usertype;
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp>();
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;
  const rawRole = user?.usertype || 'student';
  const [ongoingLecture, setOngoingLecture] = useState<Lecture | null>(null);
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
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      playNotificationSound();
      console.log('A new FCM message arrived!', remoteMessage);
    });

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
            getCourseDetailsForOngoingLecture(ongoingLecture.courseId),
            getAllExceptionsForOngoingLecture(ongoingLecture.id),
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
  const renderContent = useMemo(() => {
    switch (activeIcon) {
      case 'home':
        return <Home />;
      case 'classroom':
        return (
          <ClassroomScreenComponent
            userRole={rawRole as 'student' | 'lecturer' | 'otherUser'}
          />
        );
      case 'search':
        return <SearchScreen />;
      case 'store':
        return <StoreScreen />;
      case 'ranking':
        return <RankingScreen />;
      default:
        return <Home />;
    }
  }, [activeIcon, rawRole]);
  return (
    <AppDataProvider user={user}>
      <View
        style={[homeStyles.container, { backgroundColor: colors.background }]}
      >
        <View style={homeStyles.centerContent}>{renderContent}</View>

        <View
          style={[
            homeStyles.iconBar,
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
          <TabBarItem
            label="Ranking"
            icon="emoji-events"
            active={activeIcon === 'ranking'}
            onPress={() => setActiveIcon('ranking')}
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

export default HomeScreen;
