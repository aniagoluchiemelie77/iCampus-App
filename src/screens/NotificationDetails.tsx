import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { EmptyState } from '@components/EmptyFlatlistComponent';
import type { RootStackParamList } from '../../App';
import { fetchNotificationDetails } from '../api/localGetApis';
import { Notification } from '../types/firebase';
import { formatDateWithSuffix } from '../utils/dateFormatter';
import { PageHeader } from '../components/PageHeader';
import { useTheme } from '../context/ThemeContext';

export default function NotificationDetails() {
  const { colors } = useTheme();
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
    <ScrollView
      contentContainerStyle={[
        NotificationDetailsStyles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <PageHeader title="Notification Details" />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', marginTop: 100 }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notification ? (
        <View
          style={[
            NotificationDetailsStyles.content,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text
            style={[
              NotificationDetailsStyles.message1,
              { color: colors.textDarker },
            ]}
          >
            {notification.title}
          </Text>
          <Text
            style={[NotificationDetailsStyles.message, { color: colors.text }]}
          >
            {notification.message}
          </Text>
          {isSecurityAlert && (
            <View
              style={[
                NotificationDetailsStyles.securityWarningBox,
                { borderLeftColor: colors.border },
              ]}
            >
              <Text
                style={[
                  NotificationDetailsStyles.securityWarningText,
                  { color: colors.text },
                ]}
              >
                If this was not you, please immediately contact
                <TouchableOpacity>
                  <Text style={{ color: colors.primary }}>
                    {' '}
                    support@icampus.com
                  </Text>
                </TouchableOpacity>
              </Text>
            </View>
          )}
          <Text
            style={[NotificationDetailsStyles.date, { color: colors.text }]}
          >
            {notification?.createdAt
              ? formatDateWithSuffix(notification.createdAt)
              : 'Date not available'}
          </Text>
        </View>
      ) : (
        <EmptyState
          iconName="notifications-none"
          title="Notification detail not Found"
        />
      )}
    </ScrollView>
  );
}
const NotificationDetailsStyles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  content: {
    padding: 15,
    borderRadius: 15,
    marginVertical: 15,
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  message: { marginBottom: 15, fontSize: 14 },
  message1: {
    marginBottom: 15,
    fontWeight: '700',
    fontSize: 15,
  },
  securityWarningBox: {
    padding: 15,
    borderLeftWidth: 1,
  },
  securityWarningText: {
    fontSize: 14,
  },
  date: {
    alignSelf: 'flex-end',
    fontSize: 12,
  },
});
