import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { User } from 'types/firebase';
import { NavigationProp } from '@react-navigation/native';
import {PRIMARY_COLOR} from './Classroomcomponent';

interface RankCardProps {
  item: User;
  userRole: User['usertype']; // Ensures role matches our allowed types
  navigation: NavigationProp<any>;
}
export const RankCard: React.FC<RankCardProps> = ({ item, userRole, navigation }) => {
  const isRising = item.currentIScore > (item.previousIScore || 0);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Profile', { uid: item.uid })}
    >
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: item.profilePic[0] }} style={styles.avatar} />
        {isRising && (
          <View style={styles.risingBadge}>
            <Icon name="trending-up" size={12} color="#FFF" />
          </View>
        )}
      </View>

      <Text style={styles.userName} numberOfLines={1}>
        {item.firstname}
      </Text>

      <View style={styles.iScoreContainer}>
        <Text style={styles.iScoreValue}>{Math.round(item.currentIScore)}</Text>
        <Text style={styles.iScoreLabel}>iScore</Text>
      </View>

      {/* Dynamic Action Button */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => {
          if (userRole === 'enterprise') {
            navigation.navigate('Chat', { recipientId: item.uid });
          } else {
            navigation.navigate('Profile', { uid: item.uid });
          }
        }}
      >
        <Text style={styles.actionBtnText}>
          {userRole === 'enterprise' ? 'Send Message' : 'View Profile'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
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
  resultCount: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: '600',
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