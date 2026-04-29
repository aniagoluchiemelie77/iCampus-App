import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Dimensions,
  TouchableOpacity,
  Linking,
  Alert,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  FlatList,
  TextInput,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../components/hooks';
import { homeStyles } from '../assets/styles/colors.ts';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { baseUrl } from '../components/HomeScreenComponents';
import ExpandableFAB from '../components/ExpandableFAB';
import { formatCount } from '../utils/followCountFormatter.ts';
import { ProfileTabs } from '../components/ProfileTabs.tsx';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '@components/Classroomcomponent';
import { PageHeader } from '../components/PageHeader';
import { ProfileImageCarousel } from '../components/ProfileImageCarousel';
import { UserIdentity } from '../components/UserIdentity';
import { PRIMARY_COLOR_TINT_MAIN } from 'assets/styles/colors';
import { ITagCard } from '../components/iTag';
import { Course } from '../types/firebase';
import { formatTime } from '../utils/durationFormatter';
import { EditiTagModal } from '../components/EditItag.tsx';
import { FollowListModal, FollowingListModal } from '../components/Fmodals.tsx';
import { PostCard } from '../components/PostCard.tsx';
import Clipboard from '@react-native-clipboard/clipboard';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;
const CARD_HEIGHT = 190;

const CourseCard = ({ item }: { item: any }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const isProfessional = !!item.thumbnailUrl;
  return (
    <>
      <TouchableOpacity
        style={styles.courseCard}
        activeOpacity={0.9}
        onPress={() => setModalVisible(true)}
      >
        {isProfessional ? (
          <>
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <View style={styles.proInfo}>
              <Text style={styles.courseName} numberOfLines={1}>
                {item.courseTitle}
              </Text>
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={12} color={PRIMARY_COLOR} />
                <Text style={styles.ratingText}>{item.rating || '4.5'}</Text>
                <Text style={styles.durationText}>
                  {formatTime(item.courseDuration)}
                </Text>
              </View>
              <Text style={styles.description} numberOfLines={2}>
                {item.description || 'No description available.'}
              </Text>
            </View>
          </>
        ) : (
          // --- ACADEMIC STYLE LAYOUT ---
          <>
            <View style={styles.courseIconContainer}>
              <MaterialIcons
                name="auto-stories"
                size={24}
                color={PRIMARY_COLOR}
              />
            </View>
            <View style={styles.courseInfo}>
              <Text style={styles.courseName} numberOfLines={2}>
                {item.courseTitle}
              </Text>
              {item.courseCode && (
                <Text style={styles.courseCode}>{item.courseCode}</Text>
              )}
              <View style={styles.courseMeta}>
                <Text style={styles.courseMetaText}>{item.session}</Text>
                <Text style={styles.courseMetaSeparator}>|</Text>
                <Text style={styles.courseMetaText}>{item.semester}</Text>
              </View>
            </View>
          </>
        )}
      </TouchableOpacity>
      {/* Course Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDivider} />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <MaterialIcons
                name="close"
                size={24}
                color={PRIMARY_COLOR_TINT}
              />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{item.courseTitle}</Text>
            <Text style={styles.modalSubTitle}>
              {item.courseCode || 'Professional Course'}
            </Text>
            <Text style={styles.modalDescription}>
              {item.description ||
                'Detailed course information and curriculum will appear here.'}
            </Text>
            <View style={styles.modalStatsRow}>
              <View style={styles.statItem}>
                <MaterialIcons name="people" size={18} color={PRIMARY_COLOR} />
                <Text style={styles.statText}>
                  {item.enrolledCount} Students
                </Text>
              </View>
              {item.price && (
                <View style={styles.statItem}>
                  <MaterialIcons
                    name="diamond"
                    size={18}
                    color={PRIMARY_COLOR}
                  />
                  <Text style={styles.statText}>{item.price}</Text>
                </View>
              )}
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: item.isActive
                      ? PRIMARY_COLOR
                      : PRIMARY_COLOR_TINT_MAIN,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: item.isActive ? '#fff' : PRIMARY_COLOR },
                  ]}
                >
                  {item.isActive ? 'Active' : 'Archived'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
export const CoursesView = ({ courses }: { courses: Course[] }) => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (courses.length <= 1) return;
    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= courses.length) {
        nextIndex = 0;
      }

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }, 8000);
    return () => clearInterval(interval);
  }, [currentIndex, courses.length]);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Contributions {courses.length}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={courses}
        keyExtractor={item => item._id}
        renderItem={({ item }) => <CourseCard item={item} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 20}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20 }}
        getItemLayout={(data, index) => ({
          length: CARD_WIDTH + 20,
          offset: (CARD_WIDTH + 20) * index,
          index,
        })}
      />
    </View>
  );
};

export const ProfileScreen = ({ route }: any) => {
  const { identifier } = route.params;
  const currentUser = useAppSelector(state => state.user);
  const isOwner =
    currentUser.uid === identifier ||
    currentUser.firstname === identifier ||
    currentUser.lastname === identifier ||
    currentUser.username === identifier;
  const navigation = useNavigation<any>();
  const [profileData, setProfileData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('Posts');
  const [followModal, setFollowModal] = useState({
    visible: false,
    title: 'Followers',
    data: [],
  });
  const [followingModal, setFollowingModal] = useState({
    visible: false,
    title: 'Following',
    data: [],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditItagModalVisible, setIsEditItagModalVisible] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, _setSearchResults] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(profileData.isFollowing);
  const [isFabMenuVisible, setFabMenuVisible] = useState(false);
  const toggleFab = () => setFabMenuVisible(!isFabMenuVisible);
  const [isExpanded, setIsExpanded] = useState(false);
  const [numLines, setNumLines] = useState<number | undefined>(undefined);

  const onTextLayout = (e: any) => {
    if (!isExpanded) {
      setNumLines(e.nativeEvent.lines.length);
    }
  };
  const handleFollowToggle = async () => {
    const previousState = isFollowing;
    setIsFollowing(!previousState);

    try {
      const response = await axios.post(`${baseUrl}users/follow/toggle`, {
        followerId: currentUser.uid,
        followingId: profileData.uid,
      });

      if (!response.data.success) {
        setIsFollowing(previousState);
        Toast.show({
          type: 'error',
          text1: 'API Error',
          text2: 'Could not update follow status',
        });
      }
      Toast.show({
        type: 'success',
        text1: response.data.action === 'followed' ? 'Success!' : 'Updated',
        text2:
          response.data.action === 'followed'
            ? `You are now following ${profileData.firstname}`
            : `Unfollowed ${profileData.firstname}`,
      });
    } catch (error) {
      setIsFollowing(previousState);
      console.error('Follow Toggle Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: 'Please check your connection',
      });
    }
  };
  const handleSaveUpdate = (updatedITag: any) => {
    setProfileData((prev: any) => ({
      ...prev,
      iTagData: updatedITag, // Update the nested iTagData with the new design/username
    }));
  };
  const handleCopyITag = () => {
    const iTagValue = profileData.iTagData?.username;
    if (iTagValue) {
      Clipboard.setString(iTagValue);
      console.log('Copied to clipboard');
      Toast.show({
        type: 'success',
        text2: 'Copied to clipboard',
      });
    }
  };
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(
          `${baseUrl}users/profile/search/${identifier}`,
          {
            params: {
              viewerUid: currentUser.uid,
              viewerTier: currentUser.tier,
              viewerRole: currentUser.usertype,
              viewerFirstname: currentUser.firstname,
            },
          },
        );
        setProfileData(res.data.data);
      } catch (error: any) {
        console.error(error);
        Toast.show({
          type: 'error',
          text1: 'Fetch Error',
          text2: error?.message || 'An unexpected error occurred',
        });
      }
    };
    fetchProfile();
  }, [
    identifier,
    currentUser.uid,
    currentUser.tier,
    currentUser.usertype,
    currentUser.firstname,
  ]);
  if (!profileData)
    return (
      <ActivityIndicator
        size="large"
        color={PRIMARY_COLOR}
        style={{ flex: 1 }}
      />
    );
  const isIscoreViewEligible = currentUser.tier !== 'free';
  const isVerified = profileData.isVerified === true;
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      {!isSearchFocused ? (
        <PageHeader
          title="Profile"
          rightElement={
            <View style={styles.headerRightDiv}>
              {/* Search Trigger Icon */}
              <TouchableOpacity
                onPress={() => setIsSearchFocused(true)}
                style={{ marginRight: 15 }}
              >
                <MaterialIcons name="search" size={23} color={PRIMARY_COLOR} />
              </TouchableOpacity>
              {isOwner && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Settings')}
                >
                  <MaterialIcons
                    name="settings"
                    size={23}
                    color={PRIMARY_COLOR}
                  />
                </TouchableOpacity>
              )}
            </View>
          }
        />
      ) : (
        <View style={styles.activeSearchHeader}>
          <TouchableOpacity
            onPress={() => {
              setIsSearchFocused(false);
              setSearchQuery('');
            }}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={PRIMARY_COLOR_TINT}
            />
          </TouchableOpacity>
          <TextInput
            autoFocus
            placeholder="Search users..."
            style={styles.headerSearchInput}
            placeholderTextColor={PRIMARY_COLOR_TINT}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}
      <ProfileImageCarousel
        images={profileData.profilePic}
        isOwner={isOwner}
        uid={currentUser.uid}
      />
      {/* 1. Essential Info Section */}
      <View style={styles.profileInfoSection}>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditProfile')}
          style={styles.editButtonCircle}
        >
          <MaterialIcons name="edit" size={20} color={PRIMARY_COLOR} />
        </TouchableOpacity>
        {/* 1. Name section */}
        <UserIdentity
          firstname={profileData.firstname}
          lastname={profileData.lastname}
          tier={profileData.tier}
          isVerified={profileData.isVerified}
          showVerifyIcon={true}
          size="large"
          isOrganization={profileData.usertype === 'enterprise'}
          organizationName={profileData.organizationName}
        />
        {/* 2. iSore section */}
        {isOwner ||
          (isIscoreViewEligible && (
            <View style={styles.iScoreChip}>
              <Text style={styles.iScoreLabel}>iScore</Text>
              <Text style={styles.iScoreValue}>
                {profileData.currentIScore}
              </Text>
            </View>
          ))}
        {/* 3. Verification CTA (Other Users) */}
        {isOwner && !isVerified && (
          <TouchableOpacity style={styles.verifyBtn}>
            <Text style={styles.verifyBtnText}>Get Verified</Text>
          </TouchableOpacity>
        )}
        {/* 4. Bio section */}
        <Text style={styles.bioText}>
          {profileData.headline
            ? profileData.headline
            : profileData.usertype === 'student'
            ? `Student at ${profileData.schoolName}`
            : profileData.usertype === 'lecturer'
            ? `${profileData.jobTitle || 'Lecturer'} • ${
                profileData.department
              } at ${profileData.schoolName}`
            : profileData.usertype === 'enterprise'
            ? `${profileData.organizationName} Global Organization`
            : 'iCampus User'}
        </Text>
        {!isOwner && !isFollowing && (
          <TouchableOpacity
            style={styles.followBtn}
            onPress={handleFollowToggle}
          >
            <Text style={styles.followBtnText}>Follow</Text>
          </TouchableOpacity>
        )}
        {/* 5. Follow section */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCountDiv}
            onPress={() =>
              setFollowModal({
                visible: true,
                title: 'Followers',
                data: profileData.followersList,
              })
            }
          >
            <Text style={[styles.statCount, { marginRight: 4 }]}>
              {formatCount(profileData.followersCount)}
            </Text>
            <Text style={styles.statCount}>Followers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCountDiv}
            onPress={() =>
              setFollowingModal({
                visible: true,
                title: 'Following',
                data: profileData.followingList,
              })
            }
          >
            <Text style={[styles.statCount, { marginRight: 4 }]}>
              {formatCount(profileData.followingCount)}
            </Text>
            <Text style={styles.statCount}>Following</Text>
          </TouchableOpacity>
        </View>
        {/* 6. Contact info section*/}
        <View style={styles.contactContainer}>
          {/* Email Row */}
          {isIscoreViewEligible && (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => {
                if (profileData.email) {
                  Linking.openURL(`mailto:${profileData.email}`).catch(() =>
                    Alert.alert('Error', 'No email app found on this device'),
                  );
                }
              }}
            >
              <View style={styles.iconCircle}>
                <MaterialIcons name="mail-outline" size={18} color="#fff" />
              </View>
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactValue} numberOfLines={1}>
                  Email
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {/* If User has a website (based on your schema) */}
          {profileData.website && (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => {
                if (profileData.website) {
                  const url = profileData.website.startsWith('http')
                    ? profileData.website
                    : `https://${profileData.website}`;
                  Linking.openURL(url).catch(() =>
                    Alert.alert('Error', "Couldn't open this website"),
                  );
                }
              }}
            >
              <View style={styles.iconCircle}>
                <MaterialIcons name="language" size={18} color="#fff" />
              </View>
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactValue}>Website</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* 2. About Section */}
      {profileData.bio && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutContent}>
            <Text
              style={styles.aboutText}
              numberOfLines={isExpanded ? undefined : 4}
              onTextLayout={onTextLayout}
            >
              {profileData.bio}
            </Text>
            {numLines && numLines > 4 && (
              <TouchableOpacity
                onPress={() => setIsExpanded(!isExpanded)}
                style={styles.seeMoreButton}
              >
                <Text style={styles.seeMoreText}>
                  {isExpanded ? 'Show Less' : 'See More'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      {/* 3. iTag Section */}
      <View style={styles.iTagDiv}>
        <ITagCard
          iTagData={profileData.iTagData}
          isPremium={profileData.tier === 'premium'}
          isOwner={isOwner}
        />
        {isOwner && isIscoreViewEligible && (
          <TouchableOpacity
            style={styles.editButtonCircle}
            onPress={() => setIsEditItagModalVisible(true)}
          >
            <MaterialIcons name="edit" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        )}
        {!isOwner && (
          <TouchableOpacity
            style={styles.editButtonCircle}
            onPress={handleCopyITag}
          >
            <MaterialIcons
              name="content-copy"
              size={20}
              color={PRIMARY_COLOR}
            />
          </TouchableOpacity>
        )}
      </View>
      {/* 4. Courses View */}
      {profileData.courses && profileData.courses.length > 0 && (
        <CoursesView courses={profileData.courses} />
      )}
      {/* 5. Tabs View (Posts / Courses / Bookmarks) */}
      <View style={styles.sectionContainer}>
        <ProfileTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userType={profileData.usertype}
          isOwner={isOwner}
        />
        <View style={styles.tabContent}>
          {activeTab === 'Posts' && (
            <FlatList
              data={profileData.posts.filter((p: any) => !p.isRepost)}
              keyExtractor={item => item.postId}
              renderItem={({ item }) => (
                <PostCard post={item} isVisible={true} />
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No posts yet.</Text>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
          {activeTab === 'Reposts' && (
            <FlatList
              data={profileData.posts.filter((p: any) => p.isRepost)}
              keyExtractor={item => item.postId}
              renderItem={({ item }) => (
                <PostCard post={item} isVisible={true} />
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No reposts yet.</Text>
              }
            />
          )}
          {activeTab === 'Bookmarks' && (
            <FlatList
              data={profileData.bookmarkedPosts}
              keyExtractor={item => item.postId}
              renderItem={({ item }) => (
                <PostCard post={item} isVisible={true} />
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No bookmarks yet.</Text>
              }
            />
          )}
          {/* Other tabs like 'Media', etc. */}
        </View>
      </View>
      {isSearchFocused && (
        <View style={styles.searchOverlayScreen}>
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              keyExtractor={item => item.uid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultRow}
                  onPress={() => {
                    setIsSearchFocused(false);
                    navigation.push('Profile', { uid: item.uid }); // push allows navigating to another profile from a profile
                  }}
                >
                  <Image
                    source={{ uri: item.profilePic?.[0] }}
                    style={styles.miniAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <UserIdentity
                      firstname={item.firstname}
                      lastname={item.lastname}
                      tier={item.tier}
                      isVerified={item.isVerified}
                      size="small" // Keeps it clean in a list row
                      isOrganization={item.usertype === 'enterprise'}
                      organizationName={item.organizationName}
                    />
                  </View>
                  <Text style={styles.resultSub}>{item.usertype}</Text>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.searchEmptyState}>
              <Text style={{ color: PRIMARY_COLOR_TINT, marginVertical: 8 }}>
                {searchQuery.length < 2
                  ? 'Start typing to find talent...'
                  : 'No results found'}
              </Text>
            </View>
          )}
        </View>
      )}
      {!isFabMenuVisible && (
        <TouchableOpacity
          style={homeStyles.fab}
          onPress={() => setFabMenuVisible(true)}
        >
          <MaterialIcons name="widgets" size={28} color="#fff" />
        </TouchableOpacity>
      )}
      {/* Modals */}
      <FollowListModal
        visible={followModal.visible}
        title={followModal.title}
        data={followModal.data}
        navigation={navigation}
        onClose={() => setFollowModal(prev => ({ ...prev, visible: false }))}
      />
      <FollowingListModal
        visible={followingModal.visible}
        title={followingModal.title}
        data={followingModal.data}
        navigation={navigation}
        onClose={() => setFollowingModal(prev => ({ ...prev, visible: false }))}
      />
      <EditiTagModal
        visible={isEditItagModalVisible}
        onClose={() => setIsEditItagModalVisible(false)}
        iTagData={profileData.iTagData}
        onSave={handleSaveUpdate}
      />
      <ExpandableFAB
        isVisible={isFabMenuVisible}
        onClose={toggleFab}
        actions={['iCash', 'iAssistant']}
      />
      <Toast config={toastConfig} />
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', position: 'relative' },
  headerRightDiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfoSection: {
    padding: 20,
    borderRadius: 15,
    backgroundColor: '#fadccc',
    position: 'relative',
    marginVertical: 15,
    marginHorizontal: 5,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  bioText: { fontSize: 13, color: '#222', marginVertical: 10 },
  statsRow: { flexDirection: 'row', gap: 20 },
  statCount: { fontWeight: 'bold', color: PRIMARY_COLOR, fontSize: 13 },

  // Verify Button
  verifyBtn: {
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
  },
  verifyBtnText: { color: PRIMARY_COLOR, fontWeight: 'bold', fontSize: 14 },
  activeSearchHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#fadccc',
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
    elevation: 4,
  },
  headerSearchInput: {
    flex: 1,
    marginLeft: 15,
    fontSize: 15,
    color: '#222',
  },

  // The Full White Screen Overlay
  searchOverlayScreen: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    zIndex: 100,
    paddingTop: 10,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  miniAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 10,
    backgroundColor: PRIMARY_COLOR_TINT_MAIN,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  resultSub: {
    fontSize: 12,
    marginLeft: 4,
    color: PRIMARY_COLOR_TINT,
  },
  searchEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iScoreChip: {
    backgroundColor: PRIMARY_COLOR,
    marginVertical: 10,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  iScoreLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '900',
    marginRight: 5,
  },
  iScoreValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
  },
  statCountDiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonCircle: {
    position: 'absolute',
    top: 10,
    right: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactContainer: {
    marginVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.8,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY_COLOR_TINT_MAIN,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contactTextContainer: {
    marginLeft: 8,
  },
  contactValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    marginTop: 1,
  },
  iTagDiv: {
    marginHorizontal: 5,
    position: 'relative',
    padding: 20,
    borderRadius: 15,
    backgroundColor: '#fadccc',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    marginBottom: 15,
  },
  courseCount: {
    marginLeft: 8,
    fontSize: 12,
    backgroundColor: '#F0F2F5',
    color: '#676D75',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontWeight: '700',
  },
  sectionContainer: {
    marginBottom: 15,
    padding: 20,
    marginHorizontal: 5,
    borderRadius: 15,
    backgroundColor: '#fadccc',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
  },
  // Professional Specifics
  thumbnail: {
    width: '100%',
    height: '45%',
  },
  proInfo: {
    padding: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
    color: '#444',
  },
  durationText: {
    fontSize: 12,
    color: PRIMARY_COLOR_TINT,
  },
  description: {
    fontSize: 11,
    color: '#777',
    marginTop: 6,
    lineHeight: 14,
  },
  // Shared & Academic Texts
  courseName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
  },
  courseCode: {
    fontSize: 11,
    fontWeight: '700',
    color: PRIMARY_COLOR_TINT,
    marginTop: 2,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  courseMetaText: {
    fontSize: 10,
    color: PRIMARY_COLOR_TINT,
  },
  courseMetaSeparator: {
    marginHorizontal: 5,
    color: PRIMARY_COLOR_TINT,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    minHeight: '70%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  modalSubTitle: {
    fontSize: 13,
    color: PRIMARY_COLOR_TINT,
    marginVertical: 10,
  },
  modalDivider: {
    height: 1,
    backgroundColor: PRIMARY_COLOR_TINT,
    marginVertical: 10,
  },
  modalDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  courseCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#fadccc',
    borderRadius: 16,
    marginRight: 15,
    overflow: 'hidden', // Clips image to border radius
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  // Academic Specifics
  courseIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseInfo: {
    padding: 15,
  },
  modalStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
    paddingHorizontal: 5,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    marginLeft: 5,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  userType: {
    fontSize: 12,
    color: '#676D75',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 15,
    marginHorizontal: 5,
    borderWidth: 1.5,
    backgroundColor: PRIMARY_COLOR,
  },
  followBtnText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    color: '#fff',
  },
  aboutContent: {
    marginTop: 5,
    width: '100%',
  },
  aboutText: {
    fontSize: 14,
    color: '#2222',
    lineHeight: 22,
  },
  seeMoreButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  seeMoreText: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
    fontSize: 14,
  },
  tabContent: {
    marginVertical: 10,
  },
  emptyText: {
    marginVertical: 15,
    textAlign: 'center',
    fontSize: 13,
    color: PRIMARY_COLOR_TINT,
  },
});
