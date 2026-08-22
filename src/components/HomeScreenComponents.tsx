import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ViewToken,
  useWindowDimensions,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { PostCard } from './PostCard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDataContext } from '../context/EventContext.tsx';
import type { User, Posts } from '../types/firebase';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT_MAIN,
  PRIMARY_COLOR_TINT,
} from '../assets/styles/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import Logo from '../assets/images/Logo.tsx';
import ExpandableFAB from './ExpandableFAB.tsx';
import { UserIdentity } from './UserIdentity.tsx';
import { fetchPostsAPI } from '../api/localGetApis.ts';
import { UserAvatar } from './UserAvatar.tsx';
import { useAppSelector } from '../hooks/hooks.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import { useSocketConnection } from '../hooks/useSocket';
import { getAds } from '../api/localGetApis';
import AdBanner from './AdsBanner';
import { AdItem } from '../types/firebase';

import { BACKEND_URL } from '@env';
export const baseUrl = BACKEND_URL;
interface Props {
  navigation: StackNavigationProp<any>;
  initialCount?: number;
  uid?: string;
  colors: any;
  socket: any;
}

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
}: ProfileModalProps) => {
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  useEffect(() => {
    const fetchAdvertisements = async () => {
      setLoadingAds(true);
      const result = await getAds();
      if (result.success) {
        setAds(result.data);
      }
      setLoadingAds(false);
    };

    fetchAdvertisements();
  }, []);
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.overlay}
        onPress={onClose}
      />

      <View
        style={[
          styles.drawer,
          isLargeScreen ? styles.desktopDrawer : styles.mobileDrawer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() =>
              navigation.navigate('ProfileScreen', {
                identifier: currentUser?.uid,
              })
            }
          >
            <UserAvatar
              profilePic={currentUser?.profilePic}
              firstName={currentUser.firstname!}
              lastName={currentUser.lastname!}
              organizationName={currentUser?.organizationName}
              style={styles.largeAvatar}
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
              <Text style={[styles.userSubtext, { color: colors.textDarker }]}>
                {currentUser.headline}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.item}
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
            <Text style={[styles.itemText, { color: colors.text }]}>iCash</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onClose();
              navigation.navigate('SalesHub');
            }}
          >
            <MaterialIcons name="storefront" size={24} color={colors.text} />
            <Text style={[styles.itemText, { color: colors.text }]}>
              Sales Hub
            </Text>
          </TouchableOpacity>

          {/* 2. SETTINGS SECTION */}
          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onClose();
              navigation.navigate('Subscription');
            }}
          >
            <MaterialIcons name="verified" size={24} color={colors.text} />
            <Text style={[styles.itemText, { color: colors.text }]}>
              Manage Subscription
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onClose();
              navigation.navigate('Settings');
            }}
          >
            <MaterialIcons name="settings" size={24} color={colors.text} />
            <Text style={[styles.itemText, { color: colors.text }]}>
              Settings
            </Text>
          </TouchableOpacity>
          {!loadingAds && ads.length > 0 && <AdBanner ads={ads} />}
        </ScrollView>
      </View>
    </Modal>
  );
};
export const NotificationBell: React.FC<Props> = ({
  navigation,
  initialCount = 0,
  colors,
  socket,
}) => {
  const [unreadCount, setUnreadCount] = useState(initialCount);

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
      style={[styles.notificationContainer]}
    >
      <MaterialIcons name="notifications" size={23} color={colors.primary} />

      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.badgeText, { color: colors.btnTextColor }]}>
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
  const flatListRef = useRef<FlatList<Posts>>(null);
  const currentUser = useAppSelector(state => state.user);
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const socket = useSocketConnection({
    baseUrl,
    userId: currentUser?.uid,
  });
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isFabMenuVisible, setFabMenuVisible] = useState(false);
  const [isProfilePopupVisible, setProfilePopupVisible] = useState(false);
  const [pendingPosts, setPendingPosts] = useState<Posts[]>([]);
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
    const currentSocket = socket?.current;
    if (!currentSocket) return;

    currentSocket.on('new_post', (newPost: Posts) => {
      setPendingPosts(prev => {
        if (prev.find(p => p.postId === newPost.postId)) return prev;
        return [newPost, ...prev];
      });
    });

    currentSocket.on(
      'post_stats_updated',
      (data: { postId: string; stats: any }) => {
        setPosts(prevPosts =>
          prevPosts.map(post => {
            if (post.postId === data.postId) {
              return {
                ...post,
                ...(data.stats || {}),
              };
            }
            return post;
          }),
        );
      },
    );

    return () => {
      currentSocket.off('new_post');
      currentSocket.off('post_stats_updated');
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
  const showNewPosts = () => {
    setPosts(prev => [...pendingPosts, ...prev]);
    setPendingPosts([]);
    flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
  };
  const isModalVisible = isLargeScreen ? true : isProfilePopupVisible;
  return (
    <View style={styles.mainWrapper}>
      <View
        style={[
          styles.headerContainer,
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
            style={styles.headerProfilePic}
          />
        </TouchableOpacity>
        <Logo />
        <View style={styles.headerContainerDiv}>
          <NotificationBell
            navigation={navigation}
            initialCount={0}
            colors={colors}
            socket={socket}
          />
        </View>
      </View>
      <View style={styles.postsDiv}>
        {pendingPosts.length > 0 && (
          <TouchableOpacity
            style={[
              styles.newPostsBanner,
              { backgroundColor: colors.btnColor },
            ]}
            onPress={showNewPosts}
          >
            <Text style={[styles.newPostsText, { color: colors.btnTextColor }]}>
              {pendingPosts.length} New Post{pendingPosts.length > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )}
        <FlatList
          ref={flatListRef}
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
              <ActivityIndicator
                style={{ margin: 20 }}
                color={colors.primary}
              />
            ) : null
          }
          refreshing={refreshing}
          onRefresh={() => loadPosts(true)}
          removeClippedSubviews={true}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      </View>
      {!isFabMenuVisible && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setFabMenuVisible(true)}
        >
          <MaterialIcons name="widgets" size={28} color={colors.btnTextColor} />
        </TouchableOpacity>
      )}
      <ExpandableFAB
        isVisible={isFabMenuVisible}
        onClose={toggleFab}
        userRole={currentUser.usertype as 'student' | 'lecturer' | 'otherUser'}
        actions={[
          'Create Post',
          'Create Poll',
          'Post Job',
          'Create Event',
          'iCash',
          'iAssistant',
        ]}
      />

      <ProfileModal
        visible={isModalVisible}
        onClose={() => setProfilePopupVisible(false)}
        currentUser={currentUser}
        navigation={navigation}
        colors={colors}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    paddingHorizontal: 15,
  },
  headerContainerDiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerProfilePic: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: -15,
    marginBottom: 15,
  },
  postsDiv: {
    position: 'relative',
  },
  topHeader: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  newPostsBanner: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 100,
    elevation: 5,
  },
  topHeader3: {
    backgroundColor: 'inherit',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  welcomeHeader: {
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  welcomeText: {
    marginLeft: 5,
    fontSize: 19,
    fontWeight: 800,
  },
  welcomeText2c: {
    fontSize: 18,
    fontWeight: 700,
    color: PRIMARY_COLOR,
  },
  welcomeText2b: {
    fontSize: 18,
    fontWeight: 700,
    color: '#222',
    width: '100%',
    paddingBottom: 7,
  },
  avatar: {
    height: 60,
    width: 60,
    borderRadius: 30,
    borderColor: PRIMARY_COLOR, // Your preferred border color
    backgroundColor: '#fff',
    borderWidth: 2,
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  activityDiv: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    width: '93%',
    height: 'auto',
    borderRadius: 15,
    flex: 1,
    margin: 7,
  },
  newPostsText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  activityDivHeader: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1, // thickness of the border
    borderBottomColor: '#222',
  },
  activityDivHeaderText: {
    fontSize: 17,
    fontWeight: 800,
  },
  activityIconsDiv: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
    width: '100%',
    flexWrap: 'wrap',
  },
  storeCategoriesDiv: {
    padding: 8,
    alignItems: 'center',
    height: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  storeCategoriesDivSubdiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItem2: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  tabLabel2: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
    backgroundColor: '#fff',
  },
  notificationContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  blurBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  popupContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '80%',
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  popupContent: {
    paddingBottom: 100,
  },
  popupContent2: {
    paddingTop: 5,
    paddingHorizontal: 10,
    width: '100%',
    marginVertical: 10,
    height: '100%',
  },
  clearCartDiv: {
    width: '100%',
    paddingTop: 0,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  clearCartBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    width: 'auto',
  },
  clearCartText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  viewCartItems: {
    padding: 10,
    width: '85%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#717070ff',
  },
  iconWrapper: { position: 'relative', marginRight: 16 },
  iconSubdiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSubdiv2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  activityIconsb: {
    padding: 10,
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  activityIcons3: {
    padding: 8,
  },
  activityIcons2b: {
    borderRadius: '50%',
  },
  storeHeaderText: {
    fontWeight: '700',
    fontSize: 17,
    color: '#e94d0aff',
    maxWidth: '70%',
  },
  searchContainer: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 15,
    paddingHorizontal: 10,
    height: 42,
    marginBottom: 10,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#222',
  },
  searchInput: {
    padding: 10,
    backgroundColor: 'inherit',
    borderRadius: 15,
    paddingHorizontal: 12,
    borderWidth: 1,
    width: '82%',
    borderColor: '#838181ff',
    color: '#222',
  },
  container: {
    width: 'auto',
  },
  activityDivContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  searchIcon: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  iconText: {
    fontSize: 24,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // blurred effect
    justifyContent: 'flex-start',
  },
  overlay2: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // blurred effect
    justifyContent: 'flex-end',
  },
  overlayRight: {
    backgroundColor: 'rgba(0,0,0,0.6)', // blurred effect
    justifyContent: 'flex-end',
    position: 'relative',
    top: 0,
    right: 0,
  },
  popup: {
    top: 0,
    left: 0,
    width: '90%',
    minHeight: '100%',
    padding: 15,
    backgroundColor: '#eee',
    borderRadius: 12,
    elevation: 5,
    alignItems: 'center',
    position: 'relative',
  },
  popupCenter2: {
    width: '85%',
    maxHeight: '80%',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 5,
    alignItems: 'center',
  },
  popupCenterSmall: {
    width: '40%',
    padding: 15,
    backgroundColor: '#eee',
    borderRadius: 12,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupBottom: {
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '90%',
    backgroundColor: '#eee',
    borderRadius: 12,
    elevation: 5,
    alignItems: 'center',
    position: 'relative',
  },
  popupRight: {
    top: 0,
    right: 0,
    width: '80%',
    minHeight: '100%',
    padding: 15,
    backgroundColor: '#eee',
    borderRadius: 12,
    elevation: 5,
    alignItems: 'center',
    position: 'absolute',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  cancelIcon: {
    alignSelf: 'flex-end',
    width: 'auto',
  },
  CaddIcon: {
    bottom: 20,
    right: 15,
    position: 'absolute',
  },
  avatarProfile: {
    width: '100%', // spans full width of parent
    height: '100%', // adjust as needed
    resizeMode: 'contain',
  },
  profileImgDiv: {
    minWidth: '100%', // spans full width of parent
    height: 280,
    position: 'relative',
  },
  profileImgDivText: {
    bottom: 10, // spans full width of parent
    left: 10,
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    position: 'absolute', // adjust as neede
  },
  eventsContainer: {
    width: '100%',
    paddingVertical: 5,
    flex: 1,
    position: 'relative',
  },
  backToTodayButton: {
    bottom: 5,
    alignSelf: 'center',
    position: 'absolute',
  },
  eventCardOuterWidth: {
    maxWidth: '90%',
    backgroundColor: '#fff',
    height: 110,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    padding: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayBorderHighlight: {
    borderWidth: 1,
    borderColor: PRIMARY_COLOR, // bright orange
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventMetaText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#333',
  },
  todayIndicator: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  todayIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventsContainer2: {
    width: '100%',
    paddingVertical: 5,
    alignItems: 'center',
  },
  eventsDiv: {
    justifyContent: 'center',
  },
  eventVisibilityDiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventVisibilityDiv2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    alignSelf: 'flex-start',
  },
  eventVisibilityDiv3: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  eventVisibilityText: {
    fontSize: 11,
    color: 'gray',
  },
  eventCard: {
    paddingVertical: 8,
    marginVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '95%',
    backgroundColor: '#fff',
  },
  eventTitle: {
    color: '#fff',
    padding: 5,
    fontSize: 12,
    alignSelf: 'flex-start',
    borderRadius: 5,
    fontWeight: '600',
    maxWidth: '90%',
  },
  eventDate: {
    fontSize: 11,
    color: 'gray',
  },
  eventDate2: {
    marginTop: 4,
    fontSize: 11,
    color: 'gray',
  },
  eventLocationDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    width: '100%',
    paddingVertical: 5,
  },
  eventLocation: {
    marginLeft: 2,
    alignSelf: 'flex-start',
  },
  eventDescription: {
    color: '#222',
    fontWeight: '700',
    paddingVertical: 4,
    maxWidth: '80%',
  },
  eventDescription2: {
    color: '#222',
    fontWeight: '700',
    paddingVertical: 5,
    width: '100%',
  },
  eventCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 3,
  },
  lectureType: {
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    padding: 3,
    borderRadius: 5,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  productList: {
    marginVertical: 2,
    paddingBottom: 10,
    width: '100%',
  },
  productCard: {
    flexBasis: '46%',
    margin: 6,
    borderRadius: 10,
    height: 270,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#eee',
    overflow: 'hidden',
  },
  productImage: {
    height: '100%',
    width: '100%',
    borderRadius: 10,
    aspectRatio: 1, // keeps image square regardless of source size
    resizeMode: 'cover',
  },
  productImageDiv: {
    height: 170,
    borderRadius: 10,
    position: 'relative',
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center', // center the image horizontally
    justifyContent: 'center',
  },
  productTitle: {
    paddingHorizontal: 8,
    paddingVertical: 11,
    width: '100%',
    fontWeight: '700',
    color: '#222',
    fontSize: 13,
    marginTop: 5,
  },
  productPriceDiv: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: PRIMARY_COLOR,
  },
  productPriceDiv2: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
  },
  productPrice: {
    fontWeight: '600',
    marginLeft: 3,
    fontSize: 13,
    color: '#eee',
  },
  productPrice2: {
    fontWeight: '600',
    marginLeft: 3,
    fontSize: 13,
    color: '#222',
  },
  pagination: {
    width: '50%',
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    marginVertical: 10,
    borderRadius: 15,
    justifyContent: 'space-between',
  },
  paginationMainText: {
    fontWeight: '700',
    color: PRIMARY_COLOR,
    fontSize: 17,
  },
  paginationText: {
    fontWeight: '700',
  },
  Add2CartBtn: {
    width: '80%',
    padding: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  Add2CartBtnText: {
    fontWeight: '700',
  },
  cartItemLeftDiv: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    zIndex: 2,
  },
  cartItemRightDiv: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    flex: 1,
  },
  hiddenRow: {
    backgroundColor: PRIMARY_COLOR,
    padding: 10,
    alignItems: 'center',
    width: '100%',
    height: 90,
    flexDirection: 'row',
    justifyContent: 'flex-end', // aligns content to the right
    borderRadius: 10,
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
    zIndex: 0,
    marginVertical: 7,
  },
  cartItem: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 10,
    borderWidth: 1,
    borderColor: '#c0bebeff',
    marginVertical: 7,
    borderRadius: 10,
    flexDirection: 'row',
    height: 90,
    position: 'relative',
    zIndex: 1,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  imageDiv: {
    width: '40%',
    height: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
  },
  notImageDiv: {
    flex: 1,
    paddingLeft: 3,
    justifyContent: 'center',
  },
  cartItemRightDivSubdiv: {
    paddingVertical: 10,
  },
  cartItemRightDivSubdiv2: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 10,
    width: '90%',
    justifyContent: 'space-between',
    gap: 5,
  },
  cartItemRightDivText: {
    marginTop: 3,
    flexDirection: 'row',
    fontWeight: '700',
    backgroundColor: '#fff',
  },

  totalSection: {
    width: '100%',
    flex: 1,
    position: 'absolute',
    bottom: 10,
    backgroundColor: '#fff',
    zIndex: 2,
    padding: 13,
  },
  totalSectionD1: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: 10,
    width: '100%',
  },
  totalSectionCheckout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    width: '100%',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  totalPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtn: {
    width: '100%',
    backgroundColor: PRIMARY_COLOR,
    padding: 20,
    borderRadius: 10,
  },
  disabledButton: {
    backgroundColor: '#fb966bff',
  },
  checkoutText: {
    color: '#eee',
    fontWeight: '700',
    alignSelf: 'center',
    fontSize: 18,
  },
  totalPriceSign: {
    marginRight: 5,
  },
  totalPriceValue: {
    flexDirection: 'row',
  },
  largeText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#222',
  },
  smallText: {
    fontSize: 20, // same or slightly smaller than icon
    color: '#222',
  },
  settingsBtn: {
    flexDirection: 'row',
    paddingBottom: 10,
    flex: 1,
  },
  appVersionText: {
    padding: 10,
    flex: 1,
    fontSize: 12,
    color: 'gray',
  },
  settingsBtnLeftdiv: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  settingsBtn2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    flex: 1,
    alignItems: 'center',
  },
  settingsBtnRightdiv: {
    flex: 1,
    marginLeft: 10,
    alignItems: 'flex-start',
  },
  settingsBtnDiv: {
    width: '100%',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#f69d76ff',
  },
  settingsBtnRowdiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsBtnRowdivText: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    color: '#222',
    paddingBottom: 8,
  },
  settingsBtnRowdivText2: {
    backgroundColor: '#f9cbb8ff',
    color: PRIMARY_COLOR,
    padding: 10,
    fontSize: 13,
    fontWeight: '700',
    borderRadius: 8,
  },
  settingsBtnLeftdivText: {
    fontSize: 12,
    color: '#222',
  },
  fab: {
    position: 'absolute',
    bottom: 75,
    right: 20,
    backgroundColor: PRIMARY_COLOR,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    height: '100%',
    borderBottomRightRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 10,
    paddingHorizontal: 13,
  },
  mobileDrawer: {
    width: '75%',
  },
  desktopDrawer: {
    width: 320,
    borderRightWidth: 1,
    borderRightColor: PRIMARY_COLOR_TINT,
  },
  userInfo: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
    marginBottom: 10,
  },
  largeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 5,
  },
  userSubtext: {
    fontSize: 14,
    marginTop: 3,
  },
  separator: {
    height: 1,
    backgroundColor: PRIMARY_COLOR_TINT_MAIN,
    marginVertical: 10,
    width: '100%',
  },
  userHandle: {
    color: PRIMARY_COLOR,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
});


