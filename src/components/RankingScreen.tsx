import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  TextInput,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT, PRIMARY_COLOR_TINT_MAIN} from './Classroomcomponent';
import { User, RankCardCarouselProps, iCampusOperationalInstitutionSchema } from 'types/firebase';
import { NavigationProp } from '@react-navigation/native';
import { RankCard } from './IscoreRankCard';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from './hooks';
import { baseUrl } from './HomeScreenComponents';
import moment from 'moment';
import axios from 'axios';
import LinearGradient from 'react-native-linear-gradient';
import {DEFAULT_GRADIENT, rankColors} from '../assets/styles/colors';
import Toast from 'react-native-toast-message';
import toastConfig from './ToastConfig';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = 160; // Card width
const ITEM_SPACING = (width - ITEM_WIDTH) / 2;

interface UserScoreHeaderProps {
  score: number;
  previousScore: number;
  nextUpdateDate: string | Date;
  searchQuery: string;
  searchResults: User[];
  navigation: NavigationProp<any>;
  isLocked: boolean;
  userRole: string;
}
interface InstitutionItemProps {
  item: iCampusOperationalInstitutionSchema;
  index: number;
}
interface searchBarProps {
  value: string,
  placeholder: string,
  onChange: (text: string) => void;
}

export const EliteCarousel: React.FC<RankCardCarouselProps> = ({
  data,
  userRole,
  navigation,
}) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  // --- Auto-Scroll Logic ---
  useEffect(() => {
    const timer = setInterval(() => {
      if (data && data.length > 0) {
        let nextIndex = index + 1;
        if (nextIndex >= data.length) nextIndex = 0;
        setIndex(nextIndex);
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [index, data]);

  return (
    <View style={styles.carouselContainer}>
      <Animated.FlatList
        ref={flatListRef}
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: ITEM_SPACING, //
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        keyExtractor={item => item.uid}
        renderItem={({ item, index: i }) => {
          // --- Animation Logic ---
          const inputRange = [
            (i - 1) * ITEM_WIDTH,
            i * ITEM_WIDTH,
            (i + 1) * ITEM_WIDTH,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.85, 1.05, 0.85], // Center is 105% size, sides are 85%
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6], // Dim the side cards
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              style={{
                width: ITEM_WIDTH,
                transform: [{ scale }],
                opacity,
              }}
            >
              <RankCard
                item={item}
                rank={i + 1}
                userRole={userRole}
                navigation={navigation}
              />
            </Animated.View>
          );
        }}
      />
    </View>
  );
};
const SearchBar = ({ value, onChange, placeholder }: searchBarProps) => (
  <View style={[styles.searchContainer]}>
    <Icon name="magnify" size={20} color={PRIMARY_COLOR_TINT_MAIN} />
    <TextInput
      style={styles.searchInput}
      placeholder={placeholder}
      placeholderTextColor={PRIMARY_COLOR_TINT_MAIN}
      value={value}
      onChangeText={onChange}
    />
  </View>
);

const UserScoreHeader: React.FC<UserScoreHeaderProps> = ({
  score,
  previousScore,
  nextUpdateDate,
  searchQuery,
  searchResults,
  navigation,
  isLocked,
  userRole
}) => {
  const isRising = score >= previousScore;
  const daysUntilUpdate = moment(nextUpdateDate).diff(moment(), 'days');
  const isEnterprise = userRole === 'enterprise';

  // --- 1. SEARCH RESULTS VIEW ---
  if (searchQuery.length > 0) {
  return (
    <View style={styles.searchOverlay}>
      <View style={styles.searchHeaderRow}>
        <Text style={styles.searchTitle}>Matching Talent</Text>
        <Text style={styles.resultCount}>{searchResults.length} found</Text>
      </View>

      {searchResults.length > 0 ? (
        <FlatList
          horizontal
          data={searchResults}
          keyExtractor={(item) => item.uid}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.horizontalSearchCard}
              onPress={() => navigation.navigate('Profile', { uid: item.uid })}
            >
              <Image
                source={{ uri: item.profilePic?.[0] || 'https://sampeImg.png' }}
                style={styles.searchAvatar}
              />
              <Text style={styles.searchName} numberOfLines={1}>
                {item.firstname} {item.lastname}
              </Text>
              
              <View style={styles.miniScoreBadge}>
                {isLocked ? (
                  <Icon name="lock" size={22} color={PRIMARY_COLOR_TINT_MAIN} />
                ) : (
                  <Text style={styles.iScoreText}>
                    {Math.round(item.currentIScore ?? 0)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptySearchContainer}>
          <Text style={styles.noResultsText}>No matches for "{searchQuery}"</Text>
        </View>
      )}
    </View>
  );
  }
  if (isEnterprise) {
    return (
      <View style={styles.userScoreCard}>
        <Text style={styles.headerLabel}>iScore Observer</Text>
        <Text style={styles.timerText}>
          You have full access to view Elite student/instructor analytics.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('EnterpriseHelp')}>
          <Text style={styles.learnMore}>Recruitment Tools →</Text>
        </TouchableOpacity>
      </View>
    );
  }
  // --- 2. DEFAULT PERSONAL SCORE VIEW ---
  return (
    <View
      style={styles.userScoreCard}
    > 
      <Text style={styles.headerLabel}>Your iScore</Text>
      <View style={styles.scoreRow}>
        <Text style={styles.bigScore}>{score.toFixed(0)}</Text>
        <View style={styles.badgeContainer}>
          <Text
            style={styles.badgeText}
          >
            {isRising ? 'Rising Star' : 'Needs Momentum'}
          </Text>
        </View>
      </View>
      <Text style={styles.timerText}>
        Next update in: {daysUntilUpdate} days
      </Text>

      <TouchableOpacity onPress={() => navigation.navigate('IScoreBreakdown')}>
        <Text style={styles.learnMore}>How is this calculated? →</Text>
      </TouchableOpacity>
    </View>
  );
};
const InstitutionItem: React.FC<InstitutionItemProps> = ({ item, index }) => {
  const isTopThree = index < 3;
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.instRow}>
      {/* 1. Rank Medallion/Number */}
      <View style={styles.rankContainer}>
        {isTopThree ? (
          <View style={[styles.medallion, { backgroundColor: rankColors[index] }]}>
            <Text style={styles.rankText}>{index + 1}</Text>
          </View>
        ) : (
          <Text style={styles.rankNumber}># {index + 1}</Text>
        )}
      </View>
      {/* 2. Logo with Shadow */}
      <View style={styles.logoContainer}>
        <Image source={{ uri: item.logo || 'https://via.placeholder.com/150' }} style={styles.instLogo} />
      </View>
      {/* 3. Content Area */}
      <View style={styles.contentArea}>
        <Text style={styles.instName} numberOfLines={3}>
          {item.schoolName}
        </Text>
      </View>
      {/* 4. Glassmorphism Score Badge */}
      <View style={styles.instScoreBadge}>
        <Text style={styles.scoreLabel}>Avg. iScore</Text>
        <Text style={styles.instScoreText}>
          {(item.currentiScoreAvg ?? 0).toFixed(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
export function RankingScreen () {
  const user = useAppSelector(state => state.user);
  const userRole = user.usertype;
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<{
    students: User[];
    instructors: User[];
    institutions: iCampusOperationalInstitutionSchema[]; 
  }>({
    students: [],
    instructors: [],
    institutions: []
  });
  const [placeholder, setPlaceholder] = useState('Search students...');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  useEffect(() => {
  const delayDebounceFn = setTimeout(async () => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await axios.get(`${baseUrl}users/search`, {
        params: { 
          q: searchQuery,
          viewerRole: userRole,
          viewerTier: user.tier 
        }
      });
      if (response.data.success) {
        setSearchResults(response.data.data);
      }
    } catch (error: any) { // Option 1: Quick fix with 'any'
      console.error("Search error:", error);
      Toast.show({
        type: 'error',
        text1: 'Search Error',
        text2: error?.message || "An unexpected error occurred", // Safe string access
      });
    } finally {
      setIsSearching(false);
    }
  }, 500); // 500ms debounce

  return () => clearTimeout(delayDebounceFn);
}, [searchQuery, userRole, user?.tier]);
  // 1. Animation Value for Scroll
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchData = async () => {
    try {
      const response = await axios.get(`${baseUrl}users/fetchLeaderBoards`);
      if (response.data.success) {
        setLeaderboard({
          students: response.data.data.students,
          instructors: response.data.data.instructors,
          institutions: response.data.data.institutions,
        });
      }
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  useEffect(() => {
    const phrases = [
      "Search students...",
      "Search lecturers...",
      "Search institutions...",
      "Find elite talent..."
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % phrases.length;
      setPlaceholder(phrases[i]);
    }, 3000); 

    return () => clearInterval(interval);
  }, []);
  const headerBg = scrollY.interpolate({
    inputRange: [0, 80], 
    outputRange: ['rgba(255,255,255,0)', '#FFF'], 
    extrapolate: 'clamp',
  });
  const headerShadow = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 4],
    extrapolate: 'clamp',
  });
  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };
  const eliteStudents = useMemo(() => {
    return leaderboard.students.filter((s: any) => (s.currentIScore ?? 0) > 20);
  }, [leaderboard.students]);
  const eliteLecturers = useMemo(() => {
    return leaderboard.instructors.filter((l: any) => (l.currentIScore ?? 0) > 20);
  }, [leaderboard.instructors]);
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={{ marginTop: 10, color: '#676D75' }}>
          Loading Elite Rankings...
        </Text>
      </View>
    );
  }
  const nextUpdate = moment().add(1, 'month').startOf('month').toISOString();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
      <RefreshControl 
        refreshing={refreshing} 
        onRefresh={onRefresh} 
        colors={[PRIMARY_COLOR]} 
        tintColor={PRIMARY_COLOR} 
      />
    }
      >
      <LinearGradient
        colors={DEFAULT_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.linearGradContainer}
      > 
        <Animated.View 
          style={[
            styles.stickyHeader, 
            { backgroundColor: headerBg, elevation: headerShadow, shadowOpacity: scrollY.interpolate({
                inputRange: [0, 80],
                outputRange: [0, 0.1],
                extrapolate: 'clamp',
              }) 
            }
          ]}
        >
          <SearchBar 
            value={searchQuery} 
            onChange={setSearchQuery} 
            placeholder={placeholder} 
          />
        </Animated.View>
        {isSearching ? (
          <ActivityIndicator size="large" color={PRIMARY_COLOR_TINT_MAIN} style={{ marginTop: 20 }} />
        ) : searchResults.length > 0 ? (
          <UserScoreHeader
            score={user.currentIScore ?? 5} 
            previousScore={user.previousIScore ?? 5}
            nextUpdateDate={nextUpdate}   
            searchQuery={searchQuery}
            searchResults={searchResults}
            navigation={navigation}
            isLocked={userRole !== 'enterprise' && user.tier === 'free'}  
            userRole={userRole ?? 'student'} 
          />
        ) : (
          <>
          <View style={styles.sectionHeaderLight}>
            <Text style={styles.sectionTitleLight}>No results found</Text>
          </View>
          </>
        )}
      </LinearGradient>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Our Elite Students</Text>
      </View>
      <EliteCarousel
        data={eliteStudents}
        userRole={userRole!}
        navigation={navigation}
      />
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Our Elite Instructors</Text>
      </View>
      <EliteCarousel
        data={eliteLecturers}
        userRole={userRole!}
        navigation={navigation}
      />

      {/* 4. Vertical Institution List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Top Ranking Institutions</Text>
      </View>
      <View style={styles.instListContainer}>
        {leaderboard.institutions.map((inst, index) => (
          <InstitutionItem
            key={inst.schoolCode || index}
            item={inst}
            index={index}
          />
        ))}
      </View>

      {/* 5. Enterprise CTA */}
      {userRole === 'enterprise' && (
        <TouchableOpacity 
          style={styles.hireBanner}
          onPress={() => navigation.navigate('EnterpriseSearch')} // Assuming you have a filtered search view
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.hireText}>
              Looking for top talent? 
            </Text>
            <Text style={styles.hireText}>
              Filter specifically by iScore metrics.
            </Text>
          </View>
          <View style={styles.hireButton}>
            <Text style={styles.hireButtonText}>Try Now</Text>
          </View>
        </TouchableOpacity>
      )}
      <Toast config={toastConfig} />
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#fff'
  },
  linearGradContainer:{
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    marginBottom: 10
  },
  stickyHeader: {
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fadccc', 
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 45,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: PRIMARY_COLOR_TINT_MAIN,
  },
  // Personal Score Card
  userScoreCard: {
    padding: 20,
    marginBottom: 20,
    elevation: 5,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  scoreRow: {
    alignItems: 'center',
    marginTop: 10,
    position: 'relative'
  },
  bigScore: {
    color: PRIMARY_COLOR_TINT_MAIN,
    fontSize: 45,
    fontWeight: 'bold',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT_MAIN
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  timerText: {
    color: PRIMARY_COLOR_TINT_MAIN,
    opacity: 0.8,
    fontSize: 12,
    marginTop: 10,
  },
  learnMore: {
    color: PRIMARY_COLOR_TINT_MAIN,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'right',
    textDecorationLine: 'underline',
  },
  // Search Overlay Results
  searchOverlay: {
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  searchAvatar: {
    width: 45,
    height: 45,
    borderRadius: 12,
    marginRight: 12,
  },
  searchName: {
    fontWeight: '700',
    fontSize: 15,
    color: PRIMARY_COLOR_TINT_MAIN,
    textTransform: 'capitalize'
  },
  miniScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT_MAIN
  },
  iScoreText: {
    color: PRIMARY_COLOR_TINT_MAIN,
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Institution List
  instRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  rankContainer: {
    width: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallion: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  logoContainer: {
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  instLogo: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#fadccc',
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  instName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  instScoreBadge: {
    backgroundColor: PRIMARY_COLOR_TINT_MAIN, 
    borderRadius: 14,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 9,
    color: '#2222',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  instScoreText: {
    fontSize: 15,
    fontWeight: '900',
    color: PRIMARY_COLOR,
  },
  searchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: .8,
    borderBottomColor: PRIMARY_COLOR_TINT_MAIN,
    paddingBottom: 10,
  },
  searchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY_COLOR_TINT_MAIN,
  },
  resultCount: {
    fontSize: 11,
    color: PRIMARY_COLOR_TINT_MAIN,
    fontWeight: '600',
  },
  emptySearchContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noResultsText: {
    marginTop: 10,
    color: PRIMARY_COLOR_TINT_MAIN,
    fontSize: 14,
    textAlign: 'center',
  },

  // Header Row handles the "Title" and "View All" positioning
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center', 
    marginBottom: 15,
  },

  sectionHeaderLight: {
    flexDirection: 'row',
    alignItems: 'center', 
    marginVertical: 15,
  },

  // The Main Title (e.g., "Elite Students")
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222', 
  },
  sectionTitleLight: {
    fontSize: 18,
    fontWeight: '800',
    color: PRIMARY_COLOR_TINT_MAIN, 
  },

  // The "View All" interactive text
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginBottom: 2, // Fine-tuning alignment with the larger title text
  },
  horizontalListPadding: {
    paddingRight: 20,
  },
  carouselContainer: {
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },
  horizontalSearchCard: {
    width: '80%', 
    alignItems: 'center',
    marginRight: 10,
    padding: 10,
    borderRadius: 18,
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT_MAIN,
  },
  instListContainer: {
    paddingBottom: 20,  
  },
  hireBanner: {
    backgroundColor: PRIMARY_COLOR, 
    paddingBottom: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Glow effect
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  hireText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    lineHeight: 20,
  },
  hireButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 10,
  },
  hireButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
});