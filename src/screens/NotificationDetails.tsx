import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { fetchNotificationDetails } from '../api/localGetApis';
import { PageHeader } from '../components/PageHeader';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { CustomButton } from '../assets/components/AppUIComponents';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { parseFirestoreDate } from '../utils/dateFormatter';
import dayjs from 'dayjs';

export default function NotificationDetails() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<any, 'NotificationDetails'>>();
  const { notificationId, notification: passedNotification } =
    route.params || {};

  const [notification, setNotification] = useState<any>(
    passedNotification || null,
  );
  const [loading, setLoading] = useState(
    !passedNotification && !!notificationId,
  );

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

  const isSecurityAlert = notification?.category === 'security';
  const isBtnVisible = notification?.actionType === 'COURSES_EXTRACTED';

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'finance':
        return 'account-balance';
      case 'auth':
      case 'security':
        return 'security';
      case 'store':
        return 'shopping-cart';
      case 'profile':
        return 'account-circle';
      case 'reminder':
      case 'classroom':
        return 'school';
      case 'social':
        return 'people';
      case 'subscription':
        return 'verified';
      default:
        return 'notifications';
    }
  };

  const handleAction = async () => {
    if (!notification) return;
    switch (notification.actionType) {
      case 'COURSES_EXTRACTED':
        navigation.navigate('Home', { activeTab: 'classroom' });
        break;
    }
  };

  const parsedDate = parseFirestoreDate(notification?.createdAt);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <PageHeader title="Notification Detail" />
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notification ? (
        <View
          style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
        >
          <View style={styles.headerRow}>
            <View
              style={[styles.badge, { backgroundColor: colors.primary + '15' }]}
            >
              <MaterialIcons
                name={getCategoryIcon(notification.category)}
                size={14}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {notification.category
                  ? notification.category.toUpperCase()
                  : 'GENERAL'}
              </Text>
            </View>
            <Text style={[styles.timeText, { color: colors.text }]}>
              {parsedDate
                ? dayjs(parsedDate).format('MMM D, YYYY • h:mm A')
                : 'Recent'}
            </Text>
          </View>

          {/* Title & Main Message */}
          <Text style={[styles.title, { color: colors.text }]}>
            {notification.title}
          </Text>
          <Text style={[styles.message, { color: colors.text }]}>
            {notification.message}
          </Text>

          {/* Structured Payload Info (if available e.g., Order details) */}
          {notification.payload &&
            Object.keys(notification.payload).length > 0 && (
              <View
                style={[
                  styles.payloadContainer,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                {Object.entries(notification.payload).map(([key, value]) => {
                  if (typeof value === 'object' || key === 'pdfUrl')
                    return null;
                  return (
                    <View key={key} style={styles.payloadRow}>
                      <Text style={[styles.payloadKey, { color: colors.text }]}>
                        {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                      </Text>
                      <Text
                        style={[styles.payloadValue, { color: colors.text }]}
                        numberOfLines={2}
                      >
                        {String(value)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

          {/* Security Warning Box */}
          {isSecurityAlert && (
            <View
              style={[
                styles.securityWarningBox,
                { backgroundColor: '#FF3B3015', borderColor: '#FF3B30' },
              ]}
            >
              <MaterialIcons
                name="warning"
                size={18}
                color="#FF3B30"
                style={{ marginRight: 8 }}
              />
              <Text
                style={[styles.securityWarningText, { color: colors.text }]}
              >
                If this wasn't you, please immediately contact{' '}
                <Text
                  style={{ color: colors.primary, fontWeight: 'bold' }}
                  onPress={() => Linking.openURL('mailto:support@icampus.com')}
                >
                  support@icampus.com
                </Text>
              </Text>
            </View>
          )}
          {isBtnVisible && (
            <CustomButton
              title="View Details"
              onPress={handleAction}
              iconName="arrow-forward"
              iconColor="#fff"
              style={{ width: 'auto' }}
            />
          )}
        </View>
      ) : (
        <EmptyState
          title="Notification not found, please retry."
          iconName="notifications-none"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexGrow: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 12,
    opacity: 0.7,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    opacity: 0.9,
  },
  payloadContainer: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  payloadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  payloadKey: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '600',
    flex: 1,
  },
  payloadValue: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  securityWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  securityWarningText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 120,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.7,
  },
});