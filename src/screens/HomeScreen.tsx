import React, {
  useState,
  useEffect,
  createContext,
  ReactNode,
  useContext,
} from 'react';
import { useDispatch } from 'react-redux';
import { clearUser } from '@components/UserSlice';
import { View, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { io, Socket } from 'socket.io-client';
import {
  ClassroomScreen,
  StoreScreen,
  RankingScreen,
  Home,
} from '../components/HomeScreenComponents';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../components/hooks';
import { homeStyles } from '../assets/styles/colors';
import { AppDataProvider } from '../components/EventContext';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { playNotificationSound } from '../services/notificationSound';
import messaging from '@react-native-firebase/messaging';
import { baseUrl } from '../components/HomeScreenComponents';
import { OngoingLectureModal } from '../components/OngoingLiveLecturesModal';
import { Lecture } from 'types/firebase';

type NavigationProp = StackNavigationProp<RootStackParamList>;
export interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}
interface SocketProviderProps {
  children: ReactNode;
  userUid: string;
}

// 2. Provide the default value (null as a fallback)
export const SocketContext = createContext<SocketContextType | null>(null);
export const SocketProvider = ({ children, userUid }: SocketProviderProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Replace with your actual backend URL
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

    // Cleanup on unmount
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
const HomeScreen = () => {
  const user = useAppSelector(state => state.user);
  const userType = user?.usertype;
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp>();
  const socketContext = useContext(SocketContext);
  const socket = socketContext?.socket;

  const [activeIcon, setActiveIcon] = useState<string>('home');
  const [ongoingLecture, setOngoingLecture] = useState<Lecture | null>(null);
  const isTokenExpired = (createdAt: number) => {
    const now = Date.now();
    return now - createdAt > 1000 * 60 * 60 * 24; // 24 hours
  };
  // Helper to check if user is allowed in the classroom
  const isClassroomAllowed =
    userType === 'student' ||
    userType === 'lecturer' ||
    userType === 'otherUser';

  // ... (keep your useEffect for token expiry)
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
        const res = await fetch(`${baseUrl}users/lectures/ongoing/${user.uid}`);
        const data = await res.json();
        if (data.ongoing) {
          setOngoingLecture(data.lecture);
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
    if (ongoingLecture.lectureType !== 'Physical') {
      navigation.navigate('LiveClassSessions', {
        lectureId: ongoingLecture.id,
        courseId: ongoingLecture.courseId,
      });
      setOngoingLecture(null);
      return;
    }
    try {
      if (userType === 'lecturer') {
        const [courseRes, exceptionsRes] = await Promise.all([
          fetch(`${baseUrl}users/courses/${ongoingLecture.courseId}`),
          fetch(`${baseUrl}users/exceptions/lectures/${ongoingLecture.id}`),
        ]);
        const courseData = await courseRes.json();
        const exceptionsData = await exceptionsRes.json();

        navigation.navigate('PhysicalAttendanceManager', {
          lecture: ongoingLecture,
          course: courseData,
          exceptions: exceptionsData,
        });
      } else if (userType === 'student') {
        navigation.navigate('StudentAttendanceScanner', {
          lecture: ongoingLecture,
          onSuccess: () => navigation.navigate('Home'),
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
  };
  return (
    <AppDataProvider user={user}>
      <View style={homeStyles.container}>
        <View style={homeStyles.centerContent}>
          {activeIcon === 'home' && <Home />}

          {isClassroomAllowed && activeIcon === 'classroom' && (
            <ClassroomScreen />
          )}

          {activeIcon === 'store' && <StoreScreen />}
          {activeIcon === 'ranking' && <RankingScreen />}
        </View>

        <View style={homeStyles.iconBar}>
          {/* Home Tab */}
          <TouchableOpacity
            onPress={() => setActiveIcon('home')}
            style={[
              homeStyles.iconItem,
              activeIcon === 'home' && homeStyles.activeIconItem,
            ]}
          >
            <Icon
              name={activeIcon === 'home' ? 'home' : 'home-outline'}
              size={26}
              color={activeIcon === 'home' ? '#fb966b' : '#032820'}
            />
            {activeIcon === 'home' && (
              <Text style={homeStyles.activeIconLabel}>Home</Text>
            )}
          </TouchableOpacity>

          {/* 2. UI Exclusion: Only render the Tab button if user is NOT enterprise */}
          {isClassroomAllowed && (
            <TouchableOpacity
              onPress={() => setActiveIcon('classroom')}
              style={[
                homeStyles.iconItem,
                activeIcon === 'classroom' && homeStyles.activeIconItem,
              ]}
            >
              <Icon
                name={activeIcon === 'classroom' ? 'easel' : 'easel-outline'}
                size={26}
                color={activeIcon === 'classroom' ? '#fb966b' : '#032820'}
              />
              {activeIcon === 'classroom' && (
                <Text style={homeStyles.activeIconLabel}>Courses</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Store and Ranking tabs remain visible for everyone */}
          <TouchableOpacity
            onPress={() => setActiveIcon('store')}
            style={[
              homeStyles.iconItem,
              activeIcon === 'store' && homeStyles.activeIconItem,
            ]}
          >
            <Icon
              name={activeIcon === 'store' ? 'cart' : 'cart-outline'}
              size={26}
              color={activeIcon === 'store' ? '#fb966b' : '#032820'}
            />
            {activeIcon === 'store' && (
              <Text style={homeStyles.activeIconLabel}>Store</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveIcon('ranking')}
            style={[
              homeStyles.iconItem,
              activeIcon === 'ranking' && homeStyles.activeIconItem,
            ]}
          >
            <Icon
              name={activeIcon === 'ranking' ? 'trophy' : 'trophy-outline'}
              size={26}
              color={activeIcon === 'ranking' ? '#fb966b' : '#032820'}
            />
            {activeIcon === 'ranking' && (
              <Text style={homeStyles.activeIconLabel}>Ranking</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <Toast config={toastConfig} />
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
