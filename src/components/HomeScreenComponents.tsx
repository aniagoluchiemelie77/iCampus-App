import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
  TouchableOpacity,
  Image,
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
  PRIMARY_COLOR,
  homeStyles,
  modalStyles,
} from '../assets/styles/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import toastConfig from './ToastConfig';
import Logo from '../assets/images/Logo.tsx';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import ExpandableFAB from './ExpandableFAB.tsx';
import { useSocket } from './socketContext.ts';
import { UserIdentity } from './UserIdentity.tsx';
import { fetchPostsAPI } from '../api/localGetApis.ts';
export const baseUrl = 'http://192.168.1.98:5000/';
import { useAppSelector } from '../components/hooks';
interface Props {
  navigation: StackNavigationProp<any>; // Replace 'any' with your ParamList if you have one
  initialCount?: number;
  uid?: string;
}
const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser: User; // Ideally use your User type here
  navigation: any;
}
const ProfileModal = ({
  visible,
  onClose,
  currentUser,
  navigation,
}: ProfileModalProps) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    {/* Dark Overlay to close the modal */}
    <TouchableOpacity
      activeOpacity={1}
      style={modalStyles.overlay}
      onPress={onClose}
    />

    <View style={modalStyles.drawer}>
      <TouchableOpacity
        style={modalStyles.userInfo}
        onPress={() =>
          navigation.navigate('ProfileScreen', { identifier: currentUser?.uid })
        }
      >
        <Image
          source={{
            uri:
              currentUser?.profilePic?.at(-1) ||
              'https://via.placeholder.com/40',
          }}
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
          <Text style={modalStyles.userSubtext}>{currentUser.headline}</Text>
        )}
      </TouchableOpacity>

      {/* 1. PERSONAL SECTION */}
      <TouchableOpacity
        style={modalStyles.item}
        onPress={() => {
          navigation.navigate('ICashDashboard', {
            refresh: true,
          });
        }}
      >
        <MaterialIcons
          name="account-balance-wallet-oulined"
          size={24}
          color="#333"
        />
        <Text style={modalStyles.itemText}>iCash</Text>
      </TouchableOpacity>

      {/* 2. SETTINGS SECTION */}
      <View style={modalStyles.separator} />

      <TouchableOpacity
        style={modalStyles.item}
        onPress={() => {
          onClose();
          //navigation.navigate('Subscription');
        }}
      >
        <MaterialIcons
          name="verified-outlined"
          size={24}
          color={PRIMARY_COLOR}
        />
        <Text style={modalStyles.itemText}>Manage Subscription</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={modalStyles.item}
        onPress={() => {
          onClose();
          navigation.navigate('Settings');
        }}
      >
        <MaterialIcons name="settings-outlined" size={24} color="#333" />
        <Text style={modalStyles.itemText}>Settings</Text>
      </TouchableOpacity>
    </View>
  </Modal>
);
export const NotificationBell: React.FC<Props> = ({
  navigation,
  initialCount = 0,
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
      style={[
        homeStyles.iconItem,
        HomeScreenComponentStyles.activityIcons,
        HomeScreenComponentStyles.activityIcons2,
        HomeScreenComponentStyles.notificationContainer,
      ]}
    >
      <MaterialIcons
        name="notifications-outlined"
        size={23}
        color={PRIMARY_COLOR}
      />

      {unreadCount > 0 && (
        <View style={HomeScreenComponentStyles.badge}>
          <Text style={HomeScreenComponentStyles.badgeText}>
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
        homeStyles.iconItem,
        HomeScreenComponentStyles.activityIcons,
        HomeScreenComponentStyles.activityIcons2,
        HomeScreenComponentStyles.notificationContainer,
        { marginLeft: 3 },
      ]}
    >
      <MaterialIcons name="chat-outlined" size={23} color={PRIMARY_COLOR} />
      {unreadCount > 0 && (
        <View style={HomeScreenComponentStyles.badge}>
          <Text style={HomeScreenComponentStyles.badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export function Home() {
  const { posts, setPosts, incrementImpression } = useAppDataContext();
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

    // B. Listen for STAT updates (Likes, Reposts, Bookmarks, Impressions)
    socket?.on('post_stats_updated', (data: { postId: string; stats: any }) => {
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post.postId === data.postId) {
            // --- HAPTIC LOGIC ---
            // 1. Check if this is a "Like" increase
            const isNewLike =
              data.stats.likes?.length > (post.likes?.length || 0);

            // 2. Check if the logged-in user is the author of this post
            const isMyPost = post.userId.uid === currentUser.uid;

            if (isNewLike && isMyPost) {
              // Trigger a "Impact Light" thump
              ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
            }
            // --------------------
            return {
              ...post,
              ...data.stats,
            };
          }
          return post;
        }),
      );
    });

    // C. CLEANUP: Very important to prevent memory leaks and duplicate listeners
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
        // Type defined here
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
      <View style={homeStyles.headerContainer}>
        <TouchableOpacity onPress={() => setProfilePopupVisible(true)}>
          <Image
            source={{
              uri:
                currentUser?.profilePic?.at(-1) ||
                'https://via.placeholder.com/40',
            }}
            style={homeStyles.headerProfilePic}
          />
        </TouchableOpacity>
        <Logo />
        <View style={homeStyles.headerContainerDiv}>
          <NotificationBell navigation={navigation} initialCount={0} />
          <MessageBell
            navigation={navigation}
            initialCount={0}
            uid={currentUser.uid}
          />
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item.postId}
        renderItem={({ item }) => (
          <PostCard post={item} isVisible={item.postId === activePostId} />
        )}
        // Interaction Props
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        // Pagination Props
        onEndReached={() => loadPosts(false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ margin: 20 }} /> : null
        }
        // Refresh Props
        refreshing={refreshing}
        onRefresh={() => loadPosts(true)}
        // Performance Optimization
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
      {/* 3. UPDATED FAB LOGIC */}
      {!isFabMenuVisible && (
        <TouchableOpacity
          style={homeStyles.fab}
          onPress={() => setFabMenuVisible(true)}
        >
          <MaterialIcons name="widgets-outlined" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* 4. EXPANDABLE MENU MODAL */}
      <ExpandableFAB
        isVisible={isFabMenuVisible}
        onClose={toggleFab}
        userRole={currentUser.usertype as 'student' | 'lecturer' | 'otherUser'}
        actions={['iCash', 'Create Post', 'Create Poll', 'iAssistant']}
      />

      {/* 4. PROFILE POPUP (LinkedIn Style Modal) */}
      <ProfileModal
        visible={isProfilePopupVisible}
        onClose={() => setProfilePopupVisible(false)}
        currentUser={currentUser}
        navigation={navigation}
      />
      <Toast config={toastConfig} />
    </View>
  );
}


