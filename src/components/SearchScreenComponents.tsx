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

  const isActive = item.isActive !== false;
  // "GET 321" → "GET" over "321" in the tile.
  const code: string = (item.courseCode || getCourseInitials(item.courseTitle)).trim();
  const codeMatch = code.match(/^([A-Za-z]+)\s*-?\s*(\d+[A-Za-z]?)$/);
  const semesterLabel = item.semester
    ? /^\d+$/.test(String(item.semester))
      ? `Sem ${item.semester}`
      : `${item.semester} sem`
    : null;
  const credits = Number(item.credits);
  const meta = [
    semesterLabel && { icon: 'event-note', label: semesterLabel },
    item.session && { icon: 'date-range', label: item.session },
    Number.isFinite(credits) && credits > 0 && {
      icon: 'workspace-premium',
      label: `${credits} ${credits === 1 ? 'unit' : 'units'}`,
    },
  ].filter(Boolean) as { icon: string; label: string }[];

  return (
    <TouchableOpacity
      style={[
        styles.cardWrapper,
        { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
        !isActive && styles.cardInactive,
      ]}
      onPress={onPress}
      disabled={!isActive || !onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${code}, ${item.courseTitle}${isActive ? '' : ', inactive'}`}
    >
      <View style={styles.cardHeaderTop}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImg} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
            {codeMatch ? (
              <>
                <Text style={styles.codePrefix}>{codeMatch[1].toUpperCase()}</Text>
                <Text style={styles.codeNumber}>{codeMatch[2]}</Text>
              </>
            ) : (
              <Text style={styles.initialsText} numberOfLines={2}>
                {code.toUpperCase()}
              </Text>
            )}
          </View>
        )}
        <View style={styles.infoMetaContainer}>
          <View style={styles.badgeRow}>
            <View style={[styles.academicBadge, { backgroundColor: colors.primary + '1A' }]}>
              <MaterialIcons name="account-balance" size={10} color={colors.primary} />
              <Text style={[styles.academicBadgeText, { color: colors.primary }]}>
                Institutional
              </Text>
            </View>
            {!isActive && (
              <View style={[styles.academicBadge, { backgroundColor: colors.border + '66' }]}>
                <Text style={[styles.academicBadgeText, { color: colors.text }]}>Inactive</Text>
              </View>
            )}
          </View>

          <Text
            style={[styles.courseTitleHeader, { color: colors.textDarker }]}
            numberOfLines={2}
          >
            {item.courseTitle}
          </Text>

          {item.instructors ? (
            <Text
              style={[styles.instructorNameSub, { color: colors.text }]}
              numberOfLines={1}
            >
              By {item.instructors}
            </Text>
          ) : null}

          {item.studentsCount !== undefined && item.studentsCount !== null && (
            <View style={styles.metricRowGroup}>
              <MaterialIcons
                name="people"
                size={13}
                color={colors.text}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.studentsCountMetric, { color: colors.text }]}>
                {formatCount(item.studentsCount)}{' '}
                {item.studentsCount === 1 ? 'student' : 'students'} enrolled
              </Text>
            </View>
          )}
        </View>
        {isActive && !!onPress && (
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={colors.text}
            style={styles.chevron}
          />
        )}
      </View>

      {meta.length > 0 && (
        <View style={styles.rowDiv}>
          {meta.map(m => (
            <View key={m.icon} style={[styles.metaChip, { backgroundColor: colors.background }]}>
              <MaterialIcons name={m.icon} size={13} color={colors.primary} />
              <Text style={[styles.metricLabelText, { color: colors.text }]} numberOfLines={1}>
                {m.label}
              </Text>
            </View>
          ))}
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
    padding: 14,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardInactive: { opacity: 0.55 },
  cardHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailImg: {
    width: 62,
    height: 62,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  codePrefix: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.85,
  },
  codeNumber: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
    marginTop: -1,
  },
  initialsText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  infoMetaContainer: {
    flex: 1,
    marginLeft: 12,
  },
  chevron: { marginLeft: 4, opacity: 0.6 },
  academicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  academicBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  courseTitleHeader: {
    fontSize: 15.5,
    fontWeight: '800',
    lineHeight: 20,
  },
  instructorNameSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.8,
  },
  metricRowGroup: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentsCountMetric: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  rowDiv: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  metricLabelText: {
    fontSize: 12,
    fontWeight: '700',
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