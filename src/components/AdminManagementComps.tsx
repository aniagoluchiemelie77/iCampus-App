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
import { getAllAdmins, getNotifications } from '../api/localGetApis';
import { deleteAdminApi } from '../api/localDeleteApis';
import { useNavigation } from '@react-navigation/native';
import { TabName, TAB_TO_CATEGORY } from '../constants/inAppConstants.ts';
import { Notification } from '../types/firebase';
import { io, Socket } from 'socket.io-client';
import { baseUrl } from '../components/HomeScreenComponents';

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
          <Text style={styles.headerTitle}>System Administrators</Text>
        }
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
};
export const SystemActivityLogs = ({ activeTab }: { activeTab: string }) => {
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
      renderItem={({ item }) => <LogItem log={item} />}
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
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
});
