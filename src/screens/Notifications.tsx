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
import { useAppSelector } from '../hooks/hooks';
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
import { PRIMARY_COLOR } from '../assets/styles/colors';
import Toast from 'react-native-toast-message';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useTheme } from '../context/ThemeContext';
import { NotificationItem } from '@components/NotificationItem';

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
    const { actionType, payload } = item;

    switch (actionType) {
      // --- POST GROUP (PostDetails) ---
      case 'POST_UPDATED':
      case 'NEW_POST':
      case 'POST_MENTION':
      case 'POST_LIKED':
      case 'POST_COMMENTED':
      case 'POLL_MILESTONE':
      case 'POST_REPOSTED':
        navigation.navigate('PostDetail', { postId: payload.postId });
        break;

      case 'PRODUCT_DELETION':
      case 'PRODUCT_CREATION':
      case 'PRODUCT_UPDATE':
        navigation.navigate('SalesHub');
        break;

      // --- ACADEMIC/COURSE UPDATES (NotificationDetails) ---
      case 'LECTURE_CANCELLED':
      case 'LECTURE_POSTPONED':
      case 'LECTURE_VENUE_CHANGE':
      case 'LECTURE_TYPE_CHANGE':
      case 'LECTURE_SCHEDULED':
        navigation.navigate('CourseSubPage', {
          title: 'View Lecture Schedule',
          userRole: user.usertype,
        });
        break;

      case 'CONTENT_MUTATED':
      case 'CONTENT_DELETION':
      case 'CONTENT_ADDED':
        navigation.navigate('CourseSubPage', {
          title: 'Course Contents',
          userRole: user.usertype,
          course: payload.course,
        });
        break;

      case 'EXCEPTION_UPDATED':
        navigation.navigate('CourseSubPage', {
          title: 'Exceptions',
          userRole: user.usertype,
        });
        break;

      case 'TEST_CREATED':
        navigation.navigate('CourseSubPage', {
          title: 'Assessments',
          userRole: user.usertype,
        });
        break;

      case 'ASSIGNMENT_CREATED':
      case 'ASSIGNMENT_REMOVED':
        navigation.navigate('CourseSubPage', {
          title: 'Assignments',
          userRole: user.usertype,
          course: payload.course,
        });
        break;

      case 'MATERIAL_UPLOADED':
      case 'MATERIAL_DELETED':
        navigation.navigate('CourseSubPage', {
          title: 'Course Materials',
          userRole: user.usertype,
          course: payload.course,
        });
        break;

      // --- OTHER SPECIALIZED PAGES ---
      case 'PROFILE_VIEW':
      case 'PROFILE_UPDATED':
        navigation.navigate('Profile', { identifier: user.uid });
        break;

      case 'NEW_FOLLOWER':
        navigation.navigate('Profile', { identifier: payload.followerId });
        break;

      case 'TEST_CREATED':
        navigation.navigate('CourseSubPage', {
          title: 'Assessments',
          userRole: user.usertype,
        });
        break;

      case 'SALES_PAYOUT_SUCCESS':
      case 'MARKET_PURCHASE_DEBIT':
      case 'ICASH_PURCHASE':
      case 'ICASH_WITHDRAWAL':
        navigation.navigate('TransactionDetail', {
          transactionId: payload.transactionId,
        });
        break;

      case 'ORDER_REVIEW_REQUEST':
        navigation.navigate('CreateReviewScreen', {
          targetId: payload.targetId,
          productType: 'product',
        });
        break;

      case 'LECTURER_REVIEW_REQUEST':
        navigation.navigate('CreateReviewScreen', {
          targetId: payload.targetId,
          productType: 'lecturer',
        });
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
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              handleNotificationPress={handleNotificationPress}
            />
          )}
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
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PRIMARY_COLOR,
  },
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