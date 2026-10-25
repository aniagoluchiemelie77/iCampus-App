import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Linking,
  useWindowDimensions,
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

const HIDDEN_PAYLOAD_KEYS = new Set([
  'primaryuser',
  'otherscount',
  'unreadcount',
]);

export default function NotificationDetails() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<any, 'NotificationDetails'>>();
  const { notificationId, notification: passedNotification } =
    route.params || {};
  const isCompact = width < 600;

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
  const payload =
    notification?.payload && typeof notification.payload === 'object'
      ? notification.payload
      : {};
  const payloadEntries = Object.entries(payload).filter(([key, value]) => {
    return (
      !HIDDEN_PAYLOAD_KEYS.has(key.toLowerCase()) &&
      key.toLowerCase() !== 'pdfurl' &&
      value !== null &&
      typeof value !== 'object' &&
      String(value).trim() !== ''
    );
  });

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingHorizontal: isCompact ? 16 : 32,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageContent}>
        <PageHeader title="Notification Detail" />
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : notification ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
                padding: isCompact ? 20 : 32,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: colors.primary + '18' },
                  ]}
                >
                  <MaterialIcons
                    name={getCategoryIcon(notification.category)}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {notification.category
                      ? notification.category
                          .replace(/([A-Z])/g, ' $1')
                          .toUpperCase()
                      : 'GENERAL'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.readBadge,
                    {
                      backgroundColor: notification.isRead
                        ? colors.background
                        : colors.primary + '18',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.readDot,
                      {
                        backgroundColor: notification.isRead
                          ? colors.textDarker
                          : colors.primary,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.readBadgeText,
                      {
                        color: notification.isRead
                          ? colors.textDarker
                          : colors.primary,
                      },
                    ]}
                  >
                    {notification.isRead ? 'Read' : 'Unread'}
                  </Text>
                </View>
              </View>
              <View style={styles.dateRow}>
                <MaterialIcons
                  name="schedule"
                  size={16}
                  color={colors.textDarker}
                />
                <Text style={[styles.timeText, { color: colors.textDarker }]}>
                  {parsedDate
                    ? dayjs(parsedDate).format('MMM D, YYYY · h:mm A')
                    : 'Recent'}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.title,
                { color: colors.text, fontSize: isCompact ? 24 : 30 },
              ]}
            >
              {notification.title}
            </Text>
            <Text style={[styles.message, { color: colors.text }]}>
              {notification.message}
            </Text>

            {payloadEntries.length > 0 && (
              <View
                style={[
                  styles.payloadContainer,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.detailsHeading, { color: colors.text }]}>
                  More details
                </Text>
                {payloadEntries.map(([key, value], index) => {
                  return (
                    <View
                      key={key}
                      style={[
                        styles.payloadRow,
                        {
                          borderBottomColor: colors.border,
                          borderBottomWidth:
                            index === payloadEntries.length - 1
                              ? 0
                              : StyleSheet.hairlineWidth,
                          flexDirection: isCompact ? 'column' : 'row',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.payloadKey,
                          { color: colors.textDarker },
                        ]}
                      >
                        {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                      </Text>
                      <Text
                        style={[
                          styles.payloadValue,
                          {
                            color: colors.text,
                            textAlign: isCompact ? 'left' : 'right',
                          },
                        ]}
                      >
                        {String(value)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {isSecurityAlert && (
              <View
                style={[
                  styles.securityWarningBox,
                  { backgroundColor: '#FF3B3015', borderColor: '#FF3B30' },
                ]}
              >
                <MaterialIcons
                  name="warning"
                  size={20}
                  color="#FF3B30"
                  style={styles.warningIcon}
                />
                <Text
                  style={[styles.securityWarningText, { color: colors.text }]}
                >
                  If this wasn't you, please immediately contact{' '}
                  <Text
                    style={{ color: colors.primary, fontWeight: 'bold' }}
                    onPress={() =>
                      Linking.openURL('mailto:support@icampus.com')
                    }
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
                style={styles.actionButton}
              />
            )}
          </View>
        ) : (
          <EmptyState
            title="Notification not found, please retry."
            iconName="notifications-none"
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 40,
  },
  pageContent: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
  },
  loaderContainer: {
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 26,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
  },
  readDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  readBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 7,
  },
  timeText: {
    fontSize: 13,
    opacity: 0.7,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 24,
    opacity: 0.92,
  },
  payloadContainer: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  detailsHeading: {
    fontSize: 15,
    fontWeight: '700',
    paddingTop: 10,
    paddingBottom: 4,
  },
  payloadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 13,
  },
  payloadKey: {
    fontSize: 12,
    opacity: 0.75,
    fontWeight: '600',
    flex: 0.9,
    textTransform: 'capitalize',
  },
  payloadValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
    overflow: 'hidden',
  },
  securityWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  warningIcon: {
    marginRight: 10,
  },
  securityWarningText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 21,
  },
  actionButton: {
    width: 'auto',
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
    borderRadius: 14,
  },
});
