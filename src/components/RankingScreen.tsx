import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
  PRIMARY_COLOR_TINT_MAIN,
} from '../assets/styles/colors.ts';
import { fetchLiveRate } from '../utils/UserTransactionsHelpers';
import { useDispatch } from 'react-redux';
import {
  User,
  RankCardCarouselProps,
  iCampusOperationalInstitutionSchema,
} from '../types/firebase';
import { RankCard } from './IscoreRankCard';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../hooks/hooks.ts';
import { fetchLeaderboards, searchUsers } from '../api/localGetApis.ts';
import { verifySubscriptionOnBackend } from '../api/localPostApis';
import moment from 'moment';
import LinearGradient from 'react-native-linear-gradient';
import { DEFAULT_GRADIENT, rankColors } from '../assets/styles/colors';
import Toast from 'react-native-toast-message';
import { UserSearchOverlay } from '../components/SearchOverlay.tsx';
import { homeStyles } from '../assets/styles/colors.ts';
import { BlurView } from '@react-native-community/blur';
import { SubscriptionSelectionModal } from '../components/SubscriptionModal.tsx';
import { setUser } from '../context/UserSlice.ts';
import { useTheme } from '../context/ThemeContext';
import ViewShot, { captureRef } from 'react-native-view-shot';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = 160;
const ITEM_SPACING = (width - ITEM_WIDTH) / 2;

interface UserScoreHeaderProps {
  user: any;
  navigation: any;
  nextUpdateDate: string;
  isEnterpriseView: boolean;
  isViewingSelf: boolean;
  onUpgradePress: () => void;
  colors: any;
}
interface InstitutionItemProps {
  item: iCampusOperationalInstitutionSchema;
  index: number;
  colors: any;
}

export const EliteCarousel: React.FC<RankCardCarouselProps> = ({
  data,
  userRole,
  navigation,
}) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
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
          const inputRange = [
            (i - 1) * ITEM_WIDTH,
            i * ITEM_WIDTH,
            (i + 1) * ITEM_WIDTH,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.85, 1.05, 0.85],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
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

