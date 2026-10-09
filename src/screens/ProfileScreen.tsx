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
import { useAppSelector } from '../hooks/hooks.ts';
import Toast from 'react-native-toast-message';
import ExpandableFAB from '../components/ExpandableFAB';
import { formatCount } from '../utils/followCountFormatter.ts';
import { ProfileTabs } from '../components/ProfileTabs.tsx';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import { PageHeader } from '../components/PageHeader';
import { ProfileImageCarousel } from '../components/ProfileImageCarousel';
import { UserIdentity } from '../components/UserIdentity';
import { Course } from '../types/firebase';
import { formatTime } from '../utils/durationFormatter';
import {
  FollowersListModal,
  FollowingListModal,
} from '../components/Fmodals.tsx';
import { PostCard } from '../components/PostCard.tsx';
import { MediaGridItem } from '../components/ProfileScreenTabbedComponents.tsx';
import { patchUserProfile } from '../api/localPatchApis.ts';
import { UserSearchOverlay } from '../components/SearchOverlay.tsx';
import { useTheme } from '../context/ThemeContext';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { useProfileData } from '../hooks/useProfileData.ts';
import { useProfileEditing } from '../hooks/useProfileEditing.ts';
import { switchToAdminApi } from '../api/localPostApis.ts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { setAdmin } from '../context/AdminSlice.ts';
import { CustomButton } from '../assets/components/AppUIComponents';

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
              name="auto-stories"
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
  const currentUser = useAppSelector((state: any) => state.user) || {};
  const dispatch = useDispatch();

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
  const [isSwitching, setIsSwitching] = useState(false);

  const onTextLayout = (e: any) => {
    if (!isExpanded) {
      setNumLines(e.nativeEvent.lines.length);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload: any =
        modalType === 'about' ? { bio: tempBio } : { skills: tempSkills };
      await patchUserProfile(payload);
      updateLocalProfile((prev: any) =>
        prev ? { ...prev, ...payload } : null,
      );
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

  const handleSwitchToInstitutionAdmin = async () => {
    if (isSwitching) return;
    setIsSwitching(true);
    const userId = currentUser.uid;

    const result = await switchToAdminApi(userId);
    setIsSwitching(false);

    if (result && result.success) {
      const { accessToken, refreshToken, admin } = result.data;
      try {
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);
        await AsyncStorage.setItem('admin', JSON.stringify(admin));
        dispatch(
          setAdmin({ ...admin, accessToken, tokenCreatedAt: Date.now() }),
        );

        Toast.show({
          type: 'success',
          text1: 'Welcome',
          text2: 'Successfully switched to Institution Admin dashboard.',
        });
        navigation.navigate('AdminDashboard');
      } catch (storageError) {
        console.error('Storage/Navigation Error during switch:', storageError);
      }
    } else {
      Toast.show({
        type: 'error',
        text1: 'Switch Failed',
        text2: result?.error || 'Could not switch to administrator mode.',
      });
    }
  };

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

  // If search is focused, render search overlay immediately without profile not-found flickering
  if (isSearchFocused) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <UserSearchOverlay
          currentUser={currentUser}
          navigation={navigation}
          onClose={() => setIsSearchFocused(false)}
          colors={{ primary: colors.primary, tint: colors.backgroundSecondary }}
        />
      </View>
    );
  }

  if (!profileData)
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        <View style={styles.errorStateContainer}>
          <MaterialIcons
            name={'no-accounts'}
            size={80}
            color={colors.primary}
          />
          <Text style={[styles.blockedTitle, { color: colors.text }]}>
            User Not Found
          </Text>
          <Text style={[styles.blockedSubTitle, { color: colors.text }]}>
            User account not found or has been deleted.
          </Text>
          <TouchableOpacity
            style={[styles.blockBtn, { borderColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.blockBtnText, { color: colors.primary }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );

  const isVerified = profileData.isVerified === true;
  const isExplicitlyBlockedByMe = currentUser.blockedUsers?.includes(
    profileData?.uid || identifier,
  );

  if (isBlocked) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            </View>
          }
        />
        <View style={styles.errorStateContainer}>
          <MaterialIcons
            name={isExplicitlyBlockedByMe ? 'person-off' : 'no-accounts'}
            size={80}
            color={colors.primary}
          />
          <Text style={[styles.blockedTitle, { color: colors.text }]}>
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
              <CustomButton
                title="Unblock User"
                style={styles.blockBtnMain}
                onPress={handleBlockToggle}
              />
            )}
          </View>
        </View>
      </View>
    );
  }

  const canSwitchToInstitutionAdmin =
    currentUser.isInstitutionAdmin &&
    isOwner &&
    currentUser.isVerified &&
    currentUser.usertype === 'enterprise';

  const resolvedBio =
    profileData.bio ||
    profileData.headline ||
    (profileData.usertype === 'student'
      ? `Student at ${profileData.schoolName || 'Campus'}`
      : profileData.usertype === 'lecturer'
        ? `${profileData.jobTitle || 'Lecturer'} • ${profileData.department || ''} at ${profileData.schoolName || ''}`
        : profileData.usertype === 'enterprise'
          ? `${profileData.organizationName || 'Organization'} Global Enterprise`
          : 'iCampus Community Member');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
              <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ProfileImageCarousel
          images={profileData.profilePic}
          user={{
            firstname: profileData.firstname,
            lastname: profileData.lastname,
            username: profileData.username,
            organizationName: profileData.organizationName,
          }}
        />

        {/* Reordered Layout: Identity Card First */}
        <View
          style={[
            styles.subContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View style={styles.profileInfoSection}>
            {isOwner && (
              <TouchableOpacity
                onPress={() => navigation.navigate('EditProfile')}
                style={[
                  styles.editButtonCircle,
                  { backgroundColor: colors.background },
                ]}
              >
                <MaterialIcons name="edit" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}

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
              containerStyle={{ paddingHorizontal: 15, paddingTop: 10 }}
            />

            {/* Headline Display */}
            <Text style={[styles.headlineText, { color: colors.text }]}>
              {profileData.headline || resolvedBio}
            </Text>

            {/* Follow Stats Row */}
            <View style={styles.statsRow}>
              <TouchableOpacity
                style={styles.statCountDiv}
                onPress={() =>
                  setFollowModal({
                    visible: true,
                    title: 'Followers',
                    data: profileData.followersList || [],
                  })
                }
              >
                <Text style={[styles.statNumber, { color: colors.primary }]}>
                  {formatCount(profileData.followersCount)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.text }]}>
                  Followers
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statCountDiv}
                onPress={() =>
                  setFollowingModal({
                    visible: true,
                    title: 'Following',
                    data: profileData.followingList || [],
                  })
                }
              >
                <Text style={[styles.statNumber, { color: colors.primary }]}>
                  {formatCount(profileData.followingCount)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.text }]}>
                  Following
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionButtonsContainer}>
              {!isOwner && !isBlocked && (
                <CustomButton
                  title="Block User"
                  style={styles.secondaryActionBtn}
                  onPress={handleBlockToggle}
                />
              )}
              {!isOwner && !isFollowing && (
                <CustomButton
                  title="Follow"
                  style={[
                    styles.primaryActionBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleFollowToggle}
                />
              )}
              {canSwitchToInstitutionAdmin && (
                <CustomButton
                  title="Switch to Admin"
                  style={styles.primaryActionBtn}
                  onPress={handleSwitchToInstitutionAdmin}
                />
              )}
              {isOwner && !isVerified && (
                <TouchableOpacity
                  style={[styles.verifyBtn, { borderColor: colors.primary }]}
                  onPress={() => navigation.navigate('PersonaVerify')}
                >
                  <Text
                    style={[styles.verifyBtnText, { color: colors.primary }]}
                  >
                    Get Verified
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Contact / Portfolio Links */}
            <View style={styles.contactContainer}>
              {profileData.email && !isOwner && (
                <CustomButton
                  title="Send mail"
                  style={styles.contactRowBtn}
                  onPress={() => {
                    Linking.openURL(`mailto:${profileData.email}`).catch(() =>
                      Alert.alert('Error', 'No email app found on this device'),
                    );
                  }}
                  iconName="email"
                  iconColor="#fff"
                />
              )}
              {profileData.website && (
                <CustomButton
                  title="View Portfolio"
                  style={styles.contactRowBtn}
                  onPress={() => {
                    const url = profileData.website.startsWith('http')
                      ? profileData.website
                      : `https://${profileData.website}`;
                    Linking.openURL(url).catch(() =>
                      Alert.alert('Error', "Couldn't open this website"),
                    );
                  }}
                  iconName="language"
                  iconColor="#fff"
                />
              )}
            </View>
          </View>
        </View>

        {/* About Section (Auto-Filled or Editable) */}
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
                <MaterialIcons name="edit" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.aboutContent}>
            <Text
              style={[styles.aboutText, { color: colors.text }]}
              numberOfLines={isExpanded ? undefined : 4}
              onTextLayout={onTextLayout}
            >
              {resolvedBio}
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

        {/* Skills Section */}
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
                  <MaterialIcons name="edit" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.skillsWrapper}>
              {profileData.skills.map((skill: string, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.skillChip,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text style={[styles.skillText, { color: colors.text }]}>
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Courses Section */}
        {profileData.courses && profileData.courses.length > 0 && (
          <CoursesView courses={profileData.courses} colors={colors} />
        )}

        {/* Profile Tabs & Content Feed */}
        <ProfileTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userType={profileData.usertype}
          isOwner={isOwner}
        />
        <View style={styles.tabContent}>
          {activeTab === 'Posts' && (
            <FlatList
              data={profileData.posts?.filter((p: any) => !p.isRepost) || []}
              keyExtractor={item => item.postId}
              renderItem={({ item }) => (
                <PostCard post={item} isVisible={true} />
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No posts yet.</Text>
              }
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          )}
          {activeTab === 'Reposts' && (
            <FlatList
              data={profileData.posts?.filter((p: any) => p.isRepost) || []}
              keyExtractor={item => item.postId}
              renderItem={({ item }) => (
                <PostCard post={item} isVisible={true} />
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No reposts yet.</Text>
              }
              scrollEnabled={false}
            />
          )}
          {activeTab === 'Bookmarks' && (
            <FlatList
              data={profileData.bookmarkedPosts || []}
              keyExtractor={item => item.postId}
              renderItem={({ item }) => (
                <PostCard post={item} isVisible={true} />
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No bookmarks yet.</Text>
              }
              scrollEnabled={false}
            />
          )}
          {activeTab === 'Media' && (
            <FlatList
              data={
                profileData.posts?.filter(
                  (p: any) => p.media?.url?.length > 0,
                ) || []
              }
              keyExtractor={item => item.postId}
              numColumns={3}
              renderItem={({ item }) => <MediaGridItem post={item} />}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No media found.</Text>
              }
              scrollEnabled={false}
            />
          )}
          {activeTab === 'Jobs' && (
            <FlatList
              data={
                profileData.posts?.filter((p: any) => p.postType === 'job') ||
                []
              }
              keyExtractor={item => item.postId}
              renderItem={({ item }) => (
                <PostCard post={item} isVisible={true} />
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No job listings.</Text>
              }
              scrollEnabled={false}
            />
          )}
          {activeTab === 'Events' && (
            <FlatList
              data={
                profileData.posts?.filter((p: any) => p.postType === 'event') ||
                []
              }
              keyExtractor={item => item.postId}
              renderItem={({ item }) => (
                <PostCard post={item} isVisible={true} />
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No upcoming events.</Text>
              }
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
      {!isFabMenuVisible && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setFabMenuVisible(true)}
        >
          <MaterialIcons name="widgets" size={28} color={colors.btnTextColor} />
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
      <ExpandableFAB
        isVisible={isFabMenuVisible}
        onClose={toggleFab}
        actions={['iAssistant']}
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
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {modalType === 'about' ? 'Edit About' : 'Edit Skills'}
          </Text>
          {modalType === 'about' ? (
            <>
              <TextInput
                style={[
                  styles.bioInput,
                  { color: colors.text, borderColor: colors.border },
                ]}
                multiline
                maxLength={MAX_BIO_CHAR}
                value={tempBio}
                onChangeText={setTempBio}
                placeholder="Tell people about yourself or update your headline..."
                placeholderTextColor={colors.inputTextHolder}
              />
              <Text style={[styles.charCount, { color: colors.text }]}>
                {tempBio?.length || 0} / {MAX_BIO_CHAR}
              </Text>
            </>
          ) : (
            <>
              <View
                style={[
                  styles.skillInputWrapper,
                  { borderColor: colors.border },
                ]}
              >
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
                  <View
                    key={index}
                    style={[
                      styles.activeSkillChip,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Text
                      style={[styles.activeSkillText, { color: colors.text }]}
                    >
                      {skill}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setTempSkills(
                          tempSkills.filter((s: string) => s !== skill),
                        )
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
                        style={[
                          styles.suggestionChip,
                          { backgroundColor: colors.background },
                        ]}
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
                          size={16}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            </>
          )}
          <CustomButton
            title={isSaving ? 'Saving...' : 'Save Changes'}
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={isSaving}
          />
        </View>
      </Modal>
    </View>
  );
};
const styles = StyleSheet.create({
  blockedContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    flex: 1,
  },
  headerRightDiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bioText: { fontSize: 14, marginBottom: 10, paddingHorizontal: 15 },
  statCount: { fontWeight: 'bold', fontSize: 12 },
  rowDiv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  contactRow: {
    alignItems: 'center',
    width: 'auto',
    paddingHorizontal: 15,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  blockBtnMain: {
    paddingHorizontal: 15,
    width: 'auto',
  },
  followBtnText: {
    fontSize: 14,
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
  skillInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 60,
    borderRadius: 10,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
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
  saveButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: PRIMARY_COLOR,
    bottom: 80,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  subContainer: {
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileInfoSection: {
    padding: 16,
  },
  editButtonCircle: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headlineText: {
    fontSize: 14,
    lineHeight: 20,
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginVertical: 12,
    gap: 20,
  },
  statCountDiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  primaryActionBtn: {
    flex: 1,
    borderRadius: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    borderRadius: 10,
  },
  contactContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  contactRowBtn: {
    flex: 1,
    borderRadius: 10,
  },
  verifyBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    fontWeight: '600',
  },
  sectionContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    elevation: 2,
  },
  sectionTitleDiv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  aboutContent: {
    marginTop: 4,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
  },
  seeMoreButton: {
    marginTop: 6,
  },
  seeMoreText: {
    fontWeight: '600',
  },
  skillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  skillText: {
    fontSize: 13,
  },
  tabContent: {
    marginTop: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
  errorStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  blockedTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 15,
  },
  blockedSubTitle: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },
  blockedBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  blockBtn: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  blockBtnText: {
    fontWeight: '600',
  },
  modalBottom: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContainer: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  charCount: {
    alignSelf: 'flex-end',
    marginTop: 6,
    fontSize: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  skillSearchInput: {
    flex: 1,
    fontSize: 14,
  },
  addBtnText: {
    fontWeight: '700',
  },
  activeScroll: {
    marginVertical: 12,
  },
  activeSkillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    gap: 6,
  },
  activeSkillText: {
    fontSize: 13,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  suggestionText: {
    fontSize: 13,
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 12,
  },
});
