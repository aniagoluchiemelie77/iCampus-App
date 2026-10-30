import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';
import { parseFirestoreDate } from '../utils/dateFormatter';

export const NotificationItem = ({
  item,
  handleNotificationPress,
}: {
  item: any;
  handleNotificationPress: (item: any) => void;
}) => {
  const { colors } = useTheme();
  const isWelcomeNotification = item.actionType === 'WELCOME_USER';
  const getIcon = () => {
    if (isWelcomeNotification) {
      return { name: 'celebration' };
    }

    switch (item.category) {
      case 'finance':
        return { name: 'account-balance' };
      case 'auth':
        return { name: 'security' };
      case 'store':
        return { name: 'shopping-cart' };
      case 'profile':
        return { name: 'account-circle' };
      case 'security':
        return { name: 'security' };
      case 'reminder':
      case 'classroom':
        return { name: 'school' };
      case 'social':
        return { name: 'people' };
      case 'subscription':
        return { name: 'verified' };
      default:
        return { name: 'notifications-on' };
    }
  };
  const iconConfig = getIcon();
  const formatNotificationMessage = (i: any) => {
    const { actionType, payload } = i;

    switch (actionType) {
      case 'PROFILE_VIEW':
        if (payload.othersCount > 0) {
          return `${payload.primaryUser} and ${payload.othersCount} others viewed your profile`;
        }
        return `${payload.primaryUser} viewed your profile`;

      case 'NEW_FOLLOWER':
        if (payload.othersCount > 0) {
          return `${payload.primaryUser} and ${payload.othersCount} others started following you`;
        }
        return `${payload.primaryUser} started following you`;

      case 'POST_LIKED':
        return payload.othersCount > 0
          ? `${payload.primaryUser} and ${payload.othersCount} others liked your post`
          : `${payload.primaryUser} liked your post`;

      case 'POST_MENTION':
        return payload.othersCount > 0
          ? `${payload.primaryUser} and ${payload.othersCount} mentioned you in their posts`
          : `${payload.primaryUser} mentioned you in a post`;

      case 'POST_COMMENTED':
        return payload.othersCount > 0
          ? `${payload.primaryUser} and ${payload.othersCount} others commented on your post`
          : `${payload.primaryUser} commented on your post`;

      case 'POST_REPOSTED':
        return payload.othersCount > 0
          ? `${payload.primaryUser} and ${payload.othersCount} others reshared on your post`
          : `${payload.primaryUser} reshared your post`;

      default:
        return item.message;
    }
  };
  const parsedDate = parseFirestoreDate(item?.createdAt);

  return (
    <TouchableOpacity
      onPress={handleNotificationPress}
      style={[
        styles.card,
        isWelcomeNotification
          ? {
              ...styles.welcomeCard,
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.primaryTint,
            }
          : !item.isRead
            ? { backgroundColor: '#fadccc' }
            : { backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          isWelcomeNotification && {
            ...styles.welcomeIconContainer,
            backgroundColor: colors.primary,
          },
        ]}
      >
        <MaterialIcons
          name={iconConfig.name}
          size={isWelcomeNotification ? 25 : 24}
          color={isWelcomeNotification ? '#fff' : colors.primary}
        />
      </View>

      <View style={styles.content}>
        {isWelcomeNotification && (
          <Text style={[styles.welcomeEyebrow, { color: colors.primary }]}>
            YOUR ACCOUNT IS READY
          </Text>
        )}
        <Text
          style={[
            styles.title,
            isWelcomeNotification && styles.welcomeTitle,
            { color: colors.text },
          ]}
          numberOfLines={isWelcomeNotification ? 2 : 1}
          ellipsizeMode="tail"
        >
          {item.title}
        </Text>
        <Text
          style={[styles.message, { color: colors.text }]}
          numberOfLines={isWelcomeNotification ? 3 : 1}
          ellipsizeMode="tail"
        >
          {formatNotificationMessage(item)}
        </Text>
        {Array.isArray(item.payload?.attachments) &&
        item.payload.attachments.length > 0 ? (
          <View style={styles.attachmentHint}>
            <MaterialIcons name="image" size={14} color={colors.primary} />
            <Text style={[styles.attachmentText, { color: colors.primary }]}>
              {item.payload.attachments.length === 1
                ? '1 attachment'
                : `${item.payload.attachments.length} attachments`}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.time, { color: colors.text }]}>
          {parsedDate
            ? dayjs(parsedDate).format('MMM D, YYYY • h:mm A')
            : 'Recent'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginBottom: 20,
    elevation: 1,
    padding: 15,
    alignItems: 'flex-start',
    borderRadius: 10,
  },
  iconContainer: { marginRight: 12, justifyContent: 'center' },
  welcomeCard: {
    borderWidth: 1,
    padding: 18,
    borderRadius: 16,
    elevation: 2,
  },
  welcomeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: { flex: 1 },
  attachmentHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  attachmentText: { fontSize: 12, fontWeight: '600' },
  title: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  welcomeEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  welcomeTitle: { fontSize: 17, marginBottom: 7 },
  time: { fontSize: 11 },
  message: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
});
