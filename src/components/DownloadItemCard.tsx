import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { EnrichedCourseProduct } from '../types/firebase';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { formatDistanceToNow } from 'date-fns';
import { formatTime } from '../utils/durationFormatter';

interface DownloadItemCardProps {
  product: EnrichedCourseProduct;
  onPress?: () => void;
}

export const DownloadItemCard: React.FC<DownloadItemCardProps> = ({
  product,
  onPress,
}) => {
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
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: product.mediaUrls[0] || 'https://via.placeholder.com/150',
          }}
          style={styles.thumbnail}
        />
        {/* Play icon overlay to signal "Video Content" */}
        <View style={styles.playOverlay}>
          <MaterialIcons
            name="play-circle-filled-outlined"
            size={24}
            color="#fff"
          />
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        {product.description && (
          <Text style={styles.subtitle} numberOfLines={2} ellipsizeMode="tail">
            {product.description}
          </Text>
        )}
        <View style={styles.metaRow}>
          <MaterialIcons
            name="access-time-outlined"
            size={14}
            color={PRIMARY_COLOR_TINT}
          />
          <Text style={styles.metaText}>{durationDisplay}</Text>
          <Text style={[styles.metaText, isFirstVisit && styles.newStatus]}>
            {lastVisitedText}
          </Text>
        </View>
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${progress}%` },
                progress === 100 && { backgroundColor: PRIMARY_COLOR },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress === 100 ? 'Completed' : `${progress}% complete`}
          </Text>
        </View>
      </View>

      <MaterialIcons
        name="chevron-right"
        size={28}
        color={PRIMARY_COLOR_TINT}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fadccc',
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
    position: 'relative',
    alignContent: 'center',
  },
  thumbnail: {
    width: 85,
    height: 60,
    borderRadius: 6,
  },
  playOverlay: {
    position: 'absolute',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 20,
    padding: 4,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: PRIMARY_COLOR_TINT,
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
    color: PRIMARY_COLOR_TINT,
    marginLeft: 3,
  },
  metaDot: {
    fontSize: 11,
    color: '#6A6F73',
  },
  newStatus: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  progressSection: {
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: PRIMARY_COLOR_TINT,
    borderRadius: 2,
    maxWidth: 100,
  },
  progressBar: {
    height: '100%',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: PRIMARY_COLOR,
    marginTop: 3,
    fontWeight: '500',
  },
});