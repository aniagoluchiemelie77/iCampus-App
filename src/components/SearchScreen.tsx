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
import { useAppDataContext } from '../context/EventContext';
import { initialState } from '../context/UserSlice.ts';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { ProductCard } from '../components/ProductCard';
import { PageHeader } from '../components/PageHeader';
import { PreSearchComponent } from '../components/PresearchComponent';
import {
  CourseSearchCard,
  ResourceSearchCard,
} from '../components/SearchScreenComponents';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR } from '../assets/styles/colors.ts';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

type SearchTab = 'people' | 'market' | 'resources' | 'courses' | 'posts';
const CATEGORIES = ['people', 'posts', 'courses', 'resources', 'store'];

export const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const { allProducts } = useAppDataContext();
  const currentUser = useAppSelector(state => state.user) || initialState;
  const [activeTab, setActiveTab] = useState<SearchTab>('people');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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
            style={styles.searchResultRow}
            onPress={() => {
              navigation.navigate('Profile', { uid: item.uid });
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
      <PageHeader title="iCampus Search" showBackButton={false} />
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
          autoFocus
          placeholder={`Search for ${CATEGORIES[placeholderIndex]}...`}
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
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={item =>
                  item.postId || item.uid || item.id || item._id
                }
                renderItem={renderItemCard}
                contentContainerStyle={{
                  paddingBottom: 40,
                  marginHorizontal: 15,
                }}
              />
            ) : (
              <EmptyState
                iconName={searchQuery.length < 2 ? 'search' : 'find-in-page'}
                title={
                  searchQuery.length < 2
                    ? `Search iCampus ${activeTab}`
                    : 'No Results Found'
                }
                subtitle={
                  searchQuery.length < 2
                    ? `Enter at least 2 characters to look through the platform database directory updates.`
                    : `We couldn't discover any matches matching "${searchQuery}" inside this tab profile context.`
                }
                style={styles.emptyStatePadding}
              />
            )}
          </View>
        </>
      )}
      {searchQuery.trim().length === 0 && <PreSearchComponent />}
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
    borderRadius: 15,
    marginBottom: 15,
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
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyStatePadding: {
    marginTop: 80,
    paddingHorizontal: 32,
    alignItems: 'center',
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