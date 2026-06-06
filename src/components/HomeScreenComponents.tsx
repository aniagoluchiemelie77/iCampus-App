import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ViewToken,
} from 'react-native';
import { PostCard } from './PostCard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDataContext } from './EventContext';
import type { User, Posts } from '../types/firebase';
import {
  HomeScreenComponentStyles,
  homeStyles,
  modalStyles,
} from '../assets/styles/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import Logo from '../assets/images/Logo.tsx';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import ExpandableFAB from './ExpandableFAB.tsx';
import { useSocket } from './socketContext.ts';
import { UserIdentity } from './UserIdentity.tsx';
import { fetchPostsAPI } from '../api/localGetApis.ts';
import { UserAvatar } from './UserAvatar.tsx';
export const baseUrl = 'http://192.168.1.98:5000/';
import { useAppSelector } from '../components/hooks';
import { useTheme } from 'context/ThemeContext.tsx';

interface Props {
  navigation: StackNavigationProp<any>;
  initialCount?: number;
  uid?: string;
  colors: any;
}
const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: User;
  navigation: any;
  colors: any;
}
const ProfileModal = ({
  visible,
  onClose,
  currentUser,
  navigation,
  colors,
}: ProfileModalProps) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <TouchableOpacity
      activeOpacity={1}
      style={modalStyles.overlay}
      onPress={onClose}
    />

    <View
      style={[
        modalStyles.drawer,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <TouchableOpacity
        style={modalStyles.userInfo}
        onPress={() =>
          navigation.navigate('ProfileScreen', { identifier: currentUser?.uid })
        }
      >
        <UserAvatar
          profilePic={currentUser?.profilePic}
          firstName={currentUser.firstname!}
          lastName={currentUser.lastname!}
          organizationName={currentUser?.organizationName}
          style={modalStyles.largeAvatar}
        />
        <UserIdentity
          firstname={currentUser.firstname!}
          lastname={currentUser.lastname!}
          username={currentUser.username}
          tier={currentUser?.tier || 'free'}
          isVerified={currentUser?.isVerified}
          size="medium"
          isOrganization={currentUser?.usertype === 'enterprise'}
          organizationName={currentUser?.organizationName}
        />
        {currentUser.headline && (
          <Text style={[modalStyles.userSubtext, { color: colors.textDarker }]}>
            {currentUser.headline}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={modalStyles.item}
        onPress={() => {
          onClose();
          navigation.navigate('ICashDashboard', {
            refresh: true,
          });
        }}
      >
        <MaterialIcons
          name="account-balance-wallet"
          size={24}
          color={colors.text}
        />
        <Text style={[modalStyles.itemText, { color: colors.text }]}>
          iCash
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={modalStyles.item}
        onPress={() => {
          onClose();
          navigation.navigate('SalesHub');
        }}
      >
        <MaterialIcons
          name="store-front-outlined"
          size={24}
          color={colors.text}
        />
        <Text style={[modalStyles.itemText, { color: colors.text }]}>
          Sales Hub
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={modalStyles.item}
        onPress={() => {
          onClose();
          navigation.navigate('DownloadsScreen');
        }}
      >
        <MaterialIcons name="folder-special" size={24} color={colors.text} />
        <Text style={[modalStyles.itemText, { color: colors.text }]}>
          My Downloads
        </Text>
      </TouchableOpacity>

      {/* 2. SETTINGS SECTION */}
      <View style={modalStyles.separator} />

      <TouchableOpacity
        style={modalStyles.item}
        onPress={() => {
          onClose();
          navigation.navigate('Subscription');
        }}
      >
        <MaterialIcons name="verified-outlined" size={24} color={colors.text} />
        <Text style={[modalStyles.itemText, { color: colors.text }]}>
          Manage Subscription
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={modalStyles.item}
        onPress={() => {
          onClose();
          navigation.navigate('Settings');
        }}
      >
        <MaterialIcons name="settings-outlined" size={24} color={colors.text} />
        <Text style={[modalStyles.itemText, { color: colors.text }]}>
          Settings
        </Text>
      </TouchableOpacity>
    </View>
  </Modal>
);
export const NotificationBell: React.FC<Props> = ({
  navigation,
  initialCount = 0,
  colors,
}) => {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const socketContext = useSocket();
  const socket = socketContext?.socket;

  useEffect(() => {
    if (!socket) return;
    const handleNotification = (_data: any) => {
      setUnreadCount(prev => prev + 1);
    };
    socket.on('new_notification', handleNotification);
    return () => {
      socket.off('new_notification', handleNotification);
    };
  }, [socket]);

  return (
    <TouchableOpacity
      onPress={() => {
        setUnreadCount(0);
        navigation.navigate('Notifications');
      }}
      style={[HomeScreenComponentStyles.notificationContainer]}
    >
      <MaterialIcons
        name="notifications-outlined"
        size={23}
        color={colors.primary}
      />

      {unreadCount > 0 && (
        <View
          style={[
            HomeScreenComponentStyles.badge,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              HomeScreenComponentStyles.badgeText,
              { color: colors.btnTextColor },
            ]}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
export const MessageBell: React.FC<Props> = ({
  navigation,
  initialCount = 0,
  uid,
  colors,
}) => {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  useEffect(() => {
    if (!socket) return;
    const handleNewMsg = (data: any) => {
      if (data.senderId !== uid) {
        setUnreadCount(prev => prev + 1);
      }
    };
    socket.on('receive_message', handleNewMsg);
    return () => {
      socket.off('receive_message', handleNewMsg);
    };
  }, [socket, uid]);

  return (
    <TouchableOpacity
      onPress={() => {
        setUnreadCount(0);
        navigation.navigate('MessagesList');
      }}
      style={[
        HomeScreenComponentStyles.notificationContainer,
        { marginLeft: 3 },
      ]}
    >
      <MaterialIcons name="chat-outlined" size={23} color={colors.primary} />
      {unreadCount > 0 && (
        <View
          style={[
            HomeScreenComponentStyles.badge,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              HomeScreenComponentStyles.badgeText,
              { color: colors.btnTextColor },
            ]}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export function Home() {
  const { posts, setPosts, incrementImpression } = useAppDataContext();
  const { colors } = useTheme();
  const currentUser = useAppSelector(state => state.user);
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFabMenuVisible, setFabMenuVisible] = useState(false);
  const [isProfilePopupVisible, setProfilePopupVisible] = useState(false);
  const navigation = useNavigation<any>();
  const toggleFab = () => setFabMenuVisible(!isFabMenuVisible);
  const loadPosts = useCallback(
    async (isRefreshing = false) => {
      if (loadingMore || (refreshing && !isRefreshing)) return;
      const currentCursor = isRefreshing ? '' : cursor || '';
      if (!isRefreshing && cursor === null && posts.length > 0) return;

      if (isRefreshing) setRefreshing(true);
      else setLoadingMore(true);

      try {
        const response = await fetchPostsAPI(10, currentCursor);
        if (response && response.success) {
          setPosts(prev =>
            isRefreshing ? response.posts : [...prev, ...response.posts],
          );
          setCursor(response.nextCursor);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Fetch Error',
            text2: response.message || 'Something went wrong',
          });
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [cursor, loadingMore, refreshing, posts.length, setPosts],
  );
  useEffect(() => {
    loadPosts(true);
  }, [loadPosts]);
  useEffect(() => {
    socket?.on('new_post', (newPost: Posts) => {
      setPosts(prevPosts => {
        if (prevPosts.find(p => p.postId === newPost.postId)) return prevPosts;
        return [newPost, ...prevPosts];
      });
    });
    socket?.on('post_stats_updated', (data: { postId: string; stats: any }) => {
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.postId === data.postId) {
            const isNewLike =
              data.stats.likes?.length > (post.likes?.length || 0);

            const isMyPost = post.userId.uid === currentUser.uid;

            if (isNewLike && isMyPost) {
              ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
            }
            return {
              ...post,
              ...data.stats,
            };
          }
          return post;
        }),
      );
    });
    return () => {
      socket?.off('new_post');
      socket?.off('post_stats_updated');
    };
  }, [setPosts, currentUser.uid, socket]);
  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
      changed,
    }: {
      viewableItems: ViewToken[];
      changed: ViewToken[];
    }) => {
      changed.forEach((viewToken: ViewToken) => {
        if (viewToken.isViewable && viewToken.item) {
          incrementImpression(viewToken.item.postId);
        }
      });
      if (viewableItems.length > 0 && viewableItems[0].item) {
        setActivePostId(viewableItems[0].item.postId);
      }
    },
  ).current;
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  return (
    <View style={homeStyles.mainWrapper}>
      <View
        style={[
          homeStyles.headerContainer,
          {
            backgroundColor: colors.backgroundSecondary,
          },
        ]}
      >
        <TouchableOpacity onPress={() => setProfilePopupVisible(true)}>
          <UserAvatar
            profilePic={currentUser?.profilePic}
            firstName={currentUser?.firstname}
            lastName={currentUser?.lastname}
            organizationName={currentUser?.organizationName}
            style={homeStyles.headerProfilePic}
          />
        </TouchableOpacity>
        <Logo />
        <View style={homeStyles.headerContainerDiv}>
          <NotificationBell
            navigation={navigation}
            initialCount={0}
            colors={colors}
          />
          <MessageBell
            navigation={navigation}
            initialCount={0}
            uid={currentUser.uid}
            colors={colors}
          />
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item.postId}
        renderItem={({ item }) => (
          <PostCard post={item} isVisible={item.postId === activePostId} />
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={() => loadPosts(false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ margin: 20 }} color={colors.primary} />
          ) : null
        }
        refreshing={refreshing}
        onRefresh={() => loadPosts(true)}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
      {!isFabMenuVisible && (
        <TouchableOpacity
          style={homeStyles.fab}
          onPress={() => setFabMenuVisible(true)}
        >
          <MaterialIcons name="widgets-outlined" size={28} color="#fff" />
        </TouchableOpacity>
      )}
      <ExpandableFAB
        isVisible={isFabMenuVisible}
        onClose={toggleFab}
        userRole={currentUser.usertype as 'student' | 'lecturer' | 'otherUser'}
        actions={['iCash', 'Create Post', 'Create Poll', 'iAssistant']}
      />

      <ProfileModal
        visible={isProfilePopupVisible}
        onClose={() => setProfilePopupVisible(false)}
        currentUser={currentUser}
        navigation={navigation}
        colors={colors}
      />
    </View>
  );
}


