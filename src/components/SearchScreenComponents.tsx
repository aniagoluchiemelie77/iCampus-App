import React from 'react';
import {
  Image,
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT_MAIN,
} from '../assets/styles/colors';
import { formatCount } from '../utils/followCountFormatter';

interface CourseSearchCardProps {
  item: any;
  navigation: any;
  colors: any;
  onPress?: () => void;
}

export const CourseSearchCard = ({
  item,
  colors,
  onPress,
}: CourseSearchCardProps) => {
  const getCourseInitials = (title: string) => {
    return (title || 'Course Title')
      .split(' ')
      .filter(Boolean)
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
      <View style={styles.cardHeaderTop}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImg} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.initialsText}>
              {item.courseCode
                ? item.courseCode
                : getCourseInitials(item.courseTitle)}
            </Text>
          </View>
        )}
        <View style={styles.infoMetaContainer}>
          <View style={styles.badgeRow}>
            <View style={styles.academicBadge}>
              <Text style={styles.academicBadgeText}>Institutional</Text>
            </View>
          </View>

          <Text
            style={[styles.courseTitleHeader, { color: colors.text }]}
            numberOfLines={2}
          >
            {item.courseTitle}
          </Text>

          {item.instructors ? (
            <Text
              style={[styles.instructorNameSub, { color: colors.primaryTint }]}
              numberOfLines={1}
            >
              By {item.instructors}
            </Text>
          ) : null}

          {item.studentsCount !== undefined && item.studentsCount !== null && (
            <View style={styles.metricRowGroup}>
              <MaterialIcons
                name="people"
                size={14}
                color={colors.primaryTint}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.studentsCountMetric,
                  { color: colors.primaryTint },
                ]}
              >
                {formatCount(item.studentsCount)}{' '}
                {item.studentsCount === 1 ? 'student' : 'students'} enrolled
              </Text>
            </View>
          )}
        </View>
      </View>

      {item.semester && (
        <View style={[styles.rowDiv, { borderTopColor: colors.border + '33' }]}>
          <View style={styles.metricColGroup}>
            <MaterialIcons
              name="calendar-month"
              size={15}
              color={colors.primaryTint}
              style={{ marginBottom: 2 }}
            />
            <Text style={[styles.metricLabelText, { color: colors.text }]}>
              {item.semester}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricColGroup}>
            <MaterialIcons
              name="date-range"
              size={15}
              color={colors.primaryTint}
              style={{ marginBottom: 2 }}
            />
            <Text style={[styles.metricLabelText, { color: colors.text }]}>
              {item.session}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricColGroup}>
            <MaterialIcons
              name="scale"
              size={15}
              color={colors.primaryTint}
              style={{ marginBottom: 2 }}
            />
            <Text style={[styles.metricLabelText, { color: colors.text }]}>
              {item.credits} units
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};
export const ResourceSearchCard = ({
  item,
  navigation,
  colors,
}: {
  item: any;
  navigation: any;
  colors: any;
}) => {
  const getFileIconProps = (mimetype?: string, url?: string) => {
    const fmt =
      mimetype?.toLowerCase() || url?.split('.').pop()?.toLowerCase() || '';

    if (fmt.includes('pdf')) {
      return { name: 'picture-as-pdf', color: '#EF4444' };
    }
    if (
      fmt.includes('word') ||
      ['doc', 'docx'].some(ext => fmt.includes(ext))
    ) {
      return { name: 'description', color: '#3B82F6' };
    }
    if (
      fmt.includes('sheet') ||
      fmt.includes('excel') ||
      ['xls', 'xlsx', 'csv'].some(ext => fmt.includes(ext))
    ) {
      return { name: 'table-chart', color: '#10B981' };
    }
    if (
      fmt.includes('presentation') ||
      ['ppt', 'pptx'].some(ext => fmt.includes(ext))
    ) {
      return { name: 'slideshow', color: '#F59E0B' };
    }
    if (
      fmt.includes('image') ||
      ['jpg', 'jpeg', 'png', 'webp'].some(ext => fmt.includes(ext))
    ) {
      return { name: 'image', color: '#8B5CF6' }; // Purple for Images
    }
    return { name: 'insert-drive-file', color: PRIMARY_COLOR_TINT_MAIN };
  };
  const formatBytes = (bytes?: number | string) => {
    if (!bytes || typeof bytes !== 'number') return '';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const iconProps = getFileIconProps(item.resourceMimetype, item.resourceUrl);
  const formattedSize = formatBytes(item.resourceSize);

  const handlePress = () => {
    if (item.isPremiumPaid) {
      navigation.navigate('ProductDetails', {
        productId: item.id || item.productId,
      });
    } else {
      navigation.navigate('CourseDetails', { courseId: item.courseId });
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.backgroundSecondary || '#ffffff',
          borderColor: colors.border || '#f0f0f0',
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${iconProps.color}15` },
        ]}
      >
        <MaterialIcons
          name={iconProps.name}
          size={24}
          color={iconProps.color}
        />
      </View>

      <View style={styles.metaContainer}>
        <Text
          style={[styles.titleText, { color: colors.text || '#1F2937' }]}
          numberOfLines={1}
        >
          {item.resourceTitle || item.title || 'Untitled Resource'}
        </Text>

        <View style={styles.badgeRow}>
          <Text
            style={[styles.sourceText, { color: colors.subtext || '#6B7280' }]}
            numberOfLines={1}
          >
            {item.metaSource || item.courseTitle || 'General Material'}
          </Text>
          {formattedSize ? (
            <Text
              style={[styles.sizeText, { color: colors.subtext || '#9CA3AF' }]}
            >
              • {formattedSize}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.actionContainer,
          { backgroundColor: colors.card || '#F9FAFB' },
        ]}
      >
        <MaterialIcons
          name="chevron-right"
          size={18}
          color={colors.text || '#9CA3AF'}
        />
      </View>
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
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
  cardWrapper: {
    padding: 16,
    marginBottom: 15,
    borderRadius: 16,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnailImg: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: PRIMARY_COLOR_TINT_MAIN,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  infoMetaContainer: {
    flex: 1,
    marginLeft: 12,
  },
  academicBadge: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  academicBadgeText: {
    color: PRIMARY_COLOR_TINT_MAIN,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  courseTitleHeader: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 2,
  },
  instructorNameSub: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  metricRowGroup: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentsCountMetric: {
    fontSize: 12,
    fontWeight: '500',
  },
  rowDiv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  metricColGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricLabelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginVertical: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  sizeText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '400',
  },
  actionContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
});