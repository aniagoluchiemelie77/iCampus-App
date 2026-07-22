import React, { useState, useEffect } from 'react';
import {
  Image,
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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PostCard } from './PostCard';
import { UserAvatar } from './UserAvatar';
import { UserIdentity } from './UserIdentity';
import { EmptyState } from './EmptyFlatlistComponent';
import { useAppSelector } from '../hooks/hooks';
import {
  searchPosts,
  searchUsers,
  searchICashMarketLocal,
  searchCourses,
  searchAcademicResources,
} from '../api/localGetApis';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT_MAIN,
} from '../assets/styles/colors';
import { useAppDataContext } from '../context/EventContext';
import { CurrencyDisplay } from './CurrencyFormatter';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { ProductCard } from './ProductCard';
import { PageHeader } from '../components/PageHeader';
import { formatCount } from '../utils/followCountFormatter';
import { PreSearchComponent } from '../components/PresearchComponent';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface CourseSearchCardProps {
  item: any;
  navigation: any;
  colors: any;
  onPress?: () => void;
}
type SearchTab = 'people' | 'market' | 'resources' | 'courses' | 'posts';

export const CourseSearchCard = ({
  item,
  navigation,
  colors,
  onPress,
}: CourseSearchCardProps) => {
  const getCourseInitials = (title: string) => {
    return title
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
  };

  const handleNavigationRoute = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (item.isPremiumPaid) {
      navigation.navigate('ProductDetails', { productId: item.id });
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.cardWrapper,
        { backgroundColor: colors.backgroundSecondary },
      ]}
      onPress={handleNavigationRoute}
      disabled={!item.isActive}
    >
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImg} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.initialsText}>
            {item.code ? item.code : getCourseInitials(item.title)}
          </Text>
        </View>
      )}
      <View style={styles.infoMetaContainer}>
        <View style={styles.badgeRow}>
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

        <Text
          style={[styles.courseTitleHeader, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text
          style={[styles.instructorNameSub, { color: colors.primaryTint }]}
          numberOfLines={1}
        >
          By {item.instructors}
        </Text>
        {item.isPremiumPaid && (
          <CurrencyDisplay value={item.price} size="small" />
        )}
        <View style={styles.metricRowGroup}>
          <MaterialIcons
            name="people-outlined"
            size={14}
            color={colors.primaryTint}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[styles.studentsCountMetric, { color: colors.primaryTint }]}
          >
            {formatCount(item.studentsCount)}{' '}
            {item.studentsCount === 1 ? 'student' : 'students'} enrolled
          </Text>
        </View>
        {item.semester && (
          <View style={styles.rowDiv}>
            <View style={styles.metricColGroup}>
              <MaterialIcons
                name="calendar-month-outlined"
                size={16}
                color={colors.text}
                style={{ marginBottom: 4 }}
              />
              <Text
                style={[styles.studentsCountMetric, { color: colors.text }]}
              >
                {item.semester}
              </Text>
            </View>
            <View style={styles.metricColGroup}>
              <MaterialIcons
                name="calendar-month-outlined"
                size={16}
                color={colors.text}
                style={{ marginBottom: 4 }}
              />
              <Text
                style={[styles.studentsCountMetric, { color: colors.text }]}
              >
                {item.session}
              </Text>
            </View>
            <View style={styles.metricColGroup}>
              <MaterialIcons
                name="scale-outlined"
                size={16}
                color={colors.text}
                style={{ marginBottom: 4 }}
              />
              <Text
                style={[styles.studentsCountMetric, { color: colors.text }]}
              >
                {item.creditLoad} units
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
const ResourceSearchCard = ({
  item,
  navigation,
  colors,
}: {
  item: any;
  navigation: any;
  colors: any;
}) => {
  const getFileIconProps = (format: string) => {
    const fmt = format?.toLowerCase();
    if (fmt === 'pdf')
      return {
        name: 'picture-as-pdf-outlined',
        color: PRIMARY_COLOR_TINT_MAIN,
      };
    if (['doc', 'docx'].includes(fmt))
      return {
        name: 'insert-drive-file-outlined',
        color: PRIMARY_COLOR_TINT_MAIN,
      };
    if (['xls', 'xlsx'].includes(fmt))
      return { name: 'article-outlined', color: PRIMARY_COLOR_TINT_MAIN };
    if (['ppt', 'pptx'].includes(fmt))
      return {
        name: 'insert-drive-file-outlined',
        color: PRIMARY_COLOR_TINT_MAIN,
      };
    if (['jpg', 'jpeg', 'png'].includes(fmt))
      return { name: 'image-outlined', color: PRIMARY_COLOR_TINT_MAIN };
    return {
      name: 'insert-drive-file-outlined',
      color: PRIMARY_COLOR_TINT_MAIN,
    };
  };
  const iconProps = getFileIconProps(item.format);
  const handlePress = () => {
    if (item.isPremiumPaid) {
      navigation.navigate('ProductDetails', { productId: item.id });
    } else {
      navigation.navigate('CourseDetails', { courseId: item.courseId });
    }
  };
  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        { backgroundColor: colors.backgroundSecondary },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <MaterialIcons
          name={iconProps.name}
          size={32}
          color={iconProps.color}
        />
      </View>
      <View style={styles.metaContainer}>
        <Text
          style={[styles.titleText, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <View style={styles.badgeRow}>
          <Text
            style={[
              styles.sourceText,
              { color: colors.textMuted || '#7F8C8D' },
            ]}
          >
            {item.metaSource}
          </Text>
          {item.fileSize && (
            <Text
              style={[
                styles.sizeText,
                { color: colors.textMuted || '#7F8C8D' },
              ]}
            >
              • {item.fileSize}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.actionContainer}>
        {item.isPremiumPaid ? (
          <View style={[styles.priceBadge, { backgroundColor: '#FF950020' }]}>
            <MaterialIcons
              name="star-circle"
              size={14}
              color="#FF9500"
              style={{ marginRight: 2 }}
            />
            <Text style={[styles.priceText, { color: '#FF9500' }]}>
              {item.price > 0 ? `${item.price} pts` : 'Free'}
            </Text>
          </View>
        ) : (
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={colors.textMuted || '#7F8C8D'}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

export const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { allProducts } = useAppDataContext();
  const currentUser = useAppSelector(state => state.user);
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
      <PageHeader title="iCampus Search" showBackButton={false} />
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
  cardWrapper: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    borderRadius: 15,
  },
  thumbnailImg: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    alignContent: 'center',
  },
  initialsText: {
    color: PRIMARY_COLOR_TINT_MAIN,
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
  premiumBadge: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premiumBadgeText: {
    color: PRIMARY_COLOR_TINT_MAIN,
    fontSize: 10,
    fontWeight: '700',
  },
  academicBadge: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  academicBadgeText: {
    color: PRIMARY_COLOR_TINT_MAIN,
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
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricColGroup: {
    alignItems: 'center',
  },
  studentsCountMetric: {
    fontSize: 12,
  },
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
    alignContent: 'center',
  },
  metaContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  sourceText: {
    fontSize: 12,
  },
  sizeText: {
    fontSize: 12,
    marginLeft: 4,
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
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
  rowDiv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
});