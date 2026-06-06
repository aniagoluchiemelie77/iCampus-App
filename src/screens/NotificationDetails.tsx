import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { RootStackParamList } from '../../App';
import { NotificationPageStyles } from '../assets/styles/colors';
import { fetchNotificationDetails } from '../api/localGetApis';
import { Notification } from '../types/firebase';
import { PRIMARY_COLOR } from '../components/Classroomcomponent';
import { formatDateWithSuffix } from '../utils/dateFormatter';
import { PageHeader } from '../components/PageHeader';

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
          const result = await fetchNotificationDetails(notificationId);
          if (result.success && result.notification) {
            setNotification(result.notification);
          }
        } catch (err) {
          console.error('Error fetching notification:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchNotification();
    }
  }, [notificationId, notification]);

  const isSecurityAlert =
    notification?.title?.toLowerCase().includes('password') ||
    notification?.title?.toLowerCase().includes('login') ||
    notification?.category === 'security';

  return (
    <ScrollView contentContainerStyle={NotificationDetailsStyles.container}>
      <PageHeader title="Notification Details" />

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
const NotificationDetailsStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eee', maxWidth: '100%' },
  content: {
    padding: 15,
    width: '95%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 7,
    justifyContent: 'flex-start',
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  message: { marginBottom: 10, color: '#2222', fontSize: 14 },
  message1: {
    paddingVertical: 10,
    color: '#2222',
    fontWeight: '700',
    alignSelf: 'center',
    fontSize: 17,
  },
  securityWarningBox: {
    marginTop: 6,
    padding: 15,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderWidth: 0.8,
  },
  securityWarningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  date: {
    color: '#888',
    alignSelf: 'flex-end',
    marginVertical: 7,
  },
});
