import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../components/hooks';
import { useSocket } from '../components/SocketContext';
import { PageHeader } from '../components/PageHeader';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { fetchNotificationsByTab } from '../api/localGetApis';
import {
  markAllNotificationsAsRead,
  markSingleNotificationAsRead,
} from '../api/localPatchApis';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '../components/Classroomcomponent';
import Toast from 'react-native-toast-message';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useTheme } from '../context/ThemeContext';

dayjs.extend(relativeTime);

const Notifications = () => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user);
  const navigation = useNavigation<any>();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'finance' | 'unread'>(
    'all',
  );
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchNotificationsByTab(activeTab);
      if (result.success) {
        setNotifications(result.notifications);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);
  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      const result = await markAllNotificationsAsRead();

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Notifications all marked as read',
        });
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } else {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Mark all read error:', err);
      fetchNotifications();
    }
  };
  const tabs: ('all' | 'unread' | 'finance')[] = ['all', 'unread', 'finance'];

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_notification', (newNotif: any) => {
      setNotifications(prev => [newNotif, ...prev]);
    });

    return () => {
      socket.off('new_notification');
    };
  }, [socket]);
  const handleNotificationPress = async (item: any) => {
    if (!item.isRead) {
      markAsReadOnServer(item.notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.notificationId === item.notificationId ? { ...n, isRead: true } : n,
        ),
      );
    }
    const { actionType, payload, relatedEntity } = item;
    const entityId =
      relatedEntity?.entityId || payload?.postId || payload?.lectureId;

    switch (actionType) {
      // --- POST GROUP (PostDetails) ---
      case 'POST_MENTION': // Fixed typo (removed 'S')
      case 'POST_LIKED':
      case 'POST_COMMENTED':
      case 'POST_REPOSTED':
        navigation.navigate('PostDetail', { postId: entityId });
        break;

      // --- LECTURE GROUP (LectureView) ---
      case 'LECTURE_CANCELLED':
      case 'LECTURE_POSTPONED':
      case 'LECTURE_SCHEDULED':
        navigation.navigate('CourseSubPage', {
          title: 'View Lecture Schedule',
          course: { courseId: payload.courseId },
          userRole: user.usertype,
          initialLectureId: entityId,
        });
        break;

      // --- ACADEMIC/COURSE UPDATES (NotificationDetails) ---
      case 'CONTENT_UPDATED':
      case 'LECTURE_REMINDER':
        navigation.navigate('NotificationDetails', { notification: item });
        break;

      // --- OTHER SPECIALIZED PAGES ---
      case 'NEW_FOLLOWER':
        navigation.navigate('Profile', { userId: payload.followerId });
        break;

      case 'TEST_CREATED':
      case 'TEST_ANALYSIS_READY':
        navigation.navigate('CourseSubPage', {
          title: 'Assessments',
          course: { courseId: payload.courseId },
          userRole: user.usertype,
          initialTestId: payload.testId,
        });
        break;

      case 'PURCHASE_DEBIT':
        navigation.navigate('TransactionDetail', { transactionId: entityId });
        break;

      default:
        navigation.navigate('NotificationDetails', { notification: item });
        break;
    }
  };

  const markAsReadOnServer = async (id: string) => {
    try {
      const result = await markSingleNotificationAsRead(id);
      if (result.success) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, isRead: true } : n)),
        );
      }
    } catch (err) {
      console.error('Read error:', err);
    }
  };

  const renderNotificationItem = ({ item }: { item: any }) => {
    const getIcon = () => {
      switch (item.category) {
        case 'finance':
          return { name: 'account-balance-wallet-outlined' };
        case 'auth':
          return { name: 'security-outlined' };
        case 'store':
          return { name: 'shopping-cart-outlined' };
        case 'profile':
          return { name: 'account-circle-outlined' };
        case 'security':
          return { name: 'security-outlined' };
        case 'reminder':
        case 'classroom':
          return { name: 'school-outlined' };
        case 'social':
          return { name: 'people-outlined' };
        case 'subscription':
          return { name: 'verified-outlined' };
        default:
          return { name: 'notifications' };
      }
    };
    const iconConfig = getIcon();

    return (
      <TouchableOpacity
        onPress={() => handleNotificationPress(item)}
        style={[
          styles.card,
          !item.isRead
            ? { backgroundColor: colors.backgroundSecondary }
            : { backgroundColor: colors.background },
        ]}
      >
        <View style={styles.iconContainer}>
          <MaterialIcons name={iconConfig.name} size={22} color={colors.text} />
        </View>

        <View style={styles.content}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.title}
          </Text>
          <Text
            style={[styles.message, { color: colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.message}
          </Text>
          <Text style={[styles.time, { color: colors.text }]}>
            {dayjs(item.createdAt).fromNow()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Notifications"
        rightElement={
          <TouchableOpacity
            onPress={markAllAsRead}
            style={[
              styles.rightElementBtn,
              { backgroundColor: colors.btnColor },
            ]}
          >
            <Text
              style={[
                styles.rightElementBtnText,
                { color: colors.btnTextColor },
              ]}
            >
              Mark All As Read
            </Text>
            <MaterialIcons
              name="done-all"
              size={24}
              color={colors.btnTextColor}
            />
          </TouchableOpacity>
        }
      />
      <View
        style={[styles.tabBar, { backgroundColor: colors.backgroundSecondary }]}
      >
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab
                  ? { color: colors.primary }
                  : { color: colors.text },
              ]}
            >
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && notifications.length === 0 ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 30 }}
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.notificationId || item.id}
          renderItem={renderNotificationItem}
          refreshing={loading}
          onRefresh={fetchNotifications}
          ListEmptyComponent={
            <EmptyState
              iconName="notifications-none"
              title="No Notifications Found"
              subtitle="We couldn't find any notifications for you."
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  tab: {
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    padding: 10,
  },
  activeTab: { borderBottomColor: PRIMARY_COLOR },
  tabText: { fontSize: 14, fontWeight: '600' },
  listContent: { padding: 12 },
  card: {
    flexDirection: 'row',
    marginBottom: 10,
    elevation: 1,
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: PRIMARY_COLOR_TINT,
    alignItems: 'center',
  },
  iconContainer: { marginRight: 15, justifyContent: 'center' },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PRIMARY_COLOR,
  },
  content: { flex: 1 },
  title: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  time: { fontSize: 11 },
  message: { fontSize: 12, marginBottom: 4 },
  rightElementBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightElementBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
});

export default Notifications;