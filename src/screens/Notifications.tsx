import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../components/hooks';
import { useSocket } from '../components/SocketContext';
import type { Notification } from '../types/firebase'; // Your new interface
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { baseUrl } from '../components/HomeScreenComponents';

dayjs.extend(relativeTime);

const { width: screenWidth } = Dimensions.get('window');

const Notifications = () => {
  const user = useAppSelector(state => state.user);
  const navigation = useNavigation<any>();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unread', 'finance'
  const [counts, setCounts] = useState({ unread: 0, finance: 0 });
  const [loading, setLoading] = useState(false);

  // 1. Fetch Notifications from Backend
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const categoryParam = activeTab === 'finance' ? '&category=finance' : '';
      const unreadParam = activeTab === 'unread' ? '&unread=true' : '';

      const response = await fetch(
        `${baseUrl}users/notifications?userId=${user.uid}${categoryParam}${unreadParam}`,
      );
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user.uid, activeTab]);

  // 2. Initial Load & Tab Switching
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 3. Real-time Socket Listener
  useEffect(() => {
    if (!socket) return;

    socket.on('new_notification', (newNotif: Notification) => {
      // Add to list if it matches active tab criteria
      setNotifications(prev => [newNotif, ...prev]);
      // Update local counts
      setCounts(prev => ({ ...prev, unread: prev.unread + 1 }));
    });

    return () => {
      socket.off('new_notification');
    };
  }, [socket]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`${baseUrl}users/notifications/${id}/read`, {
        method: 'PATCH',
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    // Determine Icon based on type
    const getIcon = () => {
      switch (item.type) {
        case 'finance':
          return { name: 'account-balance-wallet', color: '#2ecc71' };
        case 'security':
          return { name: 'security', color: '#e74c3c' };
        default:
          return { name: 'school', color: '#3498db' };
      }
    };

    const iconConfig = getIcon();

    return (
      <TouchableOpacity
        onPress={() => {
          handleMarkAsRead(item.id);
          navigation.navigate('NotificationDetails', { notification: item });
        }}
        style={[styles.card, !item.isRead && styles.unreadCard]}
      >
        <View style={styles.iconContainer}>
          <MaterialIcons
            name={iconConfig.name}
            size={24}
            color={iconConfig.color}
          />
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title || 'Notification'}
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={25} color="#f54b02" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {['all', 'unread', 'finance'].map(tab => (
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

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderNotificationItem}
        refreshing={loading}
        onRefresh={fetchNotifications}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No notifications yet.</Text>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    color: '#222',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: '#f54b02' },
  tabText: { fontSize: 13, color: '#888', fontWeight: '600' },
  activeTabText: { color: '#f54b02' },
  listContent: { padding: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  unreadCard: {
    backgroundColor: '#fff5f2',
    borderLeftWidth: 4,
    borderLeftColor: '#f54b02',
  },
  iconContainer: { marginRight: 15, justifyContent: 'center' },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f54b02',
  },
  content: { flex: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: { fontWeight: 'bold', fontSize: 15, color: '#333', flex: 1 },
  time: { fontSize: 11, color: '#999' },
  message: { fontSize: 13, color: '#666', lineHeight: 18 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
});

export default Notifications;