const UserScoreHeader: React.FC<UserScoreHeaderProps> = ({
  user,
  navigation,
  nextUpdateDate,
  isEnterpriseView,
  isViewingSelf,
  onUpgradePress,
  colors,
}) => {
  const viewShotRef = useRef<any>(null);
  if (isEnterpriseView && isViewingSelf) {
    return;
  }

  const score = user?.currentIScore ?? 0;
  const previousScore = user?.previousIScore ?? 0;
  const isRising = score >= previousScore;
  const daysUntilUpdate = moment(nextUpdateDate).diff(moment(), 'days');
  const isScoreLocked = user?.displayScore === 'Locked';
  const handleShareiScore = async () => {
    try {
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
      });
      await Share.share({
        url: uri,
        message: 'My iScore',
      });
    } catch (err) {
      console.error('Error capturing or sharing receipt shot: ', err);
    }
  };

  return (
    <View style={styles.userScoreCard}>
      {isViewingSelf && (
        <TouchableOpacity style={styles.shareBtn} onPress={handleShareiScore}>
          <MaterialIcons name="share" size={22} color={colors.btnTextColor} />
        </TouchableOpacity>
      )}
      <Text style={[styles.headerLabel, { color: colors.btnTextColor }]}>
        {isViewingSelf ? 'Your iScore' : `${user?.firstname}'s iScore`}
      </Text>

      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
        <TouchableOpacity
          activeOpacity={isScoreLocked ? 0.8 : 1}
          onPress={() => isScoreLocked && onUpgradePress()}
          disabled={!isScoreLocked}
        >
          <View style={styles.scoreRow}>
            <View
              style={[styles.scoreCircle, { borderColor: colors.btnTextColor }]}
            >
              <Text style={[styles.bigScore, { color: colors.btnTextColor }]}>
                {isScoreLocked ? '5' : user?.displayScore ?? Math.round(score)}
              </Text>
              {isScoreLocked && (
                <BlurView
                  style={StyleSheet.absoluteFill}
                  blurType="light"
                  blurAmount={10}
                  reducedTransparencyFallbackColor={colors.backgroundSecondary}
                />
              )}
            </View>
            <View style={styles.badgeContainer}>
              <MaterialIcons
                name={isRising ? 'trending-up' : 'speed'}
                size={16}
                color="#fff"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.badgeText}>
                {isRising ? 'Rising Star' : 'Needs Momentum'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </ViewShot>
      {isViewingSelf ? (
        <Text style={[styles.timerText, { color: colors.btnTextColor }]}>
          Next update in: {daysUntilUpdate} days
        </Text>
      ) : (
        <Text style={[styles.timerText, { color: colors.btnTextColor }]}>
          {user?.tier?.toUpperCase() || 'FREE'}
        </Text>
      )}

      <TouchableOpacity
        onPress={() =>
          isViewingSelf
            ? navigation.navigate('FAQScreen')
            : navigation.navigate('Profile', { uid: user.uid })
        }
      >
        <Text style={[styles.learnMore, { color: colors.btnTextColor }]}>
          {isViewingSelf ? 'How iScore is calculated?' : 'View Full Profile'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const InstitutionItem: React.FC<InstitutionItemProps> = ({
  item,
  index,
  colors,
}) => {
  const isTopThree = index < 3;
  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.instRow}>
      <View
        style={[
          styles.rankContainer,
          isTopThree && { backgroundColor: rankColors[index] },
        ]}
      >
        {isTopThree ? (
          <Text style={styles.rankText}>{index + 1}</Text>
        ) : (
          <Text style={[styles.rankNumber, { color: colors.text }]}>
            # {index + 1}
          </Text>
        )}
      </View>
      <Image
        source={{ uri: item.logo || 'https://via.placeholder.com/150' }}
        style={styles.instLogo}
      />
      <Text style={[styles.instName, { color: colors.text }]} numberOfLines={3}>
        {item.schoolName}
      </Text>
      <View style={styles.instScoreBadge}>
        <Text style={[styles.scoreLabel, { color: colors.text }]}>
          Avg. iScore
        </Text>
        <Text style={[styles.instScoreText, { color: colors.primary }]}>
          {(item.currentiScoreAvg ?? 0).toFixed(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
export function RankingScreen() {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user);
  const userRole = user.usertype;
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSubscriptionModalVisible, setSubscriptionModalVisible] =
    useState(false);
  const [leaderboard, setLeaderboard] = useState<{
    students: User[];
    instructors: User[];
    institutions: iCampusOperationalInstitutionSchema[];
  }>({
    students: [],
    instructors: [],
    institutions: [],
  });
  const [placeholder, setPlaceholder] = useState('Search users...');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [exchangeData, setExchangeData] = useState({
    rate: 1,
    symbol: '$',
    code: 'USD',
  });

  const fetchData = async () => {
    try {
      const response = await fetchLeaderboards();
      if (response.success && response.data) {
        const {
          students = [],
          instructors = [],
          institutions = [],
        } = response.data;
        setLeaderboard({
          students,
          instructors,
          institutions,
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
      'Search students...',
      'Search lecturers...',
      'Search institutions...',
      'Find elite talent...',
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % phrases.length;
      setPlaceholder(phrases[i]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    fetchLiveRate(user?.country!).then(setExchangeData);
  }, [user?.country]);
  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };
  const handleSubSuccess = async (data: any) => {
    setSubscriptionModalVisible(false);
    const res = await verifySubscriptionOnBackend(
      data.transaction_id || data.flw_ref,
      'pro',
      exchangeData.rate,
    );
    if (res.success) {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Upgrade to Pro user successful.',
      });
      dispatch(
        setUser({
          ...user,
          tier: 'pro',
          hasSubscribed: true,
        }),
      );
      if (selectedUser) {
        const updatedUserRes = await searchUsers({
          q: selectedUser.firstname,
          viewerTier: user.tier || 'free',
          viewerRole: user.usertype || 'student',
        });
        if (updatedUserRes && updatedUserRes.length > 0) {
          setSelectedUser(updatedUserRes[0]);
        }
      }
    }
  };
  const eliteStudents = useMemo(() => {
    return leaderboard.students.filter((s: any) => (s.currentIScore ?? 0) > 20);
  }, [leaderboard.students]);
  const eliteLecturers = useMemo(() => {
    return leaderboard.instructors.filter(
      (l: any) => (l.currentIScore ?? 0) > 20,
    );
  }, [leaderboard.instructors]);
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={{ marginTop: 10, color: PRIMARY_COLOR }}>
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
        <UserScoreHeader
          user={selectedUser ? selectedUser : user}
          navigation={navigation}
          isEnterpriseView={userRole === 'enterprise'}
          nextUpdateDate={nextUpdate}
          isViewingSelf={!selectedUser}
          onUpgradePress={() => setSubscriptionModalVisible(true)}
          colors={colors}
        />
      </LinearGradient>
      <View
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>
          Our Elite Students
        </Text>
        <EliteCarousel
          data={eliteStudents}
          userRole={userRole!}
          navigation={navigation}
        />
        <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>
          Our Elite Instructors
        </Text>
        <EliteCarousel
          data={eliteLecturers}
          userRole={userRole!}
          navigation={navigation}
        />
        <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>
          Top Ranking Institutions
        </Text>
        <View style={styles.instListContainer}>
          {leaderboard.institutions.map((inst, index) => (
            <InstitutionItem
              key={inst.schoolCode || index}
              item={inst}
              index={index}
              colors={colors}
            />
          ))}
        </View>
      </View>
      {isSearchFocused && (
        <UserSearchOverlay
          isRanking={true}
          currentUser={user}
          navigation={navigation}
          placeholder={placeholder}
          onClose={() => setIsSearchFocused(false)}
          colors={{ primary: PRIMARY_COLOR, tint: PRIMARY_COLOR_TINT }}
          onResultPress={userObject => {
            setSelectedUser(userObject);
            setIsSearchFocused(false);
          }}
        />
      )}
      {!isSearchFocused && (
        <TouchableOpacity
          style={homeStyles.fab}
          onPress={() => setIsSearchFocused(true)}
        >
          <MaterialIcons name="search" size={28} color={colors.btnTextColor} />
        </TouchableOpacity>
      )}
      <SubscriptionSelectionModal
        isVisible={isSubscriptionModalVisible}
        onClose={() => setSubscriptionModalVisible(false)}
        targetTier="pro"
        userContext={{
          email: user.email,
          name: `${user.firstname} ${user.lastname}`,
          country: user.country!,
        }}
        exchangeData={exchangeData}
        onSuccess={handleSubSuccess}
        title="Unlock iScore Insights"
      />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
  },
  subContainer: {
    alignContent: 'center',
    padding: 10,
    borderRadius: 15,
  },
  linearGradContainer: {
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    padding: 20,
    marginBottom: 10,
    marginHorizontal: -15,
  },
  userScoreCard: {
    elevation: 5,
    alignContent: 'center',
    position: 'relative',
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreRow: {
    marginVertical: 15,
    position: 'relative',
    alignItems: 'center',
    width: '100%',
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignContent: 'center',
    overflow: 'hidden',
  },
  bigScore: {
    fontSize: 45,
    fontWeight: 'bold',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -5,
    right: -10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR_TINT_MAIN,
    elevation: 4,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  badgeText: {
    color: PRIMARY_COLOR_TINT_MAIN,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerText: {
    fontSize: 14,
    marginVertical: 15,
  },
  learnMore: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    textDecorationLine: 'underline',
  },
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
    textTransform: 'capitalize',
  },
  miniScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT_MAIN,
  },
  iScoreText: {
    color: PRIMARY_COLOR_TINT_MAIN,
    fontWeight: 'bold',
    fontSize: 16,
  },
  instRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 15,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  rankContainer: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    alignContent: 'center',
  },
  rankText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  instLogo: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginLeft: 7,
  },
  instName: {
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 4,
    flex: 1,
  },
  instScoreBadge: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },
  instScoreText: {
    fontSize: 16,
    fontWeight: '900',
  },
  searchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 0.8,
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

  sectionHeaderLight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 15,
  },
  sectionTitleLight: {
    fontSize: 18,
    fontWeight: '800',
    color: PRIMARY_COLOR_TINT_MAIN,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginBottom: 2,
  },
  horizontalListPadding: {
    paddingRight: 20,
  },
  carouselContainer: {
    paddingHorizontal: 15,
  },
  horizontalSearchCard: {
    width: '80%',
    alignItems: 'center',
    marginRight: 10,
    padding: 10,
    borderRadius: 18,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT_MAIN,
  },
  instListContainer: {
    padding: 20,
  },
  shareBtn: {
    position: 'absolute',
    top: 20,
    right: 10,
  },
});