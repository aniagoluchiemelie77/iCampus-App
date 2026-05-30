import React, { useState, useEffect } from 'react';
import {Image, View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Platform, Dimensions } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PostCard } from './PostCard'; 
import {UserAvatar} from './UserAvatar';
import { UserIdentity } from './UserIdentity';
import { EmptyState } from './EmptyFlatlistComponent';
import { useAppSelector } from './hooks';
import {searchPosts, searchUsers, searchICashMarketLocal, searchCourses} from '../api/localGetApis';
import { PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { useAppDataContext } from './EventContext';
import { CurrencyDisplay } from './CurrencyFormatter';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

interface NormalizedCourseItem {
  id: string;
  title: string;
  code: string;
  isPremiumPaid: boolean;
  price: number;
  thumbnail: string | null;
  studentsCount: number;
  isActive: boolean;
  instructors: string;
}
interface CourseSearchCardProps {
  item: NormalizedCourseItem;
  navigation: any;
  colors: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
type SearchTab = 'people' | 'market' | 'resources' | 'courses' | 'posts';


const CourseSearchCard = ({ item, navigation, colors }: CourseSearchCardProps) => {

  const getCourseInitials = (title: string) => {
    return title
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
  };

  const handleNavigationRoute = () => {
    if (item.isPremiumPaid) {
      navigation.navigate('ProductDetails', { productId: item.id });
    } else {
      navigation.navigate('ViewCourse', { courseId: item.id });
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.cardWrapper, { borderBottomColor: colors.border }, !item.isActive && { opacity: 0.5 }]} 
      onPress={handleNavigationRoute}
      disabled={!item.isActive}
    >
      {/* LEFT ASPECT: IMAGING PICTURE OR CHARACTER AVATAR GLYPH */}
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImg} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: item.isPremiumPaid ? '#8E44AD' : '#2C3E50' }]}>
          <Text style={styles.initialsText}>{getCourseInitials(item.title)}</Text>
        </View>
      )}

      {/* MID PANEL: CORE COURSE IDENTITY METADATA CONTENT */}
      <View style={styles.infoMetaContainer}>
        <View style={styles.badgeRow}>
          <Text style={[styles.courseCodeLabel, { color: colors.tint }]}>{item.code}</Text>
          {item.isPremiumPaid ? (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>Premium Masterclass</Text>
            </View>
          ) : (
            <View style={styles.academicBadge}>
              <Text style={styles.academicBadgeText}>Institutional</Text>
            </View>
          )}
        </View>

        <Text style={[styles.courseTitleHeader, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        
        <Text style={[styles.instructorNameSub, { color: colors.tint }]} numberOfLines={1}>
          By {item.instructors}
        </Text>

        <View style={styles.metricRowGroup}>
          <MaterialIcons name="people-outline" size={14} color={colors.tint} style={{ marginRight: 4 }} />
          <Text style={[styles.studentsCountMetric, { color: colors.tint }]}>
            {item.studentsCount} {item.studentsCount === 1 ? 'student' : 'students'} enrolled
          </Text>
        </View>
      </View>

      {/* RIGHT ALIGNMENT: FINANCIAL VALUE MATRIX DISPATCHER */}
      {item.isPremiumPaid && (
        <View style={styles.currencyRightTray}>
          <CurrencyDisplay value={item.price} size="small" />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const AdvancedSearchOverlay = () => {
    const navigation = useNavigation<any>();
    const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { allProducts } = useAppDataContext();
  const currentUser = useAppSelector(state => state.user);
  const [activeTab, setActiveTab] = useState<SearchTab>('people');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Define tabs structure matching X configuration
  const tabs: { id: SearchTab; label: string }[] = [
    { id: 'people', label: 'People' },
    { id: 'posts', label: 'Posts' },
    { id: 'market', label: 'iCash Store' },
    { id: 'resources', label: 'Resources' },
    { id: 'courses', label: 'Courses' },
  ];

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        let results = [];
        switch (activeTab) {
          case 'people':
            results = await searchUsers(searchQuery, currentUser.tier || 'free', currentUser.usertype || 'student');
            break;
          case 'posts':
            results = await searchPosts(searchQuery); 
            break;
          case 'market':
            results = searchICashMarketLocal(searchQuery, allProducts);
            break;
          case 'resources':
            results = await searchAcademicResources(searchQuery);
            break;
          case 'courses':
            results = await searchCourses(searchQuery);
            break;
        }
        setSearchResults(results || []);
      } catch (error) {
        console.error('Dynamic query lookup failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab, currentUser, allProducts]);

  // --- DYNAMIC CARD RENDER ENGINE ---
  const renderItemCard = ({ item }: { item: any }) => {
    switch (activeTab) {
      case 'posts':
        return <PostCard post={item} isVisible={true} />;

      case 'people':
        return (
          <TouchableOpacity
            style={styles.searchResultRow}
            onPress={() => {
              navigation.navigate('Profile', { uid: item.uid })
            }}
          >
            <UserAvatar
              profilePic={item.profilePic}
              firstName={item.firstname}
              lastName={item.lastname}
              organizationName={item.organizationName}
              style={styles.miniAvatar}
            />
            <View style={{ flex: 1 }}>
              <UserIdentity
                firstname={item.firstname}
                lastname={item.lastname}
                username={item.username}
                tier={item.tier}
                isVerified={item.isVerified}
                size="small"
                isOrganization={item.usertype === 'enterprise'}
                organizationName={item.organizationName}
              />
            </View>
          </TouchableOpacity>
        );

      case 'market':
        return (
          <TouchableOpacity 
            style={styles.searchResultRow} 
            onPress={() => navigation.navigate('ProductDetails', { productId: item.id })}
          >
            <MaterialIcons name="shopping-bag" size={24} color={colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>₦{item.price}</Text>
            </View>
          </TouchableOpacity>
        );
    
        case 'courses':
  return (
    <CourseSearchCard 
      item={item} 
      navigation={navigation}
      colors={colors} 
    />
  );
      default:
        return (
          <TouchableOpacity style={styles.searchResultRow}>
            <MaterialIcons name={activeTab === 'courses' ? "book" : "description"} size={24} color={colors.tint} />
            <Text style={[styles.itemTitle, { color: colors.text, marginLeft: 12 }]}>
              {item.name || item.courseTitle || item.title}
            </Text>
          </TouchableOpacity>
        );
    }
  };

  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background }]}>
      
      {/* 1. HEADER SECTION (Back Arrow + Input box) */}
      <View style={[styles.activeSearchHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity>
          <MaterialIcons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <TextInput
          autoFocus
          placeholder={`Search ${activeTab}...`}
          style={[styles.headerSearchInput, { color: colors.text }]}
          placeholderTextColor={colors.tint}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* 2. TAB CONTROL TRAY (X-Style Horizontal Scroll or Fixed Row) */}
      <View style={[styles.tabBarContainer, { borderBottomColor: colors.border }]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, isActive && { borderBottomColor: colors.primary }]}
              onPress={() => {
                setActiveTab(tab.id);
                setSearchResults([]); // Flush previous search buffer when switching contexts
              }}
            >
              <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.tint, fontWeight: isActive ? '700' : '500' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. CORE RESULTS LIFECYCLE LIST VIEW */}
      <View style={styles.searchOverlayScreen}>
        {isSearching ? (
          <View style={styles.searchEmptyState}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.postId || item.uid || item.id || item._id}
            renderItem={renderItemCard}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        ) : (
          // Using your clean custom <EmptyState /> UI component
          <EmptyState
            iconName={searchQuery.length < 2 ? 'search' : 'find-in-page'}
            title={searchQuery.length < 2 ? `Search iCampus ${activeTab}` : 'No Results Found'}
            subtitle={
              searchQuery.length < 2 
                ? `Enter at least 2 characters to look through the platform database directory updates.`
                : `We couldn't discover any matches matching "${searchQuery}" inside this tab profile context.`
            }
            style={styles.emptyStatePadding}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  activeSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerSearchInput: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    paddingVertical: 8,
  },
  tabBarContainer: {
    flexDirection: 'row',
    width: SCREEN_WIDTH,
    borderBottomWidth: 0.5,
    justifyContent: 'space-evenly',
  },
  tabItem: {
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    alignItems: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 13,
  },
  searchOverlayScreen: {
    flex: 1,
  },
  searchResultRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  miniAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  searchEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyStatePadding: {
    marginTop: 80,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  cardWrapper: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 0.5,
  },
  thumbnailImg: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  infoMetaContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  courseCodeLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginRight: 8,
  },
  premiumBadge: {
    backgroundColor: 'rgba(142, 68, 173, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumBadgeText: {
    color: '#9B59B6',
    fontSize: 10,
    fontWeight: '700',
  },
  academicBadge: {
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  academicBadgeText: {
    color: '#3498DB',
    fontSize: 10,
    fontWeight: '700',
  },
  courseTitleHeader: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 2,
  },
  instructorNameSub: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 4,
  },
  metricRowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentsCountMetric: {
    fontSize: 12,
  },
  currencyRightTray: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginLeft: 8,
  },
});