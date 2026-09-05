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
const styles = StyleSheet.create({
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