import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { useAppSelector } from '../hooks/hooks';
import { UserAvatar } from './UserAvatar';
import { UserIdentity } from './UserIdentity';
import {
  fetchTicketsAPI,
  getAllAdmins,
  getNotifications,
} from '../api/localGetApis';
import { deleteAdminApi } from '../api/localDeleteApis';
import { useNavigation } from '@react-navigation/native';
import { TabName, TAB_TO_CATEGORY } from '../constants/inAppConstants.ts';
import { Notification } from '../types/firebase';
import { io, Socket } from 'socket.io-client';
import { baseUrl } from '../components/HomeScreenComponents';
import LogItem from './LogItem.tsx';

export const AdminManagementSection = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const currentUser = useAppSelector(state => state.admin);
  const [admins, setAdmins] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await getAllAdmins();
      setAdmins(data);
    } finally {
      setIsRefreshing(false);
    }
  };
  const handleRemoveAdmin = async (uid: string) => {
    Alert.alert(
      'Remove Admin',
      'Are you sure you want to remove this user from administrative access? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAdminApi(uid);
              handleRefresh();
            } catch (error) {
              Alert.alert('Error', 'Could not remove admin.');
            }
          },
        },
      ],
    );
  };

  const isSuperAdmin = currentUser.adminType === 'super_admin';

  const renderAdminItem = ({ item }: { item: any }) => (
    <View
      style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
    >
      <View style={styles.infoRow}>
        <UserAvatar
          profilePic={item.profilePic}
          firstName={item.firstname}
          lastName={item.lastname}
          style={styles.avatar}
        />
        <View style={styles.textContainer}>
          <UserIdentity
            firstname={item.firstname}
            lastname={item.lastname}
            isVerified={item.isVerified}
            size={'medium'}
          />
          <Text style={[styles.adminType, { color: colors.text }]}>
            {item.adminType.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={[styles.lastAccessed, { color: colors.text }]}>
            Last accessed: {new Date(item.lastAccessed).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {isSuperAdmin && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              navigation.navigate('AdminFormPage', { admin: item })
            }
          >
            <MaterialIcons name="edit" size={22} color={colors.primary} />
          </TouchableOpacity>
          {item.uid !== currentUser.uid && (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemoveAdmin(item.uid)}
            >
              <MaterialIcons
                name="delete-outlined"
                size={22}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
  useEffect(() => {
    const loadAdmins = async () => {
      const data = await getAllAdmins();
      setAdmins(data);
    };
    loadAdmins();
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={admins}
        keyExtractor={item => item.uid}
        renderItem={renderAdminItem}
        ListHeaderComponent={
          <Text style={[styles.headerTitle, { color: colors.textDarker }]}>
            iCampus Administrators
          </Text>
        }
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
};
export const SystemActivityLogs = ({ activeTab }: { activeTab: string }) => {
  const navigation = useNavigation<any>();
  const [logs, setLogs] = useState<Notification[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const activeTabRef = useRef(activeTab);
  const admin = useAppSelector(state => state.admin);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = useCallback(
    async (pageNum: number, isNewTab: boolean = false) => {
      if (loading || (!hasMore && !isNewTab)) return;

      setLoading(true);
      const data = await getNotifications(activeTab as TabName, pageNum);

      if (data.length < 20) setHasMore(false);

      setLogs(prev => (isNewTab ? data : [...prev, ...data]));
      setLoading(false);
    },
    [activeTab, loading, hasMore],
  );
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchLogs(1, true);
  }, [activeTab, fetchLogs]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    socketRef.current = io(baseUrl, {
      transports: ['websocket'],
      query: { userId: admin.uid },
    });

    socketRef.current.on('new_notification', (newLog: any) => {
      const currentCategory = TAB_TO_CATEGORY[activeTabRef.current as TabName];

      if (newLog.category === currentCategory) {
        setLogs(prev => [newLog, ...prev]);
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [admin.uid]);

  return (
    <FlatList
      data={logs}
      keyExtractor={item => item.notificationId}
      renderItem={({ item }) => (
        <LogItem
          log={item}
          onPress={() =>
            navigation.navigate('NotificationDetails', { notification: item })
          }
        />
      )}
      onEndReached={() => {
        if (hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchLogs(nextPage);
        }
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading ? <ActivityIndicator /> : null}
    />
  );
};
export const SupportTicketSection = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [tickets, setTickets] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchInitialTickets = async () => {
    try {
      const response = await fetchTicketsAPI(20, '');

      if (response.success) {
        setTickets(response.tickets);
        setNextCursor(response.nextCursor);
      } else {
        console.error('Failed to load tickets:', response.message);
      }
    } catch (error) {
      console.error('Error fetching initial tickets:', error);
    }
  };
  const loadMoreTickets = async () => {
    if (!nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    const response = await fetchTicketsAPI(20, nextCursor);

    if (response.success) {
      setTickets(prev => [...prev, ...response.tickets]);
      setNextCursor(response.nextCursor);
    }
    setIsLoadingMore(false);
  };
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchInitialTickets();
    setIsRefreshing(false);
  };
  useEffect(() => {
    fetchInitialTickets();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return colors.criticalSeverity;
      case 'high':
        return colors.highSeverity;
      case 'medium':
        return colors.mediumSeverity;
      case 'low':
        return colors.lowSeverity;
      default:
        return colors.text;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return colors.primary;
      case 'pending':
        return colors.pendingDelivery;
      case 'resolved':
        return colors.success;
      default:
        return colors.text;
    }
  };

  const renderTicketItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
      onPress={() =>
        navigation.navigate('TicketResolveScreen', { ticket: item })
      }
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.ticketRef, { color: colors.text }]}>
          #{item.ticketRefId}
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={[styles.badgeText, { color: colors.btnTextColor }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons
            name="error-outlined"
            size={14}
            color={getSeverityColor(item.severity)}
          />
          <Text
            style={[
              styles.severity,
              { color: getSeverityColor(item.severity) },
            ]}
          >
            {item.severity.toUpperCase()} Priority
          </Text>
        </View>
        <Text
          style={[styles.category, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.dateText, { color: colors.text }]}>
          {new Date(item.createdAt || item.updatedAt).toLocaleDateString()}
        </Text>
        <MaterialIcons name="chevron-right" size={22} color={colors.text} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        keyExtractor={item => item.id || item.ticketRefId}
        renderItem={renderTicketItem}
        ListHeaderComponent={
          <Text style={[styles.headerTitle, { color: colors.textDarker }]}>
            Tickets
          </Text>
        }
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        onEndReached={loadMoreTickets}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', padding: 20 },
  card: { padding: 15, borderRadius: 15, marginBottom: 15 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  avatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 12 },
  textContainer: { flex: 1 },
  adminType: { fontSize: 14, fontWeight: '600', marginVertical: 5 },
  lastAccessed: { fontSize: 11 },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  editBtn: { padding: 8 },
  removeBtn: { padding: 8 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ticketRef: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardBody: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  category: {
    fontSize: 14,
    fontWeight: '500',
  },
  severity: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
  },
});
