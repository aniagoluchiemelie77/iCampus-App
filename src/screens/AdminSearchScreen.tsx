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
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { ProductCard } from '../components/ProductCard';
import { PageHeader } from '../components/PageHeader';
import { PreSearchComponent } from '../components/PresearchComponent';
import {CourseSearchCard, ResourceSearchCard} from '../components/SearchScreenComponents';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

type SearchTab = 'people' | 'market' | 'resources' | 'courses' | 'posts';


export const AdminSearchScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { allProducts } = useAppDataContext();
  const currentUser = useAppSelector(state => state.admin);
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
              viewerTier: currentUser.adminType || 'free',
              viewerRole: 'admin',
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
    <View style={[StyleSheet.absoluteFillObject]}>
      <PageHeader title="iCampus Admin Search" />
      <View
        style={[
          styles.activeSearchHeader,
          {
            backgroundColor: colors.backgroundSecondary,
          },
        ]}
      >
        <TextInput
          autoFocus
          placeholder={`Search ${activeTab}...`}
          style={[
            styles.headerSearchInput,
            { color: colors.text, borderColor: colors.border },
          ]}
          placeholderTextColor={colors.inputTextHolder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      {searchQuery.trim().length > 0 && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarScrollContainer}
            style={[
              styles.tabBarContainer,
              {
                borderBottomColor: colors.border,
                backgroundColor: colors.backgroundSecondary,
              },
            ]}
          >
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabItem,
                    isActive && { borderBottomColor: colors.primary },
                  ]}
                  onPress={() => {
                    setActiveTab(tab.id);
                    setSearchResults([]);
                  }}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color: isActive ? colors.primary : colors.text,
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
                contentContainerStyle={{ paddingBottom: 40 }}
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
      {searchQuery.trim().length === 0 && (
        <PreSearchComponent
          tabs={tabs}
          setActiveTab={setActiveTab}
          setSearchQuery={setSearchQuery}
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
    alignContent: 'center',
    marginBottom: 15,
    padding: 15,
    borderRadius: 15,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
    borderWidth: 0.8,
    borderRadius: 12,
  },
  tabBarContainer: {
    borderBottomWidth: 0.5,
    marginBottom: 15,
  },
  tabItem: {
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    alignItems: 'center',
    padding: 8,
    marginRight: 10,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
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
    alignContent: 'center',
    paddingTop: 60,
  },
  emptyStatePadding: {
    marginTop: 80,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  tabBarScrollContainer: {
    padding: 15,
    alignItems: 'center',
    borderRadius: 15,
  },
  productWrapper: {
    width: CARD_WIDTH,
    marginBottom: 15,
  },
});