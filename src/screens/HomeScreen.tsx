import React, { useState, useEffect, ReactNode, useRef } from 'react';
import PagerView from 'react-native-pager-view';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  useWindowDimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { FeedTab } from '../components/HomeScreenComponents';
import { StoreScreen } from '../components/Storescreen';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../hooks/hooks';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import Toast from 'react-native-toast-message';
import { playNotificationSound } from '../services/notificationSound';
import {
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
} from '@react-native-firebase/messaging';
import { navigateForNotification } from '../utils/notificationNavigation';
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
import { PageHeader } from '../components/PageHeader';
import {
  NotificationBell,
  ProfileModal,
} from '../components/HomeScreenComponents.tsx';
import { UserAvatar } from '../components/UserAvatar';
import { HeaderActionButton } from '../components/Storescreen.tsx';
import { useAppDataContext } from '../context/EventContext.tsx';
import { completeOrderDelivery } from '../api/localPostApis';
import { OrderScannerModal } from '../components/OrderQRScannerModal';
import ExpandableFAB from '../components/ExpandableFAB.tsx';

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
  // Held in state (not read from the ref during render) so consumers re-render
  // as soon as the socket exists, instead of seeing null until the next render.
  const [socket, setSocket] = useState<ReturnType<typeof useSocket>['socket']>(null);

  useEffect(() => {
    const currentSocket = socketRef.current;
    setSocket(currentSocket);
    if (!currentSocket) {
      setIsConnected(false);
      return;
    }

    // The server also joins the personal room from the handshake userId;
    // this re-join is a harmless safety net after reconnects.
    const handleConnect = () => {
      setIsConnected(true);
      currentSocket.emit('join_room', String(userUid));
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
  const [isProfilePopupVisible, setProfilePopupVisible] = useState(false);
  const pagerRef = useRef<PagerView>(null);
  const route = useRoute<RouteProp<RootStackParamList, 'Home'>>();
  const [activeIcon, setActiveIcon] = useState<string>('home');
  const userType = user?.usertype;
  const navigation = useNavigation<NavigationProp>();
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const rawRole = user?.usertype || 'student';
  const [ongoingLecture, setOngoingLecture] = useState<Lecture | null>(null);
  const isClassroomAllowed = userType === 'student' || userType === 'lecturer';
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isFabMenuVisible, setFabMenuVisible] = useState(false);
  const toggleFab = () => setFabMenuVisible(!isFabMenuVisible);
  const [_loading, setLoading] = useState(false);
  const { pendingOrders } = useAppDataContext();
  const filteredOrders = pendingOrders.filter(
    order => order.buyerId === user?.uid && order.status !== 'completed',
  );
  const screens = isClassroomAllowed
    ? ['home', 'classroom', 'search', 'store']
    : ['home', 'search', 'store'];
  const handlePageSelected = (e: any) => {
    setFabMenuVisible(false);
    const index = e.nativeEvent.position;
    setActiveIcon(screens[index]);
  };
  const getHeaderTitle = () => {
    switch (activeIcon) {
      case 'home':
        return 'iCampus';
      case 'classroom':
        return 'iCampus Classroom';
      case 'search':
        return 'iCampus Search';
      case 'store':
        return 'iCampus Store';
      default:
        return 'iCampus';
    }
  };
  const getHeaderRightElement = () => {
    switch (activeIcon) {
      case 'home':
        return (
          <NotificationBell initialCount={0} colors={colors} socket={socket} />
        );
      case 'store':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <HeaderActionButton
              icon="qr-code-scanner"
              onPress={() => setIsScannerOpen(true)}
              colors={colors}
            />
            <HeaderActionButton
              icon="inventory"
              count={filteredOrders?.length || 0}
              onPress={() => navigation.navigate('PendingOrdersScreen')}
              colors={colors}
            />
          </View>
        );
      default:
        return null;
    }
  };
  const getFabConfig = () => {
    switch (activeIcon) {
      case 'home':
        return {
          actions: [
            'Create Post',
            'Create Poll',
            'Post Job',
            'Create Event',
            'iAssistant',
          ],
          iconName: 'widgets',
          iconColor: colors.btnTextColor,
        };
      case 'classroom':
        return {
          actions: ['iAssistant', 'View Lectures'],
          iconName: 'widgets',
          iconColor: colors.btnTextColor,
        };
      case 'store':
        return {
          actions: ['Sales Hub', 'View Cart', 'View Favorites'],
          iconName: 'widgets',
          iconColor: colors.btnTextColor,
        };
      case 'search':
      default:
        return null;
    }
  };
  const fabConfig = getFabConfig();
  const handleTabPress = (screenName: string) => {
    setFabMenuVisible(false);
    setActiveIcon(screenName);
    const index = screens.indexOf(screenName);
    if (index !== -1) {
      pagerRef.current?.setPage(index);
    }
  };
  const handleCompleteOrder = async (orderId: string) => {
    setIsScannerOpen(false);
    setLoading(true);

    try {
      const response = await completeOrderDelivery(orderId);
      if (response.success) {
        Toast.show({
          type: 'success',
          text2:
            response.message ||
            'Transaction completed successfully, funds will be released immediately.',
        });
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'OrderVerificationSuccess',
              params: {
                orderId: response.orderId,
                amount: response.settlementAmount,
                role: response.role,
                productName: response.productName,
              },
            },
          ],
        });
      } else {
        Toast.show({
          type: 'error',
          text2: response.message || 'Order verification failed, please retry.',
        });
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Verification Error',
        text2: err.message || 'Order verification failed, please retry.',
      });
    } finally {
      setLoading(false);
    }
  };
  const isModalVisible = isLargeScreen ? true : isProfilePopupVisible;
  // No client-side "24h since login" logout here: it signed active users out
  // even with valid tokens. Expiry is handled by the token refresh in
  // fetchWithAuth, which logs out only when the server rejects the session.
  useEffect(() => {
    if (route.params?.activeTab) {
      setActiveIcon(route.params.activeTab);
    }
  }, [route.params?.activeTab]);
  useEffect(() => {
    const messagingInstance = getMessaging();
    const unsubscribe = onMessage(
      messagingInstance,
      async (remoteMessage: any) => {
        playNotificationSound();
        console.log('A new FCM message arrived in foreground!', remoteMessage);
        Toast.show({
          type: 'info',
          text1: remoteMessage.notification?.title || 'New Notification',
          text2: remoteMessage.notification?.body || '',
        });
      },
    );

    return unsubscribe;
  }, []);
  // Tapping a push (app in background, or launched from a quit state) should
  // land on the same screen as tapping it in the Notifications list.
  const handledInitialPushRef = useRef(false);
  useEffect(() => {
    const messagingInstance = getMessaging();
    const openFromPush = (remoteMessage: any) => {
      const data = remoteMessage?.data || {};
      if (!data.actionType) return;
      const { actionType, category, notificationId, entityId, entityType, ...payload } =
        data;
      navigateForNotification(
        navigation,
        {
          notificationId,
          actionType,
          category,
          payload,
          relatedEntity: { entityId, entityType },
          title: remoteMessage.notification?.title,
          message: remoteMessage.notification?.body,
        },
        { uid: user?.uid, usertype: user?.usertype },
      );
    };
    const unsubscribe = onNotificationOpenedApp(messagingInstance, openFromPush);
    if (!handledInitialPushRef.current) {
      handledInitialPushRef.current = true;
      getInitialNotification(messagingInstance)
        .then(message => message && openFromPush(message))
        .catch(() => {});
    }
    return unsubscribe;
  }, [navigation, user?.uid, user?.usertype]);
  useEffect(() => {
    const requestUserPermission = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Android notification permission granted.');
          } else {
            console.log('Android notification permission denied.');
          }
        } catch (err) {
          console.warn('Error requesting Android permission:', err);
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
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
          title={getHeaderTitle()}
          showBackButton={false}
          leftElement={
            <TouchableOpacity onPress={() => setProfilePopupVisible(true)}>
              <UserAvatar
                profilePic={user?.profilePic}
                firstName={user?.firstname}
                lastName={user?.lastname}
                organizationName={user?.organizationName}
                style={styles.headerProfilePic}
              />
            </TouchableOpacity>
          }
          rightElement={getHeaderRightElement()}
        />
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
        {fabConfig && !isFabMenuVisible && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setFabMenuVisible(true)}
          >
            <MaterialIcons
              name={fabConfig.iconName as any}
              size={34}
              color={fabConfig.iconColor}
            />
          </TouchableOpacity>
        )}

        {fabConfig && (
          <ExpandableFAB
            isVisible={isFabMenuVisible}
            onClose={toggleFab}
            userRole={
              (user?.usertype || 'student') as
                'student' | 'lecturer' | 'otherUser'
            }
            actions={fabConfig.actions}
          />
        )}

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
      <ProfileModal
        visible={isModalVisible}
        onClose={() => setProfilePopupVisible(false)}
      />
      <OrderScannerModal
        isVisible={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={handleCompleteOrder}
      />
    </>
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
    right: 20,
    backgroundColor: PRIMARY_COLOR,
    bottom: 80,
    width: 70,
    height: 70,
    borderRadius: 35,
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
