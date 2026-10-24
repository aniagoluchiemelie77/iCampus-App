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
  Share,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
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
import { useProfileTab } from '../hooks/useProfileTab.ts';
import { fetchProfileConnectionsAPI } from '../api/localGetApis.ts';
import moment from 'moment';
import { parseFirestoreDate } from '../utils/dateFormatter';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.82;
const CARD_HEIGHT = 200;
const CARD_GAP = 16;
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
        style={[styles.courseCard, { borderColor: colors.border }]}
        activeOpacity={0.85}
        onPress={() => setModalVisible(true)}
      >
        {/* Visual thumbnail area */}
        <View style={styles.thumbnailArea}>
          {isProfessional ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.academicPlaceholder}>
              <MaterialIcons
                name="auto-stories"
                size={32}
                color={colors.primary}
              />
            </View>
          )}
          {/* Active status corner chip */}
          {item.isActive !== false && (
            <View style={styles.statusBadge}>
              <Text style={[styles.statusText, { color: colors.btnTextColor }]}>
                Active
              </Text>
            </View>
          )}
        </View>

        {/* Details body */}
        <View style={styles.courseBody}>
          <Text
            style={[styles.courseName, { color: colors.text }]}
            numberOfLines={2}
          >
            {item.courseTitle}
          </Text>
          {item.courseCode && (
            <Text style={[styles.courseCode, { color: colors.textDarker }]}>
              {item.courseCode}
            </Text>
          )}
          {!isProfessional && item.session && item.semester && (
            <View style={styles.courseMeta}>
              <Text
                style={[styles.courseMetaText, { color: colors.textDarker }]}
              >
                {item.session}
              </Text>
              <Text
                style={[
                  styles.courseMetaSeparator,
                  { color: colors.textDarker },
                ]}
              >
                |
              </Text>
              <Text
                style={[styles.courseMetaText, { color: colors.textDarker }]}
              >
                {item.semester}
              </Text>
            </View>
          )}
          {isProfessional && (
            <View style={styles.courseMeta}>
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={14} color={colors.primary} />
                <Text style={[styles.ratingText, { color: colors.textDarker }]}>
                  {item.rating || '4.5'}
                </Text>
              </View>
              <View style={styles.ratingRow}>
                <MaterialIcons
                  name="access-time"
                  size={14}
                  color={colors.primary}
                />
                <Text
                  style={[styles.durationText, { color: colors.textDarker }]}
                >
                  {formatTime(item.courseDuration)}
                </Text>
              </View>
            </View>
          )}
        </View>
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
        snapToInterval={courses.length > 1 ? CARD_WIDTH + CARD_GAP : 0}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: courses.length > 1 ? 16 : 0,
          paddingRight: courses.length > 1 ? 16 : 0,
        }}
        getItemLayout={(data, index) => ({
          length: CARD_WIDTH + CARD_GAP,
          offset: (CARD_WIDTH + CARD_GAP) * index,
          index,
        })}
      />
    </View>
  );
};
// Items shown inline per tab before "View all" (the rest page in on the
// ProfileContentList screen).
const PROFILE_PREVIEW_COUNT = 5;

