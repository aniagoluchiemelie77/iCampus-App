import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { EnrichedCourseProduct } from '../types/firebase';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { formatDistanceToNow } from 'date-fns';
import { formatTime } from '../utils/durationFormatter';
import { useTheme } from '../context/ThemeContext';

interface DownloadItemCardProps {
  product: EnrichedCourseProduct;
  onPress?: () => void;
}

export const DownloadItemCard: React.FC<DownloadItemCardProps> = ({
  product,
  onPress,
}) => {
  const { colors } = useTheme();
  const progress = product.progress ?? 0;
  const isFirstVisit = !product.lastAccessed || product.progress === 0;
  const lastVisitedText = isFirstVisit
    ? 'Start Course'
    : `Last visited: ${formatDistanceToNow(
        new Date(product.lastAccessed),
      )} ago`;
  const totalDuration =
    product.courseDetails?.content?.reduce(
      (acc, lesson) => acc + (lesson.duration || 0),
      0,
    ) || 0;
  const durationDisplay = formatTime(totalDuration);
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: product.mediaUrls[0] || 'https://via.placeholder.com/150',
          }}
          style={styles.thumbnail}
        />
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.title, { color: colors.textDarker }]}
          numberOfLines={2}
        >
          {product.title}
        </Text>
        {product.description && (
          <Text
            style={[styles.subtitle, { color: colors.text }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {product.description}
          </Text>
        )}
        <View style={styles.metaRow}>
          <MaterialIcons
            name="access-time-outlined"
            size={14}
            color={colors.primaryTint}
          />
          <Text style={styles.metaText}>{durationDisplay}</Text>
          <Text
            style={[
              styles.metaText,
              isFirstVisit ? { color: colors.primary } : { color: colors.text },
            ]}
          >
            {lastVisitedText}
          </Text>
        </View>
        <View style={styles.progressSection}>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: colors.primaryTint },
            ]}
          >
            <View
              style={[
                styles.progressBar,
                { width: `${progress}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.text }]}>
            {progress === 100 ? 'Completed' : `${progress}% complete`}
          </Text>
        </View>
      </View>

      <MaterialIcons
        name="chevron-right"
        size={28}
        color={colors.primary}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imageContainer: {
    alignContent: 'center',
  },
  thumbnail: {
    width: 85,
    height: 60,
    borderRadius: 6,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
    width: '100%',
  },
  metaText: {
    fontSize: 11,
    marginLeft: 3,
  },
  progressSection: {
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    maxWidth: 100,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
});