import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { PageHeader } from '../components/PageHeader';
import { fetchNotificationsByTab } from '../api/localGetApis';
import {
  markAllNotificationsAsRead,
  markSingleNotificationAsRead,
} from '../api/localPatchApis';
import Toast from 'react-native-toast-message';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useTheme } from '../context/ThemeContext';
import { NotificationItem } from '../components/NotificationItem';
import { useSocket } from '../hooks/useSocket';
import { CustomButton } from '../assets/components/AppUIComponents';
import {
  navigateForNotification,
  notificationGroupKey,
} from '../utils/notificationNavigation';

type NotificationTab = 'all' | 'unread' | 'finance';
const TABS: { id: NotificationTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'finance', label: 'Finance' },
];

const matchesTab = (notif: any, tab: NotificationTab) =>
  tab === 'all' ||
  (tab === 'unread' && notif.isRead !== true) ||
  (tab === 'finance' && notif.category === 'finance');

const Notifications = () => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user) || {};
  const navigation = useNavigation<any>();
  // The app-wide socket (SocketProvider in App.tsx); no extra connection here.
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [loading, setLoading] = useState(false);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  // Ignore responses for a tab the user has already left.
  const requestIdRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const result = await fetchNotificationsByTab(activeTab);
      if (requestId === requestIdRef.current && result.success) {
        setNotifications(result.notifications);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Live notifications: respect the active tab and fold into an existing group
  // ("Ada and 3 others…") instead of adding a duplicate row.
  useEffect(() => {
    if (!socket) return;
    const handleNewNotification = (incoming: any) => {
      const notif = { ...incoming, isRead: false };
      if (!matchesTab(notif, activeTabRef.current)) return;
      const key = notificationGroupKey(notif);
      setNotifications(prev => {
        if (
          notif.actionType === 'LECTURE_REMINDER' &&
          prev.some(n => n.notificationId === notif.notificationId)
        ) {
          return prev;
        }
        const existing = prev.find(n => notificationGroupKey(n) === key);
        const rest = prev.filter(n => notificationGroupKey(n) !== key);
        const payload = notif.payload || {};
        const merged = existing
          ? {
              ...notif,
              payload: {
                ...payload,
                primaryUser:
                  payload.username || payload.firstname || 'Someone',
                othersCount: (existing.payload?.othersCount ?? 0) + 1,
                unreadCount: (existing.payload?.unreadCount ?? 0) + 1,
              },
            }
          : {
              ...notif,
              payload: {
                ...payload,
                primaryUser:
                  payload.username || payload.firstname || 'Someone',
                othersCount: 0,
                unreadCount: 1,
              },
            };
        return [merged, ...rest];
      });
    };
    socket.on('new_notification', handleNewNotification);
    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket]);

  const markAllAsRead = async () => {
    const previous = notifications;
    // On the Unread tab nothing remains once everything is read.
    setNotifications(prev =>
      activeTab === 'unread' ? [] : prev.map(n => ({ ...n, isRead: true })),
    );
    try {
      const result = await markAllNotificationsAsRead();
      if (result.success) {
        Toast.show({ type: 'success', text1: 'All caught up' });
      } else {
        setNotifications(previous);
      }
    } catch (err) {
      console.error('Mark all read error:', err);
      setNotifications(previous);
    }
  };

  const handleNotificationPress = (item: any) => {
    if (item.isRead !== true && item.notificationId) {
      // The server marks the whole group read; mirror that locally.
      setNotifications(prev =>
        prev.map(n =>
          n.notificationId === item.notificationId
            ? { ...n, isRead: true, payload: { ...n.payload, unreadCount: 0 } }
            : n,
        ),
      );
      markSingleNotificationAsRead(item.notificationId).catch(err =>
        console.error('Read error:', err),
      );
    }
    navigateForNotification(navigation, item, user);
  };

  const unreadCount = notifications.filter(n => n.isRead !== true).length;

  const emptyState =
    activeTab === 'unread'
      ? {
          iconName: 'done-all',
          title: "You're all caught up",
          subtitle: 'No unread notifications right now.',
          buttonText: 'View all notifications',
          onPress: () => setActiveTab('all'),
        }
      : activeTab === 'finance'
        ? {
            iconName: 'account-balance-wallet',
            title: 'No finance activity yet',
            subtitle:
              'Payments, payouts and iCash updates will show up here.',
          }
        : {
            iconName: 'notifications-none',
            title: 'No notifications yet',
            subtitle:
              'Likes, comments, class updates and more will appear here.',
          };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Notifications"
        rightElement={
          unreadCount > 0 ? (
            <CustomButton
              title="Mark all read"
              iconName="done-all"
              onPress={markAllAsRead}
              style={[
                styles.rightElementBtn,
                { backgroundColor: colors.btnColor },
              ]}
            />
          ) : null
        }
      />
      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
              style={[
                styles.tab,
                { borderColor: colors.primary },
                isActive && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? '#fff' : colors.primary },
                ]}
              >
                {tab.label}
              </Text>
              {tab.id === 'unread' && activeTab !== 'unread' && unreadCount > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.tabBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
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
              handleNotificationPress={() => handleNotificationPress(item)}
            />
          )}
          refreshing={loading}
          onRefresh={fetchNotifications}
          ListEmptyComponent={<EmptyState {...emptyState} />}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && { flexGrow: 1 },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    marginHorizontal: 15,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  tabText: { fontSize: 13, fontWeight: '700' },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  listContent: { marginHorizontal: 15, paddingBottom: 30 },
  rightElementBtn: {
    paddingHorizontal: 10,
    height: 38,
    width: 'auto',
  },
});

export default Notifications;
