import React, {useEffect, useState} from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../components/hooks';
import type { Notification } from '../types/firebase';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  CalendarScreenStyles,
  HomeScreenComponentStyles,
  NotificationPageStyles,
} from '../assets/styles/colors';
import { HeaderProps } from './ProductDetails';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import { useDispatch } from 'react-redux';
import { markAsRead } from '../components/NotificationSplice';
import baseUrl from '../../App';

dayjs.extend(advancedFormat);
export const formatNotificationDate = (dateString: string): string => {
  return dayjs(dateString).format('MMM Do YYYY, h:mmA');
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const CustomHeader: React.FC<HeaderProps> = ({ title, onBack }) => {
  return (
    <View style={CalendarScreenStyles.headerContainer}>
      <TouchableOpacity
        onPress={onBack}
        style={CalendarScreenStyles.backButton}
      >
        <Icon name="arrow-back-outline" size={25} color="#f54b02" />
        <Text style={CalendarScreenStyles.headerTitle}>{title}</Text>
      </TouchableOpacity>
    </View>
  );
};
const EmptyNotification = () => (
  <View style={NotificationPageStyles.emptyNotifications}>
    <MaterialIcons name="notifications-off" size={20} color="#807f7fff" />
    <Text style={NotificationPageStyles.emptyNotificationsText}>
      No notification found.
    </Text>
  </View>
);

const Notifications = () => {
  const user = useAppSelector(state => state.user);
  const navigation2 = useNavigation<NavigationProp>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'unread'
  const [unreadCount, setUnreadCount] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);

  const dispatch = useDispatch();
  //Fetch Notifications
  useEffect(() => {
    const queryParams = new URLSearchParams({
      userId: user.uid,
      limit: '100',
      offset: '0',
      unread: activeTab === 'unread' ? 'true' : 'false',
    });

    const fetchNotifications2 = async () => {
      try {
        let res;
        let data;
        if (activeTab === 'transactions') {
          const type = 'transactions';
          res = await fetch(
            `${baseUrl}users/notifications?${queryParams}&type=${type}`,
          );
          data = await res.json();
        } else {
          res = await fetch(`${baseUrl}users/notifications?${queryParams}`);
          data = await res.json();
        }

        setNotifications(data.notifications);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications2().catch(err => console.error('Error:', err));
  }, [user?.uid, activeTab, dispatch]);

  useEffect(() => {
    const fetchNotificationCounts = async () => {
      try {
        const unreadRes = await fetch(
          `${baseUrl}users/notifications/count?userId=${user.uid}&unread=true`,
        );
        const unreadData = await unreadRes.json();
        setUnreadCount(unreadData.count || 0);

        const transactionRes = await fetch(
          `${baseUrl}users/notifications/count?userId=${user.uid}&type=transactions`,
        );
        const transactionData = await transactionRes.json();
        setTransactionCount(transactionData.count || 0);
      } catch (err) {
        console.error('Error fetching notification counts:', err);
      }
    };

    if (user?.uid) {
      fetchNotificationCounts();
    }
  }, [user?.uid]);

  const handleMarkAsRead = async (id: string) => {
    try {
      console.log('Marking as read');
      await fetch(`${baseUrl}users/notifications/${id}/read`, {
        method: 'PATCH',
      });
      setNotifications(prev =>
        prev.map(n => (n.notificationId === id ? { ...n, isRead: true } : n)),
      );
      dispatch(markAsRead(id));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };
  return (
    <View style={NotificationPageStyles.container}>
      <CustomHeader title="Notifications" onBack={() => navigation2.goBack()} />
      <View style={NotificationPageStyles.tabDiv}>
        {['all', 'unread', 'transactions'].map(tab => {
          let count = null;
          if (tab === 'unread' && unreadCount > 0) {
            count = unreadCount;
          } else if (tab === 'transactions' && transactionCount > 0) {
            count = transactionCount;
          }

          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                HomeScreenComponentStyles.tabItem,
                activeTab === tab && HomeScreenComponentStyles.activeTab,
              ]}
            >
              <Text style={HomeScreenComponentStyles.tabLabel}>
                {tab === 'transactions'
                  ? `Transactions${count ? ` (${count})` : ''}`
                  : `${tab.charAt(0).toUpperCase() + tab.slice(1)}${
                      count ? ` (${count})` : ''
                    }`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={Array.isArray(notifications) ? notifications : []}
        keyExtractor={item => item.notificationId}
        renderItem={({ item }) => (
          <View
            style={[
              NotificationPageStyles.notificationsDivCard,
              item.isRead && { backgroundColor: '#fff' },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleMarkAsRead(item.notificationId)}
            >
              <View style={NotificationPageStyles.notificationsDateDiv}>
                <Text style={NotificationPageStyles.notificationsDate}>
                  {formatNotificationDate(item.createdAt)}
                </Text>
                <Text style={NotificationPageStyles.notificationsDate2}>
                  View
                </Text>
              </View>
              <View style={NotificationPageStyles.notificationsTextDiv}>
                <Text
                  numberOfLines={4}
                  ellipsizeMode="tail"
                  style={NotificationPageStyles.notificationsText}
                >
                  {item.message}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={EmptyNotification}
        contentContainerStyle={NotificationPageStyles.notificationsDiv}
      />
    </View>
  );
};

export default Notifications;
