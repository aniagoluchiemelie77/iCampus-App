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
import { markAsRead, clearUnread } from '../components/NotificationSplice';

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
  const dispatch = useDispatch();
  const tabs = ['all', 'transactions', 'unread', 'mark'];
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

        if (activeTab === 'mark') {
          res = await fetch(
            'http://192.168.1.98:5000/users/notifications/mark-all-read',
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.uid,
                limit: '50',
                offset: '0',
              }),
            },
          );
          data = await res.json();
          dispatch(clearUnread());
        } else if (activeTab === 'transactions') {
          const type = 'transactions';
          res = await fetch(
            `http://192.168.1.98:5000/users/notifications?${queryParams}&type=${type}`,
          );
          data = await res.json();
        } else {
          res = await fetch(
            `http://192.168.1.98:5000/users/notifications?${queryParams}`,
          );
          data = await res.json();
        }

        setNotifications(data.notifications);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications2().catch(err => console.error('Error:', err));
  }, [user?.uid, activeTab, dispatch]);
  const handleMarkAsRead = async (id: string) => {
    try {
      console.log('Marking as read');
      await fetch(`http://192.168.1.98:5000/users/notifications/${id}/read`, {
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
      <FlatList
        data={tabs}
        horizontal
        keyExtractor={item => item}
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={NotificationPageStyles.tabDiv}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveTab(item)}
            style={[
              HomeScreenComponentStyles.tabItem,
              activeTab === item && HomeScreenComponentStyles.activeTab,
            ]}
          >
            <Text style={HomeScreenComponentStyles.tabLabel}>
              {item === 'mark'
                ? 'Mark as Read'
                : item === 'transactions'
                ? 'Transactions'
                : item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

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
