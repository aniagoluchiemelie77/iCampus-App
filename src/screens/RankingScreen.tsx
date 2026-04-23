import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PRIMARY_COLOR } from '../components/Classroomcomponent';
import { User } from 'types/firebase';
import { NavigationProp } from '@react-navigation/native';
import { RankCard } from '../components/IscoreRankCard';
import moment from 'moment';

interface IInstitution {
  id?: string;
  name: string;
  logo?: string;
  memberCount?: number;
  avgScore?: number;
}
interface RankingScreenProps {
  navigation: NavigationProp<any>;
  topStudents: User[];
  topLecturers: User[];
  topInstitutions: IInstitution[];
  user: User;
  userRole: User['usertype'];
}
interface UserScoreHeaderProps {
  score: number;
  previousScore: number;
  nextUpdateDate: string | Date;
  searchQuery: string;
  searchResults: User[];
  navigation: NavigationProp<any>;
}
interface InstitutionItemProps {
  item: IInstitution;
  index: number;
}
const SearchBar = ({ value, onChange }: any) => (
  <View style={[styles.searchContainer]}>
    <Icon name="magnify" size={20} color="#888" />
    <TextInput
      style={styles.searchInput}
      placeholder="Search students, lecturers or institutions..."
      placeholderTextColor="#888"
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
}) => {
  const isRising = score >= previousScore;
  const daysUntilUpdate = moment(nextUpdateDate).diff(moment(), 'days');

  // --- 1. SEARCH RESULTS VIEW ---
  if (searchQuery.length > 0) {
    return (
      <View style={styles.searchOverlay}>
        <View style={styles.searchHeaderRow}>
          <Text style={styles.searchTitle}>Search Results</Text>
          <Text style={styles.resultCount}>{searchResults.length} found</Text>
        </View>

        {searchResults.length > 0 ? (
          searchResults.map(item => (
            <TouchableOpacity
              key={item.uid}
              style={styles.searchResultItem}
              onPress={() => navigation.navigate('Profile', { uid: item.uid })}
            >
              <Image
                source={{ uri: item.photoURL }}
                style={styles.searchAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.searchName}>
                  {item.firstname} {item.lastname}
                </Text>
                <Text style={styles.searchSubtext}>{item.usertype}</Text>
              </View>
              <View style={styles.miniScoreBadge}>
                <Text style={styles.miniScoreText}>
                  {Math.round(item.currentIScore)}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color="#ACB5BD" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptySearchContainer}>
            <Icon name="account-search-outline" size={40} color="#ACB5BD" />
            <Text style={styles.noResultsText}>
              No elite members match "{searchQuery}"
            </Text>
          </View>
        )}
      </View>
    );
  }

  // --- 2. DEFAULT PERSONAL SCORE VIEW ---
  return (
    <View style={styles.userScoreCard}>
      <Text style={styles.headerLabel}>Your Reputation Power</Text>
      <View style={styles.scoreRow}>
        <Text style={styles.bigScore}>{score.toFixed(0)}</Text>
        <View style={styles.badgeContainer}>
          <Icon
            name={isRising ? 'trending-up' : 'trending-down'}
            color={isRising ? '#4CAF50' : '#FF5252'}
          />
          <Text
            style={[
              styles.badgeText,
              { color: isRising ? '#4CAF50' : '#FF5252' },
            ]}
          >
            {isRising ? 'Rising Star' : 'Slowing Down'}
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
const InstitutionItem: React.FC<InstitutionItemProps> = ({ item, index }) => (
  <View style={styles.instRow}>
    <Text style={styles.rankNumber}>{index + 1}</Text>
    <Image source={{ uri: item.logo }} style={styles.instLogo} />
    <View style={{ flex: 1 }}>
      <Text style={styles.instName}>{item.name}</Text>
      <Text style={styles.instStats}>{item.memberCount} active members</Text>
    </View>
    <View style={styles.instScoreBadge}>
      <Text style={styles.instScoreText}>{item.avgScore.toFixed(1)}</Text>
    </View>
  </View>
);
const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.sectionWrapper}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity>
        <Text style={styles.viewAllText}>View All</Text>
      </TouchableOpacity>
    </View>
    {children}
  </View>
);
export const RankingScreen: React.FC<RankingScreenProps> = ({
  navigation,
  topStudents,
  topLecturers,
  topInstitutions,
  user,
  userRole,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredStudents = useMemo(() => {
    return topStudents
      .filter((s: any) => s.currentIScore > 20)
      .filter((s: any) =>
        s.firstname.toLowerCase().includes(searchQuery.toLowerCase()),
      );
  }, [searchQuery, topStudents]);
  const filteredLecturers = useMemo(() => {
    return topLecturers
      .filter((l: any) => l.iScore > 20)
      .filter((l: any) =>
        l.firstname.toLowerCase().includes(searchQuery.toLowerCase()),
      );
  }, [searchQuery, topLecturers]);
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    // 1. Define Tier Permissions
    const isEnterprise = userRole === 'enterprise';
    const isProOrPremium = user.plan === 'pro' || user.plan === 'premium';

    // 2. Combine and Filter
    const allUsers = [...topStudents, ...topLecturers];

    return allUsers
      .filter(u => {
        // RULE 1: The 'Gate' - Only users with iScore > 20 are searchable by the public
        // (Enterprise can bypass this if you want them to see 'everyone')
        const isElite = u.currentIScore > 20;
        if (!isElite && !isEnterprise) return false;

        // RULE 2: String matching
        const fullName = `${u.firstname} ${u.lastname}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
      })
      .map(u => {
        // RULE 3: Data Masking (Restraints)
        // If a Free user is searching, we might hide the exact iScore
        // and only show a "Rank Level" instead.
        return {
          ...u,
          displayScore:
            isEnterprise || isProOrPremium
              ? Math.round(u.currentIScore)
              : 'Locked', // Free users see "Locked" or a blurred placeholder
        };
      });
  }, [searchQuery, topStudents, topLecturers, user.plan, userRole]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.stickyHeader}>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </View>
      {/* 2. DYNAMIC HEADER (Personal Stats OR Search Results) */}
      <UserScoreHeader
        score={user.currentIScore}
        previousScore={user.previousIScore}
        nextUpdateDate={user.nextCronRun}
        searchQuery={searchQuery}
        searchResults={searchResults} // From the search logic we built
        navigation={navigation}
      />
      {/* 3. Horizontal Students List */}
      <Section title="Elite Students">
        <FlatList
          horizontal
          data={filteredStudents}
          renderItem={({ item }) => (
            <RankCard
              item={item}
              onPress={() => navigation.navigate('Profile', { uid: item.uid })}
              showAction={userRole === 'enterprise' ? 'Message' : 'View'}
            />
          )}
        />
      </Section>
      <Section title="Elite Instructors">
        <FlatList
          horizontal
          data={filteredLecturers}
          renderItem={({ item }) => (
            <RankCard
              item={item}
              onPress={() => navigation.navigate('Profile', { uid: item.uid })}
              showAction={userRole === 'enterprise' ? 'Message' : 'View'}
            />
          )}
        />
      </Section>

      {/* 4. Vertical Institution List */}
      <View style={styles.sectionWrapper}>
        <Text style={styles.sectionTitle}>Top Ranking Institutions</Text>
        {topInstitutions.map((inst, index) => (
          <InstitutionItem key={inst.id} item={inst} index={index} />
        ))}
      </View>

      {/* 5. Enterprise CTA */}
      {userRole === 'enterprise' && (
        <TouchableOpacity style={styles.hireBanner}>
          <Text style={styles.hireText}>
            Looking for top talent? Filter by iScore.
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stickyHeader: {
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5', // Light grey or dark card bg
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 45,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  // Personal Score Card
  userScoreCard: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 5,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
  },
  bigScore: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 15,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  timerText: {
    color: '#FFF',
    opacity: 0.7,
    fontSize: 12,
    marginTop: 10,
  },
  learnMore: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'right',
  },
  // Search Overlay Results
  searchOverlay: {
    backgroundColor: '#FFF', // or Dark Card color
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E1E4E8',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  searchAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  searchName: {
    fontWeight: '700',
    fontSize: 15,
    color: '#1A1D1E',
  },
  searchSubtext: {
    fontSize: 12,
    color: '#676D75',
    textTransform: 'capitalize',
  },
  miniScoreBadge: {
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  miniScoreText: {
    color: '#006064',
    fontWeight: 'bold',
    fontSize: 12,
  },
  // Institution List
  instRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ACB5BD',
    marginRight: 15,
  },
  instLogo: {
    width: 45,
    height: 45,
    borderRadius: 10,
    marginRight: 12,
  },
  instName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  instScoreBadge: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  instScoreText: {
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
  },
  searchOverlay: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    // Add a subtle border or shadow to make it pop against the background
    borderWidth: 1,
    borderColor: '#E1E4E8',
    minHeight: 150,
  },
  searchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
    paddingBottom: 10,
  },
  searchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  resultCount: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  searchAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
    backgroundColor: '#F0F2F5',
  },
  searchName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1D1E',
  },
  searchSubtext: {
    fontSize: 11,
    color: '#676D75',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  miniScoreBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  miniScoreText: {
    color: PRIMARY_COLOR,
    fontWeight: '800',
    fontSize: 13,
  },
  emptySearchContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noResultsText: {
    marginTop: 10,
    color: '#ACB5BD',
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 15,
    marginRight: 15,
    width: 140, // Fixed width for horizontal scrolling
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F2F5',
    // Soft shadow for depth
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F2F5',
  },
  risingBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 4,
  },
  iScoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  iScoreValue: {
    fontSize: 18,
    fontWeight: '800',
    color: PRIMARY_COLOR,
  },
  iScoreLabel: {
    fontSize: 10,
    color: '#676D75',
    marginLeft: 2,
    fontWeight: '600',
  },
  actionBtn: {
    backgroundColor: '#F0F9FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    width: '100%',
  },
  actionBtnText: {
    color: PRIMARY_COLOR,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionWrapper: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 16, // Aligns with the rest of your screen padding
  },

  // Header Row handles the "Title" and "View All" positioning
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end', // Aligns bottom of text for better visual flow
    marginBottom: 16,
  },

  // The Main Title (e.g., "Elite Students")
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1D1E', // In Dark Mode, use '#FFFFFF'
    letterSpacing: -0.5,
  },

  // The "View All" interactive text
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginBottom: 2, // Fine-tuning alignment with the larger title text
  },

  // IMPORTANT: The FlatList inside the section should NOT have padding
  // on the container itself, but on the contentContainerStyle
  // so that cards bleed to the edges when scrolling.
  horizontalListPadding: {
    paddingRight: 20,
  },
});
