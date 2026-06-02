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

dayjs.extend(relativeTime);

const Notifications = () => {
  const user = useAppSelector(state => state.user);
  const navigation = useNavigation<any>();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'finance' | 'unread'>(
    'all',
  );
  const [loading, setLoading] = useState(false);

  // 1. Fetch Notifications with Filters
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
  // Notifications.tsx

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

  // 3. Navigation "Inlet" Logic
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
    // Use the ID from relatedEntity (set by backend) or fallback to payload
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
          title: 'View Lecture Schedule', // Matches your conditional title check
          course: { courseId: payload.courseId }, // Ensure backend sends courseId
          userRole: user.usertype, // 'lecturer' or 'student'
          initialLectureId: entityId, // Useful if you want to highlight the specific lecture
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
        navigation.navigate('TransactionPage', { transactionId: entityId });
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
      const iconColor = PRIMARY_COLOR;

      switch (item.category) {
        case 'finance':
          return { name: 'account-balance-wallet', color: iconColor };
        case 'security':
          return { name: 'security', color: iconColor };
        case 'academic':
        case 'course':
          return { name: 'school', color: iconColor };
        case 'social':
          return { name: 'people', color: iconColor };
        case 'announcement':
          return { name: 'campaign', color: iconColor };
        default:
          return { name: 'notifications', color: iconColor };
      }
    };

    const iconConfig = getIcon();

    return (
      <TouchableOpacity
        onPress={() => handleNotificationPress(item)}
        style={[styles.card, !item.isRead && styles.unreadCard]}
      >
        <View style={styles.iconContainer}>
          <MaterialIcons
            name={iconConfig.name}
            size={22}
            color={iconConfig.color}
          />
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.time}>{dayjs(item.createdAt).fromNow()}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Notifications"
        rightElement={
          <TouchableOpacity onPress={markAllAsRead}>
            <MaterialIcons name="done-all" size={24} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        }
      />

      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
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
          color={PRIMARY_COLOR}
          style={{ marginTop: 50 }}
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
  container: { flex: 1, backgroundColor: '#fff' },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    padding: 10,
  },
  tab: {
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: PRIMARY_COLOR },
  tabText: { fontSize: 13, color: '#2222', fontWeight: '600' },
  activeTabText: { color: PRIMARY_COLOR },
  listContent: { padding: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 8,
    elevation: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: PRIMARY_COLOR_TINT,
    alignItems: 'center',
  },
  unreadCard: {
    backgroundColor: '#fadccc',
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: { fontWeight: 'bold', fontSize: 15, color: '#2222', flex: 1 },
  time: { fontSize: 11, color: '#999' },
  message: { fontSize: 13, color: '#666', lineHeight: 18 },
});

export default Notifications;