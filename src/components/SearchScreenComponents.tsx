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
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { formatCount } from '../utils/followCountFormatter';

interface CourseSearchCardProps {
  item: any;
  navigation: any;
  colors: any;
  onPress?: () => void;
}

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
export const ResourceSearchCard = ({
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
              { color: colors.text || '#7F8C8D' },
            ]}
          >
            {item.metaSource}
          </Text>
          {item.fileSize && (
            <Text
              style={[
                styles.sizeText,
                { color: colors.text || '#7F8C8D' },
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
            color={colors.text || '#7F8C8D'}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
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
  rowDiv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
});