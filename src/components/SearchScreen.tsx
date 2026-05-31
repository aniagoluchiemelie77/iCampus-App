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
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PostCard } from './PostCard';
import { UserAvatar } from './UserAvatar';
import { UserIdentity } from './UserIdentity';
import { EmptyState } from './EmptyFlatlistComponent';
import { useAppSelector } from './hooks';
import {
  searchPosts,
  searchUsers,
  searchICashMarketLocal,
  searchCourses,
  searchAcademicResources,
} from '../api/localGetApis';
import { PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { useAppDataContext } from './EventContext';
import { CurrencyDisplay } from './CurrencyFormatter';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { ProductCard } from './ProductCard';
import { PageHeader } from '../components/PageHeader';

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
type SearchTab = 'people' | 'market' | 'resources' | 'courses' | 'posts';

const CourseSearchCard = ({
  item,
  navigation,
  colors,
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
    if (item.isPremiumPaid) {
      navigation.navigate('ProductDetails', { productId: item.id });
    } else {
      navigation.navigate('ViewCourse', { courseId: item.id });
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.cardWrapper,
        { borderBottomColor: colors.border },
        !item.isActive && { opacity: 0.5 },
      ]}
      onPress={handleNavigationRoute}
      disabled={!item.isActive}
    >
      {/* LEFT ASPECT: IMAGING PICTURE OR CHARACTER AVATAR GLYPH */}
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImg} />
      ) : (
        <View
          style={[
            styles.avatarPlaceholder,
            { backgroundColor: item.isPremiumPaid ? '#8E44AD' : '#2C3E50' },
          ]}
        >
          <Text style={styles.initialsText}>
            {getCourseInitials(item.title)}
          </Text>
        </View>
      )}

      {/* MID PANEL: CORE COURSE IDENTITY METADATA CONTENT */}
      <View style={styles.infoMetaContainer}>
        <View style={styles.badgeRow}>
          <Text style={[styles.courseCodeLabel, { color: colors.tint }]}>
            {item.code}
          </Text>
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
          style={[styles.instructorNameSub, { color: colors.tint }]}
          numberOfLines={1}
        >
          By {item.instructors}
        </Text>

        <View style={styles.metricRowGroup}>
          <MaterialIcons
            name="people-outline"
            size={14}
            color={colors.tint}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.studentsCountMetric, { color: colors.tint }]}>
            {item.studentsCount}{' '}
            {item.studentsCount === 1 ? 'student' : 'students'} enrolled
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
    if (fmt === 'pdf') return { name: 'file-pdf-box', color: '#E74C3C' };
    if (['doc', 'docx'].includes(fmt))
      return { name: 'file-word-box', color: '#2B579A' };
    if (['xls', 'xlsx'].includes(fmt))
      return { name: 'file-excel-box', color: '#217346' };
    if (['ppt', 'pptx'].includes(fmt))
      return { name: 'file-powerpoint-box', color: '#D24726' };
    if (['jpg', 'jpeg', 'png'].includes(fmt))
      return { name: 'file-image-outline', color: '#3498DB' };
    return { name: 'file-document-outline', color: '#7F8C8D' };
  };

  const iconProps = getFileIconProps(item.format);

  const handlePress = () => {
    if (item.isPremiumPaid) {
      // Navigate to marketplace file listing details
      navigation.navigate('ProductDetails', { productId: item.id });
    } else {
      // Navigate to institutional course classroom overview
      navigation.navigate('CourseDetails', { courseId: item.courseId });
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* File Icon Block */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${iconProps.color}15` },
        ]}
      >
        <MaterialIcons
          name={iconProps.name}
          size={32}
          color={iconProps.color}
        />
      </View>

      {/* Metadata / Content Block */}
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

      {/* Action Block (Price Tag or Open Arrow) */}
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
            results = await searchUsers(
              searchQuery,
              currentUser.tier || 'free',
              currentUser.usertype || 'student',
            );
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
          <ProductCard
            product={item}
            onPress={() =>
              navigation.navigate('ProductDetails', {
                productId: item.productId,
              })
            }
          />
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
    <View
      style={[
        StyleSheet.absoluteFillObject,
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <PageHeader title="iCampus Search" showBackButton={false} />
      <View
        style={[
          styles.activeSearchHeader,
          {
            borderBottomColor: colors.border,
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
      <View
        style={[
          styles.searchOverlayScreen,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
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
    paddingHorizontal: 16,
    paddingVertical: 15,
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
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingVertical: 10,
  },
});