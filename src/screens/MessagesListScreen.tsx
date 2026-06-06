import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAppSelector } from '../components/hooks';
import { markAllMessagesRead } from '../api/localPostApis';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { formatTime } from '../utils/ChatTimestampFormatter';
import { PageHeader } from '../components/PageHeader';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { UserIdentity } from '../components/UserIdentity';
import { getConversations } from '../api/localGetApis';
import { UserAvatar } from '../components/UserAvatar';
import { useTheme } from '../context/ThemeContext';

export const MessagesListScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'Unread'>('All');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const currentUser = useAppSelector(state => state.user);

  const getMessagePreview = (message: any) => {
    if (message.text && message.text.trim().length > 0) {
      return message.text;
    }
    if (message.attachments && message.attachments.length > 0) {
      const type = message.attachments[0].type || 'file';
      return type === 'image' ? 'Sent you an image' : 'Sent you a document';
    }
    return 'New message';
  };
  const markAllAsRead = async () => {
    try {
      const result = await markAllMessagesRead(currentUser.uid);
      if (result.success) {
        setConversations(prev =>
          prev.map(convo => ({
            ...convo,
            lastMessage: { ...convo.lastMessage, status: 'seen' },
          })),
        );
        Toast.show({ type: 'success', text1: 'All messages marked as read' });
      }
    } catch (err) {
      console.error(err);
    }
  };
  const fetchConversations = useCallback(
    async (pageNum: number) => {
      if (loading || (!hasMore && pageNum !== 1)) return;
      setLoading(true);
      try {
        const result = await getConversations(currentUser.uid, pageNum);
        if (result.success) {
          setConversations(prev =>
            pageNum === 1 ? result.data : [...prev, ...result.data],
          );
          setHasMore(result.hasMore);
          setPage(pageNum);
        }
      } catch (err) {
        console.error(err);
        Toast.show({
          type: 'error',
          text1: 'Fetch Error',
          text2: 'Failed to fetch messages',
        });
      } finally {
        setLoading(false);
      }
    },
    [loading, hasMore, currentUser.uid],
  );
  useEffect(() => {
    fetchConversations(1);
  }, [fetchConversations]);
  const displayedConversations =
    activeTab === 'Unread'
      ? conversations.filter(
          c =>
            c.lastMessage.status !== 'seen' &&
            c.lastMessage.senderId !== currentUser.uid,
        )
      : conversations;
  const renderItem = ({ item }: any) => {
    const isUnread =
      item.lastMessage.senderId !== currentUser.uid &&
      item.lastMessage.status !== 'seen';

    return (
      <TouchableOpacity
        style={[
          styles.convoItem,
          isUnread
            ? { backgroundColor: colors.backgroundSecondary }
            : { backgroundColor: colors.background },
        ]}
        onPress={() =>
          navigation.navigate('ChatScreen', { recipientId: item.otherUser.uid })
        }
      >
        <View style={styles.avatarContainer}>
          <UserAvatar
            profilePic={item.otherUser?.profilePic}
            firstName={item.otherUser?.firstname}
            lastName={item.otherUser.lastname}
            organizationName={item.organizationName}
            style={styles.avatar}
          />
          <UserIdentity
            firstname={item.otherUser.firstname}
            lastname={item.otherUser.lastname}
            tier={item.otherUser.tier}
            organizationName={item.otherUser.organizationName}
            size="medium"
            containerStyle={{ flex: 1 }}
          />
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        <View style={styles.textContainer}>
          <Text
            numberOfLines={1}
            style={[
              styles.lastMsg,
              isUnread ? { color: colors.primary } : { color: colors.text },
            ]}
          >
            {getMessagePreview(item.lastMessage)}
          </Text>
          <Text style={[styles.time, { color: colors.text }]}>
            {formatTime(item.lastMessage.timestamp)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Messages"
        rightElement={
          <TouchableOpacity
            onPress={markAllAsRead}
            style={[
              styles.rightElementBtn,
              { backgroundColor: colors.btnColor },
            ]}
          >
            <Text
              style={[
                styles.rightElementBtnText,
                { color: colors.btnTextColor },
              ]}
            >
              Mark All As Read
            </Text>
            <MaterialIcons
              name="done-all"
              size={24}
              color={colors.btnTextColor}
            />
          </TouchableOpacity>
        }
      />
      <View
        style={[styles.tabBar, { backgroundColor: colors.backgroundSecondary }]}
      >
        {['All', 'Unread'].map((tab: any) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab
                  ? { color: colors.primary }
                  : { color: colors.text },
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={displayedConversations}
        keyExtractor={item => item.otherUser.uid}
        renderItem={renderItem}
        onEndReached={() => fetchConversations(page + 1)}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <EmptyState
            iconName="speaker-notes-off"
            title="No Messages Found"
            subtitle="We couldn't find any messages for you."
          />
        }
        ListFooterComponent={
          loading ? <ActivityIndicator style={{ margin: 20 }} /> : null
        }
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  rightElementBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightElementBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
  convoItem: {
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: PRIMARY_COLOR_TINT,
    marginBottom: 10,
  },
  avatarContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  unreadDot: {
    position: 'absolute',
    right: 2,
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PRIMARY_COLOR,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boldText: {
    fontWeight: '800',
  },
  lastMsg: {
    fontSize: 14,
  },
  time: {
    fontSize: 12,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  tabItem: {
    alignContent: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    padding: 15,
    marginRight: 6,
  },
  activeTabItem: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});