import React, {
  useState,
  useEffect,
  useRef
} from 'react';
import { View, FlatList, Dimensions, TouchableOpacity, Linking, Alert, Text, ActivityIndicator, ScrollView, StyleSheet, FlatList, TextInput, Image} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../components/hooks';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { baseUrl } from '../components/HomeScreenComponents';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '@components/Classroomcomponent';
import {PageHeader} from '../components/PageHeader';
import  {ProfileImageCarousel} from '../components/ProfileImageCarousel';
import {UserIdentity} from '../components/UserIdentity';
import { PRIMARY_COLOR_TINT_MAIN } from 'assets/styles/colors';
import {ITagCard} from '../components/iTag';
import {Course} from '../types/firebase'

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;

const CourseCard = ({ item }: { item: Course }) => (
  <TouchableOpacity style={styles.courseCard} activeOpacity={0.9}>
    <View style={styles.courseIconContainer}>
      <MaterialIcons name="auto-stories" size={24} color={PRIMARY_COLOR_TINT_MAIN} />
    </View>
    <View style={styles.courseInfo}>
      <Text style={styles.courseName} numberOfLines={1}>{item.courseTitle}</Text>
      {item.courseCode && (
          <Text style={styles.courseCode} numberOfLines={1}>{item.courseCode}</Text>
      )}
      {item.session && (
        <View style={styles.courseMeta}>
            <Text style={styles.courseMetaText}>{item.session}</Text>
            <Text style={styles.courseMetaText}>{item.semester}</Text>
        </View>
      )}  
    </View>
  </TouchableOpacity>
);
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
        keyExtractor={(item) => item._id}
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
    const { uid } = route.params; // Target user
    const currentUser = useAppSelector(state => state.user);
    const isOwner = currentUser.uid === uid;
    const navigation = useNavigation<any>();
    const [profileData, setProfileData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('Posts');
    const [showFollowModal, setShowFollowModal] = useState({ visible: false, type: 'Followers' });
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    // Fetch Logic
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get(`${baseUrl}users/profile/search/${uid}`, {
                    params: {
                        viewerUid: currentUser.uid,
                        viewerTier: currentUser.tier,
                        viewerRole: currentUser.usertype
                    }
                });
                setProfileData(res.data.data);
            } catch (error: any) {
                console.error(error);
                Toast.show({
                    type: 'error',
                    text1: 'Fetch Error',
                    text2: error?.message || "An unexpected error occurred", 
                });
            }
        };
        fetchProfile();
    }, [uid, currentUser.uid, currentUser.tier, currentUser.usertype ]);
    if (!profileData) return <ActivityIndicator style={{ flex: 1 }} />;
    const isIscoreViewEligible = currentUser.tier !== 'free';
    return (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
            {!isSearchFocused ? (
                <PageHeader 
                    title='Profile'
                    rightElement={
                        <View style={styles.headerRightDiv}>
                            {/* Search Trigger Icon */}
                            <TouchableOpacity onPress={() => setIsSearchFocused(true)} style={{ marginRight: 15 }}>
                                <MaterialIcons name="search" size={23} color={PRIMARY_COLOR} />
                            </TouchableOpacity>
                            {isOwner && (
                                <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                                    <MaterialIcons name="settings" size={23} color={PRIMARY_COLOR} />
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
                        <MaterialIcons name="arrow-back" size={24} color={PRIMARY_COLOR_TINT} />
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
            <ProfileImageCarousel images={profileData.profilePic} isOwner={isOwner} uid={currentUser.uid} />
            {/* 1. Essential Info Section */}
            <View style={styles.profileInfoSection}>
                <TouchableOpacity
                    //onPress={() => navigation.navigate('EditProfile')}
                    style={styles.editButtonCircle}
                >
                    <MaterialIcons 
                        name="edit" 
                        size={20} 
                        color={PRIMARY_COLOR} 
                    />
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
                {isOwner || isIscoreViewEligible && (
                    <View style={styles.iScoreChip}>
                        <Text style={styles.iScoreLabel}>iScore</Text>
                        <Text style={styles.iScoreValue}>
                            {profileData.currentIScore}
                        </Text>
                    </View>
                )}
                {/* 3. Verification CTA (Other Users) */}
                {isOwner && (
                    <TouchableOpacity style={styles.verifyBtn}>
                        <Text style={styles.verifyBtnText}>Get Verified</Text>
                    </TouchableOpacity>
                )}
                {/* 4. Bio section */}
                <Text style={styles.bioText}>
                    {profileData.bio 
                        ? profileData.bio 
                            : profileData.usertype === 'student' 
                        ? `Student at ${profileData.schoolName}` 
                            : `${profileData.jobTitle || 'Lecturer'} in ${profileData.department} at ${profileData.schoolName}`
                    }
                </Text>
                {/* 5. Follow section */}
                <View style={styles.statsRow}>
                    <TouchableOpacity style={styles.statCountDiv} onPress={() => setShowFollowModal({ visible: true, type: 'Followers' })}>
                        <Text style={[styles.statCount, {marginRight: 4}]}>{profileData.followersCount || 0}</Text> 
                        <Text style={styles.statCount}>Followers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.statCountDiv} onPress={() => setShowFollowModal({ visible: true, type: 'Following' })}>
                        <Text style={[styles.statCount, {marginRight: 4}]}>{profileData.followingCount || 0}</Text> 
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
                                        Alert.alert("Error", "No email app found on this device")
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
                                    Linking.openURL(url).catch( () => 
                                        Alert.alert("Error", "Couldn't open this website")
                                    );
                                }
                            }}
                        >
                            <View style={styles.iconCircle}>
                                <MaterialIcons name="language" size={18} color="#fff" />
                            </View>
                            <View style={styles.contactTextContainer}>
                                <Text style={styles.contactValue}>
                                    Website
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {/* 2. iTag Section */}
            <View style={styles.iTagDiv}>
                <ITagCard 
                    iTagData={profileData.iTagData} 
                    isPremium={profileData.tier === 'premium'} 
                    isOwner={isOwner} 
                />
                {isOwner && isIscoreViewEligible && (
                    <TouchableOpacity 
                        style={styles.editButtonCircle}
                        //onPress={() => navigation.navigate('EditITag', { iTagData })}
                    >
                        <MaterialIcons 
                            name="edit" 
                            size={20} 
                            color={PRIMARY_COLOR} 
                        />
                    </TouchableOpacity>
                )}
            </View>
            {/* 3. Courses View */}
            {profileData.courses && profileData.courses.length > 0 && (
                <CoursesView courses={profileData.courses} />
            )}
            {/* 4. Tabs View (Posts / Courses / Bookmarks) */}
            <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} userType={profileData.usertype} />
            <View style={styles.tabContent}>
                {/* Map content based on activeTab */}
            </View>
      {isSearchFocused && (
      <View style={styles.searchOverlayScreen}>
        {searchResults.length > 0 ? (
          <FlatList 
            data={searchResults}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.searchResultRow}
                onPress={() => {
                  setIsSearchFocused(false);
                  navigation.push('Profile', { uid: item.uid }); // push allows navigating to another profile from a profile
                }}
              >
                <Image source={{ uri: item.profilePic?.[0] }} style={styles.miniAvatar} />
                <View>
                  <Text style={styles.resultName}>{item.firstname} {item.lastname}</Text>
                  <Text style={styles.resultSub}>{item.usertype} • {item.displayScore}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.searchEmptyState}>
            <Text style={{ color: '#676D75' }}>
              {searchQuery.length < 2 ? "Start typing to find talent..." : "No results found"}
            </Text>
          </View>
        )}
      </View>
    )}
      {/* Followers Modal Component here */}
      <Toast config={toastConfig} />
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  headerRightDiv:{
    flexDirection: 'row',
    alignItems: 'center'
  },
  profileInfoSection: { paddingHorizontal: 20, backgroundColor: '#fadccc', position: 'relative', marginVertical: 15},
  bioText: { fontSize: 13, color: '#222', marginVertical: 10 },
  statsRow: { flexDirection: 'row', gap: 20 },
  statCount: { fontWeight: 'bold', color: PRIMARY_COLOR, fontSize: 13 },
  
  // Metric Bar (iScore/iTag)
  metricBar: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    padding: 15,
    marginTop: 20,
    alignItems: 'center',
  },
  metricItem: { flex: 1, alignItems: 'center' },
  metricDivider: { width: 1, height: '80%', backgroundColor: '#DDD' },
  metricLabel: { fontSize: 10, color: '#676D75', textTransform: 'uppercase' },
  metricValue: { fontSize: 16, fontWeight: '900', color: PRIMARY_COLOR },

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
    borderBottomWidth: .8,
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
    top: 60, // Sits exactly below the header
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    zIndex: 999, // Above everything
    paddingTop: 10,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F2F5',
  },
  miniAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 15,
    backgroundColor: '#F0F2F5',
  },
  resultName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  resultSub: {
    fontSize: 12,
    color: '#676D75',
    marginTop: 2,
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
    alignItems: 'baseline'
  },
  iScoreLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '900',
    marginRight: 5
  },
  iScoreValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
  },
  statCountDiv: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  editButtonCircle: {
    position: 'absolute' ,
    top: 10,
    right: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactContainer: {
    marginVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
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
    borderWidth: .8,
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
  iTagDiv:{
    position: 'relative',
    paddingHorizontal: 10
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
  courseCard: {
    width: CARD_WIDTH,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    marginRight: 15,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  courseIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT_MAIN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseInfo: {
    marginTop: 8
  },
  courseCode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PRIMARY_COLOR_TINT_MAIN,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  courseName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: PRIMARY_COLOR_TINT_MAIN,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  courseMetaText: {
    fontSize: 11,
    color: PRIMARY_COLOR_TINT_MAIN,
  },
  sectionContainer: {
    marginVertical: 20,
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
    color: '#1A1D1E',
  },
});