import React from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Text,
  ScrollView,
} from 'react-native';
import Video from 'react-native-video';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface MediaItem {
  type: 'image' | 'video';
  uri: string[];
}
interface MediaPreviewListProps {
  mediaList: MediaItem[];
  onRemove: (index: number) => void;
  onPickMedia: () => void;
  disabled?: boolean;
  colors: any;
}
export const MediaPreviewList = ({
  mediaList,
  onRemove,
  onPickMedia,
  disabled,
  colors,
}: MediaPreviewListProps) => {
  return (
    <View style={styles.container}>
      {mediaList.map((item, index) => (
        <View
          key={index}
          style={[styles.previewCard, { borderColor: colors.border }]}
        >
          {item.type === 'image' ? (
            <Image source={{ uri: item.uri[0] }} style={styles.mediaImage} />
          ) : (
            <Video
              source={{ uri: item.uri[0] }}
              style={styles.mediaImage}
              muted
              repeat
              resizeMode="cover"
              paused={false}
              controls={false}
            />
          )}
          <TouchableOpacity
            style={[
              styles.removeButton,
              { backgroundColor: colors.background || '#fff' },
            ]}
            onPress={() => onRemove(index)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="close" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ))}
      {!disabled && (
        <TouchableOpacity
          onPress={onPickMedia}
          activeOpacity={0.7}
          style={[
            styles.modernPickerBtn,
            {
              backgroundColor: colors.backgroundSecondary || '#f9f9f9',
              borderColor: colors.primary + '40',
            },
          ]}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.primary + '15' },
            ]}
          >
            <MaterialIcons
              name="add-a-photo"
              size={26}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.pickerText, { color: colors.text }]}>
            Add Photos or Video
          </Text>
          <Text
            style={[
              styles.pickerSubText,
              { color: colors.inputTextHolder || '#8c8c8c' },
            ]}
          >
            Up to 4 files ({mediaList.length}/4)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
export const HorizontalScrollableMediaPreviewList = ({
  mediaList,
  onRemove,
  onPickMedia,
  disabled,
  colors,
}: MediaPreviewListProps) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {mediaList.map((item, index) => (
          <View
            key={index}
            style={[styles.previewCardH, { borderColor: colors.border }]}
          >
            {item.type === 'image' ? (
              <Image source={{ uri: item.uri[0] }} style={styles.mediaImage} />
            ) : (
              <Video
                source={{ uri: item.uri[0] }}
                style={styles.mediaImage}
                muted
                repeat
                resizeMode="cover"
                paused={false}
                controls={false}
              />
            )}
            <TouchableOpacity
              style={[
                styles.removeButton,
                { backgroundColor: colors.background || '#fff' },
              ]}
              onPress={() => onRemove(index)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="close" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ))}

        {!disabled && (
          <TouchableOpacity
            onPress={onPickMedia}
            activeOpacity={0.7}
            style={[
              styles.modernPickerBtnH,
              {
                backgroundColor: colors.backgroundSecondary || '#f9f9f9',
                borderColor: colors.primary + '40',
              },
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.primary + '15' },
              ]}
            >
              <MaterialIcons
                name="add-a-photo"
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.pickerTextContainer}>
              <Text style={[styles.pickerText, { color: colors.text }]}>
                Add Media
              </Text>
              <Text
                style={[
                  styles.pickerSubTextH,
                  { color: colors.inputTextHolder || '#8c8c8c' },
                ]}
              >
                {mediaList.length}/4 files
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};
interface MediaGridItem extends MediaItem {
  duration?: number;
}
const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return '';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const MediaTile = ({
  item,
  onRemove,
  style,
}: {
  item: MediaGridItem;
  onRemove: () => void;
  style: any;
}) => (
  <View style={[styles.gridTile, style]}>
    {item.type === 'image' ? (
      <Image source={{ uri: item.uri[0] }} style={styles.mediaImage} />
    ) : (
      <Video
        source={{ uri: item.uri[0] }}
        style={styles.mediaImage}
        muted
        repeat
        resizeMode="cover"
        paused={false}
        controls={false}
      />
    )}
    {item.type === 'video' && (
      <View style={styles.videoBadge}>
        <MaterialIcons name="play-arrow" size={14} color="#fff" />
        {!!formatDuration(item.duration) && (
          <Text style={styles.videoBadgeText}>{formatDuration(item.duration)}</Text>
        )}
      </View>
    )}
    <TouchableOpacity
      style={styles.gridRemove}
      onPress={onRemove}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel="Remove media"
    >
      <MaterialIcons name="close" size={16} color="#fff" />
    </TouchableOpacity>
  </View>
);

/**
 * Adapts to the number of items the way feeds lay them out:
 * 1 full width, 2 side by side, 3 one large plus two stacked, 4 a 2x2 grid.
 */
export const MediaGrid = ({
  mediaList,
  onRemove,
}: {
  mediaList: MediaGridItem[];
  onRemove: (index: number) => void;
}) => {
  const count = mediaList.length;
  if (count === 0) return null;
  const tile = (index: number, style: any) => (
    <MediaTile
      key={`${mediaList[index].uri[0]}-${index}`}
      item={mediaList[index]}
      onRemove={() => onRemove(index)}
      style={style}
    />
  );

  if (count === 1) {
    return (
      <View style={styles.grid}>
        {tile(0, { aspectRatio: mediaList[0].type === 'video' ? 16 / 10 : 4 / 3 })}
      </View>
    );
  }
  if (count === 2) {
    return (
      <View style={[styles.grid, styles.gridRow, { aspectRatio: 2 / 1.2 }]}>
        {tile(0, styles.flexTile)}
        {tile(1, styles.flexTile)}
      </View>
    );
  }
  if (count === 3) {
    return (
      <View style={[styles.grid, styles.gridRow, { aspectRatio: 4 / 3 }]}>
        {tile(0, styles.flexTile)}
        <View style={[styles.flexTile, styles.gridColumn]}>
          {tile(1, styles.flexTile)}
          {tile(2, styles.flexTile)}
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.grid, styles.gridColumn, { aspectRatio: 1 }]}>
      <View style={[styles.flexTile, styles.gridRow]}>
        {tile(0, styles.flexTile)}
        {tile(1, styles.flexTile)}
      </View>
      <View style={[styles.flexTile, styles.gridRow]}>
        {tile(2, styles.flexTile)}
        {tile(3, styles.flexTile)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { marginTop: 16, marginBottom: 8, width: '100%' },
  gridRow: { flexDirection: 'row', gap: 4 },
  gridColumn: { flexDirection: 'column', gap: 4 },
  flexTile: { flex: 1 },
  gridTile: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  gridRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  videoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  container: {
    marginVertical: 20,
  },
  previewCard: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
    backgroundColor: '#000',
  },
  scrollContent: {
    alignItems: 'center',
    paddingRight: 10,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modernPickerBtn: {
    width: '100%',
    height: 90,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  pickerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  pickerSubText: {
    fontSize: 12,
    marginTop: 2,
    position: 'absolute',
    left: 85,
    top: 50,
  },
  previewCardH: {
    width: 140,
    height: 140,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 12,
    position: 'relative',
    backgroundColor: '#000',
  },
  modernPickerBtnH: {
    width: 140,
    height: 140,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginRight: 12,
  },
  pickerTextContainer: {
    alignItems: 'center',
  },
  pickerSubTextH: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
});