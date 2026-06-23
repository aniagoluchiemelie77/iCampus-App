import React, { useState, useEffect, useRef } from 'react';
import {
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
import Modal from 'react-native-modal';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../components/hooks';
import { homeStyles } from '../assets/styles/colors.ts';
import Toast from 'react-native-toast-message';
import ExpandableFAB from '../components/ExpandableFAB';
import { formatCount } from '../utils/followCountFormatter.ts';
import { ProfileTabs } from '../components/ProfileTabs.tsx';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import { PageHeader } from '../components/PageHeader';
import { ProfileImageCarousel } from '../components/ProfileImageCarousel';
import { UserIdentity } from '../components/UserIdentity';
import { ITagCard } from '../components/iTag';
import { Course, User } from '../types/firebase';
import { formatTime } from '../utils/durationFormatter';
import { EditiTagModal } from '../components/EditItag.tsx';
import {
  FollowersListModal,
  FollowingListModal,
} from '../components/Fmodals.tsx';
import { PostCard } from '../components/PostCard.tsx';
import Clipboard from '@react-native-clipboard/clipboard';
import { MediaGridItem } from '../components/ProfileScreenTabbedComponents.tsx';
import { patchUserProfile } from '../api/localPatchApis.ts';
import { UserSearchOverlay } from '../components/SearchOverlay.tsx';
import { useTheme } from '../context/ThemeContext';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { useProfileData } from '../hooks/useProfileData.ts';
import { useProfileEditing } from '../hooks/useProfileEditing.ts';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;
const CARD_HEIGHT = 190;
const POPULAR_SKILLS = [
  'Programming',
  'Graphic Design',
  'Sewing',
  'Public Speaking',
  'Data Analysis',
  'Photography',
  'Marketing',
  'Content Writing',
  'UI/UX Design',
  'Project Management',
  'Videography',
];
const MAX_BIO_CHAR = 300;

const CourseCard = ({ item }: { item: any }) => {
  const { colors } = useTheme();
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
              <Text
                style={[styles.courseName, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.courseTitle}
              </Text>
              <Text
                style={[styles.description, { color: colors.text }]}
                numberOfLines={2}
              >
                {item.description || 'No description available.'}
              </Text>
              <View style={styles.rowDiv}>
                <View style={styles.ratingRow}>
                  <MaterialIcons name="star" size={12} color={colors.text} />
                  <Text style={[styles.ratingText, { color: colors.text }]}>
                    {item.rating || '4.5'}
                  </Text>
                </View>
                <View style={styles.ratingRow}>
                  <MaterialIcons
                    name="access-time"
                    size={12}
                    color={colors.text}
                  />
                  <Text style={[styles.durationText, { color: colors.text }]}>
                    {formatTime(item.courseDuration)}
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          // --- ACADEMIC STYLE LAYOUT ---
          <>
            <MaterialIcons
              name="auto-stories-outlined"
              size={24}
              color={colors.text}
              style={{ alignSelf: 'center' }}
            />
            <View style={styles.courseInfo}>
              <Text
                style={[styles.courseName, { color: colors.text }]}
                numberOfLines={2}
              >
                {item.courseTitle}
              </Text>
              {item.courseCode && (
                <Text style={[styles.courseCode, { color: colors.text }]}>
                  {item.courseCode}
                </Text>
              )}
              <View style={styles.courseMeta}>
                <Text style={[styles.courseMetaText, { color: colors.text }]}>
                  {item.session}
                </Text>
                <Text
                  style={[styles.courseMetaSeparator, { color: colors.text }]}
                >
                  |
                </Text>
                <Text style={[styles.courseMetaText, { color: colors.text }]}>
                  {item.semester}
                </Text>
              </View>
            </View>
          </>
        )}
      </TouchableOpacity>
      <Modal
        isVisible={modalVisible}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        onBackButtonPress={() => setModalVisible(false)}
        onBackdropPress={() => setModalVisible(false)}
        swipeDirection="down"
        onSwipeComplete={() => setModalVisible(false)}
        style={styles.modalBottom}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <View style={styles.modalDivider} />
            <Text style={[styles.modalTitle, { color: colors.textDarker }]}>
              {item.courseTitle}
            </Text>
            <Text style={[styles.modalSubTitle, { color: colors.text }]}>
              {item.courseCode || 'Professional Course'}
            </Text>
            <Text style={[styles.modalDescription, { color: colors.text }]}>
              {item.description ||
                'Detailed course information and curriculum will appear here.'}
            </Text>
            <View style={styles.modalStatsRow}>
              <View style={styles.statItem}>
                <MaterialIcons name="people" size={20} color={colors.text} />
                <Text style={[styles.statText, { color: colors.text }]}>
                  {item.enrolledCount} Students
                </Text>
              </View>
              {item.price && (
                <CurrencyDisplay value={item.price} size="small" />
              )}
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: item.isActive && colors.btnColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: item.isActive
                        ? colors.btnTextColor
                        : colors.primary,
                    },
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
export const CoursesView = ({
  courses,
  colors,
}: {
  courses: Course[];
  colors: any;
}) => {
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
    <View
      style={[
        styles.sectionContainer,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <Text
        style={[styles.sectionTitle, { color: colors.text, marginBottom: 15 }]}
      >
        Contributions {courses.length}
      </Text>

      <FlatList
        ref={flatListRef}
        data={courses}
        keyExtractor={item => item.courseId}
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
  const { colors } = useTheme();
  const { identifier } = route.params;
  const currentUser = useAppSelector(state => state.user);
  const {
    isFollowing,
    handleFollowToggle,
    isBlocked,
    fetchProfile,
    updateLocalProfile,
    profileData,
    handleBlockToggle,
  } = useProfileData(identifier, currentUser);
  const { tempBio, setTempBio, tempSkills, setTempSkills } =
    useProfileEditing(profileData);
  const isOwner =
    currentUser.uid === identifier ||
    currentUser.firstname === identifier ||
    currentUser.lastname === identifier ||
    currentUser.username === identifier;
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState('Posts');
  const [isSaving, setIsSaving] = useState(false);
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
  const [isEditItagModalVisible, setIsEditItagModalVisible] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFabMenuVisible, setFabMenuVisible] = useState(false);
  const toggleFab = () => setFabMenuVisible(!isFabMenuVisible);
  const [isExpanded, setIsExpanded] = useState(false);
  const [numLines, setNumLines] = useState<number | undefined>(undefined);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'about' | 'skills' | null>(null);
  const [skillInput, setSkillInput] = useState('');
  const [apiSuggestions, setApiSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const onTextLayout = (e: any) => {
    if (!isExpanded) {
      setNumLines(e.nativeEvent.lines.length);
    }
  };
  const handleSaveUpdate = (updatedITag: any) => {
    updateLocalProfile(prev => ({
      ...prev,
      iTagData: updatedITag,
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
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload: Partial<User> =
        modalType === 'about' ? { bio: tempBio } : { skills: tempSkills };
      await patchUserProfile(payload);
      updateLocalProfile(prev => (prev ? { ...prev, ...payload } : null));
      setEditModalVisible(false);
      Toast.show({
        type: 'success',
        text1: 'Update Successful',
        text2: 'Your profile has been updated.',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Could not update profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const fetchUniversalSkills = async () => {
      if (skillInput.length < 2) {
        setApiSuggestions([]);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.datamuse.com/words?ml=${skillInput}&max=10`,
        );
        const data = await response.json();
        const suggestions = data.map(
          (item: any) => item.word.charAt(0).toUpperCase() + item.word.slice(1),
        );
        setApiSuggestions(suggestions);
      } catch (error) {
        console.error('Skill API error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchUniversalSkills, 400);
    return () => clearTimeout(timer);
  }, [skillInput]);
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
  const isExplicitlyBlockedByMe = currentUser.blockedUsers?.includes(
    profileData?.uid || identifier,
  );
  if (isBlocked) {
    return (
      <View
        style={[
          styles.blockedContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons
          name={
            isExplicitlyBlockedByMe
              ? 'person-off-outlined'
              : 'no-accounts-outlined'
          }
          size={80}
          color={colors.primary}
        />
        <Text style={[styles.blockedTitle, { color: colors.textDarker }]}>
          {isExplicitlyBlockedByMe ? 'User Blocked' : 'User Not Found'}
        </Text>
        <Text style={[styles.blockedSubTitle, { color: colors.text }]}>
          {isExplicitlyBlockedByMe
            ? `You have blocked this user. Unblock them to view their profile and posts.`
            : `This account is private or you have restricted access to this profile.`}
        </Text>
        <View style={styles.blockedBtnRow}>
          <TouchableOpacity
            style={[styles.blockBtn, { borderColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.blockBtnText, { color: colors.primary }]}>
              Go Back
            </Text>
          </TouchableOpacity>
          {isExplicitlyBlockedByMe && (
            <TouchableOpacity
              style={[styles.blockBtn, { backgroundColor: colors.btnColor }]}
              onPress={handleBlockToggle}
            >
              <Text
                style={[styles.blockBtnText, { color: colors.btnTextColor }]}
              >
                Unblock User
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {!isSearchFocused && (
        <PageHeader
          title="Profile"
          rightElement={
            <View style={styles.headerRightDiv}>
              <TouchableOpacity
                onPress={() => setIsSearchFocused(true)}
                style={{ marginRight: 6 }}
              >
                <MaterialIcons name="search" size={23} color={colors.primary} />
              </TouchableOpacity>
              {isOwner && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Settings')}
                >
                  <MaterialIcons
                    name="settings"
                    size={23}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
      <View
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <ProfileImageCarousel
          images={profileData.profilePic}
          isOwner={isOwner}
          organizationName={profileData.organizationName}
          firstName={profileData.firstname}
          lastName={profileData.lastname}
          username={profileData.username}
        />
        <View style={styles.profileInfoSection}>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.editButtonCircle}
          >
            <MaterialIcons name="edit" size={23} color={colors.primary} />
          </TouchableOpacity>
          <UserIdentity
            firstname={profileData.firstname}
            lastname={profileData.lastname}
            username={profileData.username}
            tier={profileData.tier}
            isVerified={profileData.isVerified}
            showVerifyIcon={true}
            size="large"
            isOrganization={profileData.usertype === 'enterprise'}
            organizationName={profileData.organizationName}
            containerStyle={{ padding: 15 }}
          />
          <View style={styles.rowDiv}>
            {isOwner ||
              (isIscoreViewEligible && (
                <View style={styles.iScoreChip}>
                  <Text
                    style={[styles.iScoreValue, { color: colors.textDarker }]}
                  >
                    {profileData.currentIScore}
                  </Text>
                  <Text style={[styles.iScoreLabel, { color: colors.text }]}>
                    iScore
                  </Text>
                </View>
              ))}
            {isOwner && !isVerified && (
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={() => navigation.navigate('PersonaVerify')}
              >
                <Text style={[styles.verifyBtnText, { color: colors.primary }]}>
                  Get Verified
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.bioText, { color: colors.text }]}>
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
              <Text
                style={[
                  styles.statCount,
                  { color: colors.primary },
                  { marginRight: 4 },
                ]}
              >
                {formatCount(profileData.followersCount)}
              </Text>
              <Text style={[styles.statCount, { color: colors.primary }]}>
                Followers
              </Text>
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
              <Text
                style={[
                  styles.statCount,
                  { color: colors.primary },
                  { marginRight: 4 },
                ]}
              >
                {formatCount(profileData.followingCount)}
              </Text>
              <Text style={[styles.statCount, { color: colors.primary }]}>
                Following
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.statsRow, { marginBottom: 0 }]}>
            <TouchableOpacity
              onPress={handleBlockToggle}
              style={[styles.blockBtn, { borderColor: colors.primary }]}
            >
              <Text style={[styles.blockBtnText, { color: colors.primary }]}>
                Block User
              </Text>
            </TouchableOpacity>
            {!isOwner && !isFollowing && (
              <TouchableOpacity
                style={[styles.followBtn, { backgroundColor: colors.btnColor }]}
                onPress={handleFollowToggle}
              >
                <Text
                  style={[styles.followBtnText, { color: colors.btnTextColor }]}
                >
                  Follow
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.contactContainer}>
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
              <MaterialIcons
                name="email-outlined"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.contactValue, { color: colors.primary }]}>
                Send mail
              </Text>
            </TouchableOpacity>
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
                <MaterialIcons
                  name="language"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[styles.contactValue, { color: colors.primary }]}>
                  View Portfolio
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {profileData.bio && (
        <View
          style={[
            styles.sectionContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View style={styles.sectionTitleDiv}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              About
            </Text>
            {isOwner && (
              <TouchableOpacity
                onPress={() => {
                  setModalType('about');
                  setEditModalVisible(true);
                }}
              >
                <MaterialIcons name="edit" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.aboutContent}>
            <Text
              style={[styles.aboutText, { color: colors.text }]}
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
                <Text style={[styles.seeMoreText, { color: colors.primary }]}>
                  {isExpanded ? 'Show Less' : 'See More'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      {profileData.skills && profileData.skills.length > 0 && (
        <View
          style={[
            styles.sectionContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View style={styles.sectionTitleDiv}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Skills
            </Text>
            {isOwner && (
              <TouchableOpacity
                onPress={() => {
                  setModalType('skills');
                  setEditModalVisible(true);
                }}
              >
                <MaterialIcons name="edit" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.skillsWrapper}>
            {profileData.skills.map((skill: string, index: number) => (
              <View key={index} style={styles.skillChip}>
                <Text style={[styles.skillText, { color: colors.text }]}>
                  {skill}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <View
        style={[
          styles.iTagDiv,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
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
            <MaterialIcons name="edit" size={20} color={colors.primary} />
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
      {profileData.courses && profileData.courses.length > 0 && (
        <CoursesView courses={profileData.courses} colors={colors} />
      )}
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
            renderItem={({ item }) => <PostCard post={item} isVisible={true} />}
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
            renderItem={({ item }) => <PostCard post={item} isVisible={true} />}
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
            renderItem={({ item }) => <PostCard post={item} isVisible={true} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No bookmarks yet.</Text>
            }
          />
        )}
        {activeTab === 'Media' && (
          <FlatList
            data={profileData.posts.filter(
              (p: any) => p.media?.url?.length > 0,
            )}
            keyExtractor={item => item.postId}
            numColumns={3}
            renderItem={({ item }) => <MediaGridItem post={item} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No media found.</Text>
            }
          />
        )}
        {activeTab === 'Jobs' && (
          <FlatList
            data={profileData.posts.filter((p: any) => p.postType === 'job')}
            keyExtractor={item => item.postId}
            renderItem={({ item }) => <PostCard post={item} isVisible={true} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No job listings.</Text>
            }
          />
        )}
        {activeTab === 'Events' && (
          <FlatList
            data={profileData.posts.filter((p: any) => p.postType === 'event')}
            keyExtractor={item => item.postId}
            renderItem={({ item }) => <PostCard post={item} isVisible={true} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No upcoming events.</Text>
            }
          />
        )}
      </View>
      {isSearchFocused && (
        <UserSearchOverlay
          currentUser={currentUser}
          navigation={navigation}
          onClose={() => setIsSearchFocused(false)}
          colors={{ primary: PRIMARY_COLOR, tint: PRIMARY_COLOR_TINT }}
        />
      )}
      {!isFabMenuVisible && (
        <TouchableOpacity
          style={homeStyles.fab}
          onPress={() => setFabMenuVisible(true)}
        >
          <MaterialIcons
            name="widgets-outlined"
            size={28}
            color={colors.btnTextColor}
          />
        </TouchableOpacity>
      )}
      <FollowersListModal
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
      <Modal
        isVisible={isEditModalVisible}
        onBackdropPress={() => setEditModalVisible(false)}
        swipeDirection="down"
        onSwipeComplete={() => setEditModalVisible(false)}
        style={styles.modalBottom}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.textDarker }]}>
            {modalType === 'about' ? 'Edit About' : 'Edit Skills'}
          </Text>
          {modalType === 'about' ? (
            <>
              <TextInput
                style={styles.bioInput}
                multiline
                maxLength={MAX_BIO_CHAR}
                value={tempBio}
                onChangeText={setTempBio}
                placeholder="Tell people about yourself..."
                placeholderTextColor={colors.inputTextHolder}
              />
              <Text style={[styles.charCount, { color: colors.text }]}>
                {tempBio.length} / {MAX_BIO_CHAR}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.skillInputWrapper}>
                <MaterialIcons
                  name="auto-fix-high"
                  size={20}
                  color={colors.text}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={[styles.skillSearchInput, { color: colors.text }]}
                  value={skillInput}
                  onChangeText={setSkillInput}
                  placeholder="Type in a skill..."
                  placeholderTextColor={colors.inputTextHolder}
                />
                {skillInput.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      if (!tempSkills.includes(skillInput)) {
                        setTempSkills([...tempSkills, skillInput]);
                        setSkillInput('');
                      }
                    }}
                  >
                    <Text
                      style={[styles.addBtnText, { color: colors.primary }]}
                    >
                      Add
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.activeScroll}
              >
                {tempSkills.map((skill, index) => (
                  <View key={index} style={styles.activeSkillChip}>
                    <Text
                      style={[styles.activeSkillText, { color: colors.text }]}
                    >
                      {skill}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setTempSkills(tempSkills.filter(s => s !== skill))
                      }
                    >
                      <MaterialIcons
                        name="close"
                        size={14}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.suggestionHeader}>
                <Text style={[styles.suggestionTitle, { color: colors.text }]}>
                  {skillInput.length > 0
                    ? 'Global Results'
                    : 'Popular on iCampus'}
                </Text>
                {isLoading && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </View>
              <View style={styles.suggestionsWrapper}>
                {(skillInput.length > 0 ? apiSuggestions : POPULAR_SKILLS).map(
                  (skill, index) => {
                    if (tempSkills.includes(skill)) return null;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionChip}
                        onPress={() => {
                          setTempSkills([...tempSkills, skill]);
                          setSkillInput('');
                        }}
                      >
                        <Text
                          style={[
                            styles.suggestionText,
                            { color: colors.text },
                          ]}
                        >
                          {skill}
                        </Text>
                        <MaterialIcons
                          name="add"
                          size={18}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            </>
          )}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.btnColor }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text
              style={[styles.saveButtonText, { color: colors.btnTextColor }]}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15, position: 'relative' },
  subContainer: {
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginHorizontal: -15,
    marginBottom: 10,
  },
  blockedContainer: {
    position: 'relative',
    alignContent: 'center',
    padding: 20,
    borderRadius: 15,
  },
  headerRightDiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfoSection: {
    padding: 20,
    position: 'relative',
    marginVertical: 15,
  },
  bioText: { fontSize: 14, marginBottom: 10, paddingHorizontal: 15 },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  statCount: { fontWeight: 'bold', fontSize: 12 },
  verifyBtn: {
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  verifyBtnText: { fontWeight: 'bold', fontSize: 14 },
  rowDiv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  iScoreChip: {
    alignItems: 'center',
  },
  iScoreLabel: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  iScoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statCountDiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonCircle: {
    position: 'absolute',
    top: 10,
    right: 5,
    alignContent: 'center',
  },
  contactContainer: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactRow: {
    alignItems: 'center',
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  iTagDiv: {
    position: 'relative',
    padding: 20,
    borderRadius: 15,
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
    borderRadius: 15,
  },
  sectionTitleDiv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
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
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 4,
  },
  durationText: {
    fontSize: 12,
    marginLeft: 4,
  },
  description: {
    fontSize: 12,
    marginVertical: 5,
  },
  courseName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  courseCode: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  courseMetaText: {
    fontSize: 12,
  },
  courseMetaSeparator: {
    marginHorizontal: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    minHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  blockedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  blockedSubTitle: {
    fontSize: 14,
    marginBottom: 15,
  },
  blockedBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  modalSubTitle: {
    fontSize: 12,
    marginBottom: 15,
  },
  modalDivider: {
    height: 1,
    backgroundColor: PRIMARY_COLOR_TINT,
    marginVertical: 10,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 15,
  },
  courseCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    marginRight: 15,
    overflow: 'hidden',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  courseInfo: {
    padding: 15,
  },
  modalStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    marginTop: 5,
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
    alignContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  blockBtn: {
    alignContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
  },
  blockBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  followBtnText: {
    fontSize: 14,
  },
  aboutContent: {
    width: '100%',
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
  },
  seeMoreButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  seeMoreText: {
    fontWeight: '600',
    fontSize: 14,
  },
  tabContent: {
    marginVertical: 10,
    flex: 1,
  },
  emptyText: {
    marginVertical: 15,
    textAlign: 'center',
    fontSize: 13,
    color: PRIMARY_COLOR_TINT,
  },
  skillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    padding: 10,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalBottom: {
    justifyContent: 'flex-end',
    backgroundColor: '#000',
    margin: 0,
  },
  modalContainer: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '80%',
  },
  bioInput: {
    height: 120,
    borderRadius: 10,
    padding: 15,
    textAlignVertical: 'top',
    fontSize: 14,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  charCount: {
    textAlign: 'right',
    marginTop: 8,
    fontSize: 12,
  },
  skillInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 60,
    borderRadius: 10,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  searchIcon: {
    marginRight: 5,
  },
  skillSearchInput: {
    flex: 1,
    fontSize: 14,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalSkillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 15,
    gap: 8,
  },
  editableSkillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  saveButton: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
    width: '80%',
    alignSelf: 'center',
  },
  saveButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  activeScroll: {
    maxHeight: 60,
    marginVertical: 15,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  suggestionChip: {
    alignItems: 'center',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    padding: 10,
    borderRadius: 12,
    width: '45%',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    marginBottom: 3,
  },
  suggestionsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  activeSkillChip: {
    alignItems: 'center',
    padding: 8,
    marginRight: 8,
  },
  activeSkillText: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
});
