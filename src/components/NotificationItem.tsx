import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';

export const NotificationItem = ({
  item,
  handleNotificationPress,
}: {
  item: any;
  handleNotificationPress: (item: any) => void;
}) => {
  const { colors } = useTheme();
  const getIcon = () => {
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

  return (
    <TouchableOpacity
      onPress={handleNotificationPress}
      style={[
        styles.card,
        !item.isRead
          ? { backgroundColor: colors.backgroundSecondary }
          : { backgroundColor: colors.background },
      ]}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons
          name={iconConfig.name}
          size={24}
          color={colors.primary}
        />
      </View>

      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.title}
        </Text>
        <Text
          style={[styles.message, { color: colors.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {formatNotificationMessage(item)}
        </Text>
        <Text style={[styles.time, { color: colors.text }]}>
          {dayjs(item.createdAt).fromNow()}
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
  content: { flex: 1 },
  title: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  time: { fontSize: 11 },
  message: { fontSize: 12, marginBottom: 8 },
});