const ProfileTabSection = ({
  uid,
  tab,
  initial,
  emptyText,
  isMedia = false,
}: {
  uid: string;
  tab: string;
  initial?: any;
  emptyText: string;
  isMedia?: boolean;
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { items, hasMore, loading, error, reload } = useProfileTab(
    uid,
    tab,
    initial,
    PROFILE_PREVIEW_COUNT,
  );

  if (loading && items.length === 0) {
    return (
      <ActivityIndicator
        style={{ marginVertical: 24 }}
        color={colors.primary}
      />
    );
  }
  if (error && items.length === 0) {
    return (
      <TouchableOpacity style={styles.tabState} onPress={reload}>
        <Text style={[styles.emptyText, { color: colors.text }]}>{error}</Text>
        <Text style={[styles.tabRetry, { color: colors.primary }]}>
          Tap to retry
        </Text>
      </TouchableOpacity>
    );
  }
  if (items.length === 0) {
    return (
      <View style={styles.tabState}>
        <MaterialIcons
          name={isMedia ? 'photo-library' : 'article'}
          size={30}
          color={colors.text}
          style={{ opacity: 0.5 }}
        />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          {emptyText}
        </Text>
      </View>
    );
  }
  return (
    <View>
      {isMedia ? (
        <View style={styles.mediaGrid}>
          {items.map(item => (
            // Three per row inside the 12px side padding.
            <MediaGridItem
              key={item.postId}
              post={item}
              size={(width - 24) / 3 - 2}
            />
          ))}
        </View>
      ) : (
        items.map(item => <PostCard key={item.postId} post={item} isVisible />)
      )}
      {hasMore && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.viewAllBtn, { borderColor: colors.border }]}
          onPress={() =>
            navigation.navigate('ProfileContentList', {
              identifier: uid,
              tab,
              title: tab,
              isMedia,
            })
          }
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>
            View all {tab.toLowerCase()}
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={18}
            color={colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * About text for profiles without a bio, so no account type (organizations
 * and general members included) shows an empty or missing About section.
 */
const buildDefaultAbout = (p: any): string => {
  const first = p.firstname || p.username || 'This member';
  const where = p.country ? ` based in ${p.country}` : '';
  const joinedDate = p.createdAt
    ? moment(parseFirestoreDate(p.createdAt))
    : null;
  const joined =
    joinedDate && joinedDate.isValid()
      ? ` Joined iCampus in ${joinedDate.format('MMMM YYYY')}.`
      : '';
  const dept = p.department ? ` in ${p.department}` : '';
  const school = p.schoolName ? ` at ${p.schoolName}` : '';

  switch (p.usertype) {
    case 'enterprise': {
      const org = p.organizationName || 'This organization';
      return `${org} is an organization on iCampus${where}. Follow ${org} for their latest updates, job openings, events and store listings.${joined}`;
    }
    case 'lecturer':
      return `${first} is a ${p.jobTitle || 'lecturer'}${dept}${school}, sharing course materials, schedules and updates on iCampus.${joined}`;
    case 'student':
      return `${first} is a student${dept}${school}, learning and connecting on iCampus.${joined}`;
    case 'otherUser':
    default:
      return `${first} is part of the iCampus community${where}${p.jobTitle ? `, working as ${p.jobTitle}` : ''}. Follow ${first} to see their posts, listings and activity.${joined}`;
  }
};

const ROLE_META: Record<string, { label: string; icon: string }> = {
  student: { label: 'Student', icon: 'school' },
  lecturer: { label: 'Lecturer', icon: 'co-present' },
  enterprise: { label: 'Organization', icon: 'business' },
  otherUser: { label: 'Member', icon: 'person' },
};

const MetaChip = ({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  colors: any;
}) => (
  <TouchableOpacity
    disabled={!onPress}
    onPress={onPress}
    activeOpacity={0.7}
    style={[styles.metaChip, { backgroundColor: colors.background }]}
  >
    <MaterialIcons name={icon} size={14} color={colors.primary} />
    <Text
      style={[
        styles.metaChipText,
        { color: onPress ? colors.primary : colors.text },
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const StatTile = ({
  value,
  label,
  onPress,
  loading,
  colors,
}: {
  value: number;
  label: string;
  onPress?: () => void;
  loading?: boolean;
  colors: any;
}) => (
  <TouchableOpacity
    disabled={!onPress || loading}
    onPress={onPress}
    activeOpacity={0.7}
    style={styles.statTile}
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={`${value} ${label}`}
  >
    {loading ? (
      <ActivityIndicator size="small" color={colors.primary} />
    ) : (
      <Text style={[styles.statTileValue, { color: colors.textDarker }]}>
        {formatCount(value || 0)}
      </Text>
    )}
    <Text style={[styles.statTileLabel, { color: colors.text }]}>{label}</Text>
  </TouchableOpacity>
);

export const ProfileScreen = ({ route }: any) => {
  const { colors } = useTheme();
  const { identifier } = route.params || {};
  const currentUser = useAppSelector((state: any) => state.user) || {};
  const dispatch = useDispatch();

  const {
    profileData,
    status,
    errorMessage,
    blockedByViewer,
    isFollowing,
    followBusy,
    blockBusy,
    fetchProfile,
    updateLocalProfile,
    handleFollowToggle,
    handleBlockToggle,
  } = useProfileData(identifier, currentUser);

  const { tempBio, setTempBio, tempSkills, setTempSkills } =
    useProfileEditing(profileData);

  const isOwner =
    profileData?.isOwner === true ||
    currentUser.uid === identifier ||
    (!!currentUser.username && currentUser.username === identifier);

  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState('Posts');
  const [isSaving, setIsSaving] = useState(false);
  const [connections, setConnections] = useState<{
    type: 'followers' | 'following' | null;
    data: any[];
    loading: 'followers' | 'following' | null;
  }>({ type: null, data: [], loading: null });
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
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);

  const onTextLayout = (e: any) => {
    if (!isExpanded) setNumLines(e.nativeEvent.lines.length);
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

  const openConnections = async (type: 'followers' | 'following') => {
    if (!profileData?.uid || connections.loading) return;
    setConnections(c => ({ ...c, loading: type }));
    const res = await fetchProfileConnectionsAPI({
      uid: profileData.uid,
      type,
    });
    if (!res.success) {
      Toast.show({ type: 'error', text2: `Could not load ${type}.` });
      setConnections({ type: null, data: [], loading: null });
      return;
    }
    setConnections({ type, data: res.users, loading: null });
  };

  const confirmBlock = () => {
    setMoreMenuVisible(false);
    const name = profileData?.firstname || 'this user';
    Alert.alert(
      `Block ${name}?`,
      `${name} won't be able to see your profile or posts, and you'll unfollow each other.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: handleBlockToggle },
      ],
    );
  };

  const profileLink = profileData
    ? `https://useicampus.io/user/${profileData.username || profileData.uid}`
    : '';
  const shareProfile = async () => {
    setMoreMenuVisible(false);
    try {
      await Share.share({
        message: `Check out ${profileData?.firstname || 'this profile'} on iCampus: ${profileLink}`,
      });
    } catch {
      // Share sheet dismissed.
    }
  };

  const handleSwitchToInstitutionAdmin = async () => {
    if (isSwitching) return;
    setIsSwitching(true);
    const result = await switchToAdminApi(currentUser.uid);
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
        setApiSuggestions(
          data.map(
            (item: any) =>
              item.word.charAt(0).toUpperCase() + item.word.slice(1),
          ),
        );
      } catch (error) {
        console.error('Skill API error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    const timer = setTimeout(fetchUniversalSkills, 400);
    return () => clearTimeout(timer);
  }, [skillInput]);

  const header = (
    <PageHeader
      title="Profile"
      rightElement={
        <View style={styles.headerRightDiv}>
          <TouchableOpacity
            onPress={() => setIsSearchFocused(true)}
            style={{ marginRight: 6 }}
            accessibilityLabel="Search people"
          >
            <MaterialIcons name="search" size={23} color={colors.primary} />
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              accessibilityLabel="Settings"
            >
              <MaterialIcons name="settings" size={23} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      }
    />
  );

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

  if (status === 'loading' && !profileData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <View style={styles.errorStateContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (status !== 'ready' || !profileData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <View style={styles.errorStateContainer}>
          <MaterialIcons
            name={status === 'error' ? 'cloud-off' : 'no-accounts'}
            size={72}
            color={colors.primary}
          />
          <Text style={[styles.blockedTitle, { color: colors.textDarker }]}>
            {status === 'error' ? "Couldn't load profile" : 'User not found'}
          </Text>
          <Text style={[styles.blockedSubTitle, { color: colors.text }]}>
            {status === 'error'
              ? errorMessage || 'Check your connection and try again.'
              : 'This account was not found or has been deleted.'}
          </Text>
          <View style={styles.blockedBtnRow}>
            <TouchableOpacity
              style={[styles.blockBtn, { borderColor: colors.primary }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.blockBtnText, { color: colors.primary }]}>
                Go back
              </Text>
            </TouchableOpacity>
            {status === 'error' && (
              <CustomButton
                title="Try again"
                style={styles.blockBtnMain}
                onPress={fetchProfile}
              />
            )}
          </View>
        </View>
      </View>
    );
  }

  const isVerified = profileData.isVerified === true;
  const canSwitchToInstitutionAdmin =
    currentUser.isInstitutionAdmin &&
    isOwner &&
    currentUser.isVerified &&
    currentUser.usertype === 'enterprise';
  const role = ROLE_META[profileData.usertype] || ROLE_META.otherUser;

  // "Lecturer • Petroleum Eng. at FUPRE" with empty parts left out (it used
  // to render as "Lecturer •  at").
  const builtHeadline =
    profileData.usertype === 'enterprise'
      ? profileData.organizationName || ''
      : [
          [
            profileData.jobTitle ||
              (profileData.usertype === 'lecturer'
                ? 'Lecturer'
                : profileData.usertype === 'student'
                  ? 'Student'
                  : ''),
            profileData.department,
          ]
            .filter(Boolean)
            .join(' · '),
          profileData.schoolName,
        ]
          .filter(Boolean)
          .join(' at ');
  const headline =
    profileData.headline || builtHeadline || 'iCampus community member';
  const hasOwnBio = !!profileData.bio?.trim();
  const aboutText = hasOwnBio
    ? profileData.bio
    : buildDefaultAbout(profileData);
  const websiteLabel = profileData.website
    ?.replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  const openWebsite = () => {
    const url = profileData.website.startsWith('http')
      ? profileData.website
      : `https://${profileData.website}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', "Couldn't open this website"),
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {header}
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

        {/* Identity */}
        <View
          style={[
            styles.identityCard,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View style={styles.identityTop}>
            <View style={{ flex: 1 }}>
              <UserIdentity
                firstname={profileData.firstname}
                lastname={profileData.lastname}
                username={profileData.username}
                tier={profileData.tier}
                isVerified={profileData.isVerified}
                showVerifyIcon
                size="large"
                isOrganization={profileData.usertype === 'enterprise'}
                organizationName={profileData.organizationName}
                containerStyle={styles.identityName}
              />
              <Text style={[styles.headlineText, { color: colors.text }]}>
                {headline}
              </Text>
            </View>
            {isOwner && (
              <TouchableOpacity
                onPress={() => navigation.navigate('EditProfile')}
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.btnColor },
                ]}
                accessibilityLabel="Edit profile"
              >
                <MaterialIcons
                  name="edit"
                  size={18}
                  color={colors.btnTextColor}
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.metaChips}>
            <MetaChip icon={role.icon} label={role.label} colors={colors} />
            {!!profileData.schoolName && (
              <MetaChip
                icon="account-balance"
                label={profileData.schoolName}
                colors={colors}
              />
            )}
            {!!websiteLabel && (
              <MetaChip
                icon="link"
                label={websiteLabel}
                onPress={openWebsite}
                colors={colors}
              />
            )}
          </View>

          <View
            style={[styles.statTiles, { borderColor: colors.border + '55' }]}
          >
            <StatTile
              value={profileData.postsCount}
              label="Posts"
              colors={colors}
              onPress={() => setActiveTab('Posts')}
            />
            <View
              style={[
                styles.statDivider,
                { backgroundColor: colors.border + '55' },
              ]}
            />
            <StatTile
              value={profileData.followersCount}
              label="Followers"
              colors={colors}
              loading={connections.loading === 'followers'}
              onPress={() => openConnections('followers')}
            />
            <View
              style={[
                styles.statDivider,
                { backgroundColor: colors.border + '55' },
              ]}
            />
            <StatTile
              value={profileData.followingCount}
              label="Following"
              colors={colors}
              loading={connections.loading === 'following'}
              onPress={() => openConnections('following')}
            />
          </View>

          {isOwner ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: colors.primary }]}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <MaterialIcons name="edit" size={17} color={colors.primary} />
                <Text
                  style={[styles.outlineBtnText, { color: colors.primary }]}
                >
                  Edit profile
                </Text>
              </TouchableOpacity>
              {!isVerified && (
                <CustomButton
                  title="Get verified"
                  iconName="verified"
                  style={styles.fillBtn}
                  onPress={() => navigation.navigate('PersonaVerify')}
                />
              )}
              {canSwitchToInstitutionAdmin && (
                <CustomButton
                  title="Switch to admin"
                  iconName="admin-panel-settings"
                  style={styles.fillBtn}
                  onPress={handleSwitchToInstitutionAdmin}
                  isLoading={isSwitching}
                />
              )}
            </View>
          ) : (
            <View style={styles.actionRow}>
              {isFollowing ? (
                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: colors.primary }]}
                  onPress={handleFollowToggle}
                  disabled={followBusy}
                  accessibilityLabel="Unfollow"
                >
                  <MaterialIcons
                    name="check"
                    size={17}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.outlineBtnText, { color: colors.primary }]}
                  >
                    Following
                  </Text>
                </TouchableOpacity>
              ) : (
                <CustomButton
                  title="Follow"
                  iconName="person-add"
                  style={styles.fillBtn}
                  onPress={handleFollowToggle}
                  disabled={followBusy}
                />
              )}
              {!!profileData.email && (
                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: colors.primary }]}
                  onPress={() =>
                    Linking.openURL(`mailto:${profileData.email}`).catch(() =>
                      Alert.alert('Error', 'No email app found on this device'),
                    )
                  }
                >
                  <MaterialIcons
                    name="mail-outline"
                    size={17}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.outlineBtnText, { color: colors.primary }]}
                  >
                    Message
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.squareBtn, { borderColor: colors.border }]}
                onPress={() => setMoreMenuVisible(true)}
                accessibilityLabel="More options"
              >
                <MaterialIcons
                  name="more-horiz"
                  size={22}
                  color={colors.textDarker}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* About (always shown; falls back to a per-account-type default) */}
        {!!aboutText && (
          <View
            style={[
              styles.sectionContainer,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <View style={styles.sectionTitleDiv}>
              <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>
                About
              </Text>
              {isOwner && (
                <TouchableOpacity
                  onPress={() => {
                    setModalType('about');
                    setEditModalVisible(true);
                  }}
                  accessibilityLabel="Edit about"
                >
                  <MaterialIcons name="edit" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            <Text
              style={[
                styles.aboutText,
                { color: colors.text },
                !hasOwnBio && styles.defaultAboutText,
              ]}
              numberOfLines={isExpanded ? undefined : 4}
              onTextLayout={onTextLayout}
            >
              {aboutText}
            </Text>
            {!!numLines && numLines > 4 && (
              <TouchableOpacity
                onPress={() => setIsExpanded(!isExpanded)}
                style={styles.seeMoreButton}
              >
                <Text style={[styles.seeMoreText, { color: colors.primary }]}>
                  {isExpanded ? 'Show less' : 'See more'}
                </Text>
              </TouchableOpacity>
            )}
            {isOwner && !hasOwnBio && (
              <TouchableOpacity
                onPress={() => {
                  setModalType('about');
                  setEditModalVisible(true);
                }}
                style={styles.writeOwnBtn}
                accessibilityRole="button"
              >
                <MaterialIcons
                  name="edit-note"
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.seeMoreText, { color: colors.primary }]}>
                  This is a default description. Write your own
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Skills */}
        {(profileData.skills?.length > 0 || isOwner) && (
          <View
            style={[
              styles.sectionContainer,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <View style={styles.sectionTitleDiv}>
              <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>
                Skills
              </Text>
              {isOwner && (
                <TouchableOpacity
                  onPress={() => {
                    setModalType('skills');
                    setEditModalVisible(true);
                  }}
                  accessibilityLabel="Edit skills"
                >
                  <MaterialIcons
                    name={profileData.skills?.length ? 'edit' : 'add'}
                    size={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>
            {profileData.skills?.length > 0 ? (
              <View style={styles.skillsWrapper}>
                {profileData.skills.map((skill: string, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.skillChip,
                      { backgroundColor: colors.primary + '14' },
                    ]}
                  >
                    <Text style={[styles.skillText, { color: colors.primary }]}>
                      {skill}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.placeholderText, { color: colors.text }]}>
                Add skills so people know what you're good at.
              </Text>
            )}
          </View>
        )}

        {profileData.courses?.length > 0 && (
          <CoursesView courses={profileData.courses} colors={colors} />
        )}

        <ProfileTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userType={profileData.usertype}
          isOwner={isOwner}
        />
        <View style={styles.tabContent}>
          <ProfileTabSection
            key={activeTab}
            uid={profileData.uid}
            tab={activeTab}
            initial={profileData.initialContent}
            isMedia={activeTab === 'Media'}
            emptyText={
              {
                Posts: isOwner ? "You haven't posted yet." : 'No posts yet.',
                Reposts: 'No reposts yet.',
                Bookmarks: 'No bookmarks yet.',
                Media: 'No photos or videos yet.',
                Jobs: 'No job listings.',
                Events: 'No upcoming events.',
              }[activeTab] || 'Nothing here yet.'
            }
          />
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
        visible={connections.type === 'followers'}
        title="Followers"
        data={connections.data}
        navigation={navigation}
        onClose={() => setConnections({ type: null, data: [], loading: null })}
      />
      <FollowingListModal
        visible={connections.type === 'following'}
        title="Following"
        data={connections.data}
        navigation={navigation}
        onClose={() => setConnections({ type: null, data: [], loading: null })}
      />
      <ExpandableFAB
        isVisible={isFabMenuVisible}
        onClose={toggleFab}
        actions={['iAssistant']}
      />

      {/* More options (other people's profiles) */}
      <Modal
        isVisible={moreMenuVisible}
        onBackdropPress={() => setMoreMenuVisible(false)}
        onBackButtonPress={() => setMoreMenuVisible(false)}
        swipeDirection="down"
        onSwipeComplete={() => setMoreMenuVisible(false)}
        style={styles.modalBottom}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View
            style={[styles.sheetHandle, { backgroundColor: colors.border }]}
          />
          <TouchableOpacity
            style={styles.sheetItem}
            onPress={() => {
              Clipboard.setString(profileLink);
              setMoreMenuVisible(false);
              Toast.show({ type: 'success', text2: 'Profile link copied' });
            }}
          >
            <MaterialIcons name="link" size={22} color={colors.textDarker} />
            <Text style={[styles.sheetText, { color: colors.textDarker }]}>
              Copy profile link
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetItem} onPress={shareProfile}>
            <MaterialIcons
              name="ios-share"
              size={22}
              color={colors.textDarker}
            />
            <Text style={[styles.sheetText, { color: colors.textDarker }]}>
              Share profile
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetItem}
            onPress={confirmBlock}
            disabled={blockBusy}
          >
            <MaterialIcons name="block" size={22} color={colors.primary} />
            <Text style={[styles.sheetText, { color: colors.primary }]}>
              Block {profileData.firstname || 'user'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

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
  identityCard: {
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  identityTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  identityName: {
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: 'transparent',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  metaChipText: { fontSize: 12.5, fontWeight: '600', flexShrink: 1 },
  statTiles: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
    minHeight: 40,
    justifyContent: 'center',
  },
  statTileValue: { fontSize: 18, fontWeight: '800' },
  statTileLabel: { fontSize: 12, marginTop: 2, opacity: 0.8 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 28 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  fillBtn: {
    flex: 1,
    width: 'auto',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 12,
  },
  outlineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '700' },
  squareBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 13.5, opacity: 0.7, lineHeight: 20 },
  tabState: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  tabRetry: { fontSize: 13, fontWeight: '700' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  sheetText: { fontSize: 15.5, fontWeight: '600' },
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
  proInfo: {
    padding: 10,
  },
  description: {
    fontSize: 12,
    marginVertical: 5,
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
    marginRight: CARD_GAP,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  thumbnailArea: {
    width: '100%',
    height: 115,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F5F5F5',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  academicPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  courseBody: {
    padding: 12,
    paddingTop: 10,
  },
  courseName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 20,
  },
  courseCode: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginBottom: 6,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  courseMetaText: {
    fontSize: 11,
    color: '#666',
  },
  courseMetaSeparator: {
    fontSize: 11,
    color: '#999',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
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
  defaultAboutText: { opacity: 0.8 },
  writeOwnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
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
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 11,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
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
