import React, { useEffect, useState,  } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { RootStackParamList } from '../../App';
import {
  CalendarScreenStyles,
  NotificationPageStyles,
  NotificationDetailsStyles,
} from '../assets/styles/colors'; // adjust import paths
import { baseUrl } from '../components/HomeScreenComponents';
import { Notification } from '../types/firebase';
import { PRIMARY_COLOR } from '../components/Classroomcomponent';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'NotificationDetails'
>;

const formatDateWithSuffix = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
      ? 'nd'
      : day % 10 === 3 && day !== 13
      ? 'rd'
      : 'th';

  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();

  return `${month} ${day}${suffix} ${year}`;
};

const CustomHeader: React.FC<{ title: string; onBack: () => void }> = ({
  title,
  onBack,
}) => (
  <View style={CalendarScreenStyles.headerContainer2}>
    <TouchableOpacity onPress={onBack}>
      <Icon name="chevron-left" size={25} color={PRIMARY_COLOR} />
    </TouchableOpacity>
    <Text style={CalendarScreenStyles.headerTitle}>{title}</Text>
  </View>
);

const EmptyNotification = () => (
  <View style={NotificationPageStyles.emptyNotifications}>
    <MaterialIcons name="notifications-off" size={20} color="#807f7fff" />
    <Text style={NotificationPageStyles.emptyNotificationsText}>
      Notification not found.
    </Text>
  </View>
);
// ... (keep existing imports)

export default function NotificationDetails() {
  const navigation2 = useNavigation<NavigationProp>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'NotificationDetails'>>();
  const { notificationId, notification: passedNotification } = route.params;

  const [notification, setNotification] = useState<Notification | null>(
    passedNotification || null,
  );
  const [loading, setLoading] = useState(!passedNotification);

  useEffect(() => {
    if (!notification && notificationId) {
      const fetchNotification = async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `${baseUrl}users/notifications/${notificationId}`,
          );
          const data = await res.json();
          if (data.notification) setNotification(data.notification);
        } catch (err) {
          console.error('Error fetching notification:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchNotification();
    }
  }, [notificationId, notification]);

  // Logic to check if this is a sensitive security notification
  const isSecurityAlert =
    notification?.title?.toLowerCase().includes('password') ||
    notification?.title?.toLowerCase().includes('login') ||
    notification?.category === 'security';

  return (
    <ScrollView contentContainerStyle={NotificationDetailsStyles.container}>
      <CustomHeader
        title="Notification Details"
        onBack={() => navigation2.goBack()}
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', marginTop: 100 }}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      ) : notification ? (
        <View style={NotificationDetailsStyles.content}>
          {/* Notification Title */}
          <Text style={NotificationDetailsStyles.message1}>
            {notification.title}
          </Text>
          {/* Notification Body */}
          <Text style={NotificationDetailsStyles.message}>
            {notification.message}
          </Text>

          {/* Security Warning Section */}
          {isSecurityAlert && (
            <View style={NotificationDetailsStyles.securityWarningBox}>
              <Text style={NotificationDetailsStyles.securityWarningText}>
                If this was not you, please immediately contact
                <Text style={{ fontWeight: 'bold' }}> support@icampus.com</Text>
              </Text>
            </View>
          )}

          {/* Timestamp */}
          <Text style={NotificationDetailsStyles.date}>
            {notification?.createdAt
              ? formatDateWithSuffix(notification.createdAt)
              : 'Date not available'}
          </Text>
        </View>
      ) : (
        <EmptyNotification />
      )}
    </ScrollView>
  );
}

