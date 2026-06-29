import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAppSelector } from '../hooks/hooks';
import { markAllMessagesRead } from '../api/localPostApis';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { formatTime } from '../utils/ChatTimestampFormatter';
import { PageHeader } from '../components/PageHeader';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { UserIdentity } from '../components/UserIdentity';
import { getConversations } from '../api/localGetApis';
import { UserAvatar } from '../components/UserAvatar';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { UserTier } from '../types/firebase';

interface ConversationItem {
  id: string;
  organizationName?: string;
  otherUser: {
    uid: string;
    firstname: string;
    lastname: string;
    username?: string;
    tier: UserTier;
    profilePic?: string[];
    organizationName?: string;
  };
  lastMessage: {
    text?: string;
    senderId: string;
    status: 'sent' | 'delivered' | 'seen';
    timestamp: string;
    attachments?: Array<{ type: 'image' | 'file'; url: string }>;
  };
}
export const MessagesListScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const currentUser = useAppSelector(state => state.user);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'Unread'>('All');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const getMessagePreview = (message: ConversationItem['lastMessage']) => {
    if (message.text?.trim()) return message.text;
    if (message.attachments?.length) {
      return message.attachments[0].type === 'image'
        ? ' Sent an image'
        : ' Sent a document';
    }
    return 'New message';
  };

  const fetchConversationsData = useCallback(
    async (pageNum: number) => {
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
        console.error('[CONVERSATION_LIST_ERROR] Fetch failure:', err);
        Toast.show({
          type: 'error',
          text1: 'Fetch Error',
          text2: 'Failed to synchronize incoming messages.',
        });
      }
    },
    [currentUser.uid],
  );

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setLoading(true);
      fetchConversationsData(page + 1).finally(() => setLoading(false));
    }
  };
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchConversationsData(1);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchConversationsData(1).finally(() => setLoading(false));
    }, [fetchConversationsData]),
  );
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
        Toast.show({ type: 'success', text1: 'All messages marked as read.' });
      }
    } catch (err) {
      console.error('[CONVERSATION_MARK_READ_ERROR]', err);
    }
  };
  const displayedConversations = conversations.filter(c => {
    if (activeTab === 'Unread') {
      return (
        c.lastMessage.status !== 'seen' &&
        c.lastMessage.senderId !== currentUser.uid
      );
    }
    return true;
  });

  const renderItem = ({ item }: { item: ConversationItem }) => {
    const isUnread =
      item.lastMessage.senderId !== currentUser.uid &&
      item.lastMessage.status !== 'seen';
    return (
      <TouchableOpacity
        style={[
          styles.convoItem,
          {
            backgroundColor: isUnread
              ? colors.backgroundSecondary
              : colors.background,
          },
        ]}
        onPress={() =>
          navigation.navigate('ChatScreen', { recipientId: item.otherUser.uid })
        }
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <UserAvatar
            profilePic={item.otherUser?.profilePic}
            firstName={item.otherUser?.firstname}
            lastName={item.otherUser?.lastname}
            organizationName={item.organizationName}
            style={styles.avatar}
          />
          <UserIdentity
            firstname={item.otherUser.firstname}
            lastname={item.otherUser.lastname}
            tier={item.otherUser.tier}
            organizationName={item.otherUser.organizationName}
            size="medium"
            containerStyle={{ flex: 1, marginLeft: 10 }}
          />
          {isUnread && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.textContainer}>
          <Text
            numberOfLines={1}
            style={[
              styles.lastMsg,
              {
                color: isUnread ? colors.primary : colors.text,
                fontWeight: isUnread ? '600' : '400',
              },
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
              size={20}
              color={colors.btnTextColor}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        }
      />

      {/* Segmented Tab Row Controls */}
      <View
        style={[styles.tabBar, { backgroundColor: colors.backgroundSecondary }]}
      >
        {(['All', 'Unread'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === tab ? colors.primary : colors.text,
                  fontWeight: activeTab === tab ? '700' : '400',
                },
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.15}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              iconName="speaker-notes-off"
              title="No Messages Found"
              subtitle="Conversations will register here once initialized."
            />
          ) : null
        }
        ListFooterComponent={
          loading && !refreshing ? (
            <ActivityIndicator style={{ margin: 20 }} color={colors.primary} />
          ) : null
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
