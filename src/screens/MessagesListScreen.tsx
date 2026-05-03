import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import Toast from 'react-native-toast-message';
import toastConfig from '@components/ToastConfig';
import { useAppSelector } from '../components/hooks';
import { markAllMessagesRead } from '../api/localPostApis';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { formatTime } from '../utils/ChatTimestampFormatter';
import { PageHeader } from '../components/PageHeader';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { UserIdentity } from '../components/UserIdentity';
import { getConversations } from '../api/localGetApis';

export const MessagesListScreen = ({ navigation }: any) => {
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
        style={[styles.convoItem, isUnread && styles.unreadBackground]}
        onPress={() =>
          navigation.navigate('ChatScreen', { recipientId: item.otherUser.uid })
        }
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                item.otherUser.profilePic?.at(-1) ||
                'https://via.placeholder.com/50',
            }}
            style={styles.avatar}
          />
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        <View style={styles.textContainer}>
          <View style={styles.row}>
            <UserIdentity
              firstname={item.otherUser.firstname}
              lastname={item.otherUser.lastname}
              tier={item.otherUser.tier}
              organizationName={item.otherUser.organizationName}
              size="medium"
              containerStyle={{ flex: 1 }}
            />
            <Text style={styles.time}>
              {formatTime(item.lastMessage.timestamp)}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={[styles.lastMsg, isUnread && styles.unreadText]}
          >
            {getMessagePreview(item.lastMessage)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageHeader
        title="Messages"
        rightElement={
          <TouchableOpacity onPress={markAllAsRead}>
            <MaterialIcons name="done-all" size={24} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        }
      />
      <View style={styles.tabBar}>
        {['All', 'Unread'].map((tab: any) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
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
      <Toast config={toastConfig} />
    </View>
  );
};
const styles = StyleSheet.create({
  convoItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: PRIMARY_COLOR_TINT,
    backgroundColor: '#fff',
    alignItems: 'center',
    marginBottom: 8,
  },
  unreadBackground: {
    backgroundColor: '#fadccc', // Very subtle tint for unread
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
  },
  unreadDot: {
    position: 'absolute',
    right: 2,
    top: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PRIMARY_COLOR,
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  boldText: {
    fontWeight: '800',
  },
  lastMsg: {
    fontSize: 14,
    color: '#222',
  },
  unreadText: {
    color: '#222',
    fontWeight: '600',
  },
  time: {
    fontSize: 11,
    color: PRIMARY_COLOR_TINT,
    marginLeft: 5,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    padding: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
  },
  activeTabItem: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    color: '#2222',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
});