import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { PostCard } from '../components/PostCard';
import { UserAvatar } from '../components/UserAvatar';
import { UserIdentity } from '../components/UserIdentity';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useAppSelector } from '../hooks/hooks';
import {
  searchPosts,
  searchUsers,
  searchICashMarketLocal,
  searchCourses,
  searchAcademicResources,
} from '../api/localGetApis';
import { initialState } from '../context/UserSlice.ts';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { ProductCard } from './ProductCard';
import { PreSearchComponent } from './PresearchComponent';
import {
  CourseSearchCard,
  ResourceSearchCard,
} from './SearchScreenComponents';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR } from '../assets/styles/colors.ts';
import { Course } from '../types/firebase';
import { CourseModal } from './ClassroomScreenComponents.tsx';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

type SearchTab = 'people' | 'market' | 'resources' | 'courses' | 'posts';
const CATEGORIES = ['people', 'posts', 'courses', 'resources', 'store'];

// Per-tab copy and icons for the empty and loading states.
const TAB_META: Record<
  SearchTab,
  { label: string; noun: string; icon: string; hint: string }
> = {
  people: {
    label: 'People',
    noun: 'people',
    icon: 'person-search',
    hint: 'Try a first name, last name or @username.',
  },
  posts: {
    label: 'Posts',
    noun: 'posts',
    icon: 'article',
    hint: 'Try a keyword or topic from the post.',
  },
  market: {
    label: 'Store',
    noun: 'products',
    icon: 'storefront',
    hint: 'Try a product name or category.',
  },
  resources: {
    label: 'Resources',
    noun: 'resources',
    icon: 'menu-book',
    hint: 'Try a course code or resource title.',
  },
  courses: {
    label: 'Courses',
    noun: 'courses',
    icon: 'school',
    hint: 'Try a course code like "PET 301" or a title.',
  },
};

export const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const { colors } = useTheme();
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const currentUser = useAppSelector(state => state.user) || initialState;
  const [activeTab, setActiveTab] = useState<SearchTab>('people');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const tabs: { id: SearchTab; label: string }[] = [
    { id: 'people', label: 'People' },
    { id: 'posts', label: 'Posts' },
    { id: 'market', label: 'Store' },
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
            results = await searchUsers({
              q: searchQuery,
              viewerTier: currentUser.tier || 'free',
              viewerRole: currentUser.usertype || 'student',
            });
            break;
          case 'posts':
            results = await searchPosts(searchQuery);
            break;
          case 'market':
            results = searchICashMarketLocal(searchQuery);
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
  }, [searchQuery, activeTab, currentUser]);
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % CATEGORIES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  const renderItemCard = ({ item }: { item: any }) => {
    switch (activeTab) {
      case 'posts':
        return <PostCard post={item} isVisible={true} />;

      case 'people':
        return (
          <TouchableOpacity
            style={[
              styles.searchResultRow,
              { backgroundColor: colors.backgroundSecondary },
            ]}
            onPress={() => {
              navigation.navigate('Profile', { identifier: item.uid });
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
          <View style={styles.productWrapper}>
            <ProductCard
              product={item}
              onPress={() =>
                navigation.navigate('ProductDetails', {
                  productId: item.productId,
                })
              }
            />
          </View>
        );

      case 'courses':
        return (
          <CourseSearchCard
            item={item}
            navigation={navigation}
            colors={colors}
            onPress={() => {
              setSelectedCourse(item);
              setModalVisible(true);
            }}
          />
        );
      case 'resources':
        return (
          <ResourceSearchCard
            item={item}
            navigation={navigation}
            colors={colors}
          />
        );
    }
  };

  return (
    <View style={[styles.container]}>
      <View
        style={[
          styles.activeSearchHeader,
          {
            borderColor: colors.border,
          },
        ]}
      >
        <MaterialIcons
          name="search"
          size={20}
          color={colors.inputTextHolder}
          style={{ marginRight: 7 }}
        />

        <TextInput
          placeholderTextColor={colors.inputTextHolder}
          placeholder={`Search ${CATEGORIES[placeholderIndex]}...`}
          style={[styles.headerSearchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarScrollContainer}
        style={[
          styles.tabBarWrapper,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                setActiveTab(tab.id);
                setSearchResults([]);
              }}
              style={[styles.tab, isActive && styles.activeTab]}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive ? { color: colors.primary } : { color: colors.text },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {searchQuery.trim().length > 0 && (
        <>
          <View style={[styles.searchOverlayScreen]}>
            {isSearching ? (
              <View style={styles.searchEmptyState}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[styles.searchingText, { color: colors.text }]}>
                  Searching {TAB_META[activeTab].noun}…
                </Text>
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={item =>
                  item.postId ||
                  item.uid ||
                  item.courseId ||
                  item.productId ||
                  item._id ||
                  item.id
                }
                renderItem={renderItemCard}
                contentContainerStyle={{
                  paddingBottom: 40,
                  marginHorizontal: 15,
                }}
              />
            ) : searchQuery.trim().length < 2 ? (
              <EmptyState
                iconName={TAB_META[activeTab].icon}
                title="Keep typing…"
                subtitle={`Enter at least 2 characters to search ${TAB_META[activeTab].noun}.`}
                style={styles.emptyStatePadding}
              />
            ) : (
              <EmptyState
                iconName="search-off"
                title={`No ${TAB_META[activeTab].noun} found`}
                subtitle={`Nothing matches "${searchQuery.trim()}". ${TAB_META[activeTab].hint}`}
                chipsLabel="Search somewhere else"
                chips={tabs
                  .filter(tab => tab.id !== activeTab)
                  .map(tab => ({
                    label: tab.label,
                    icon: TAB_META[tab.id].icon,
                    onPress: () => {
                      setActiveTab(tab.id);
                      setSearchResults([]);
                    },
                  }))}
                secondaryButtonText="Clear search"
                onSecondaryPress={() => setSearchQuery('')}
                style={styles.emptyStatePadding}
              />
            )}
          </View>
        </>
      )}
      {searchQuery.trim().length === 0 && <PreSearchComponent />}
      {selectedCourse &&
        (currentUser.usertype === 'student' ||
          currentUser.usertype === 'lecturer') && (
          <CourseModal
            isVisible={modalVisible}
            onClose={() => setModalVisible(false)}
            course={selectedCourse}
          />
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  activeSearchHeader: {
    borderRadius: 8,
    borderWidth: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    height: 50,
    marginHorizontal: 15,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  searchOverlayScreen: {
    flex: 1,
  },
  searchResultRow: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 20,
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
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  searchingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.75,
  },
  emptyStatePadding: {
    flex: 0,
    marginTop: 24,
  },
  productWrapper: {
    width: CARD_WIDTH,
    marginBottom: 15,
  },
  tabBarScrollContainer: {
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tabBarWrapper: {
    marginBottom: 20,
    flexGrow: 0,
    alignSelf: 'stretch',
    marginHorizontal: 15,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginRight: 8,
  },
  activeTab: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
});